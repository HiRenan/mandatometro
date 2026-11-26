import json
import secrets
from collections.abc import AsyncIterator, Iterator
from contextlib import contextmanager
from datetime import date, timedelta
from typing import Annotated, Literal
from uuid import uuid4

from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, BackgroundTasks, Cookie, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from psycopg.errors import LockNotAvailable
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from sqlalchemy import delete, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException as StarletteHTTPException

from mandatometro.config import config
from mandatometro.contas import agendar, agora, consumir_cota, entregar_pendentes, resumo, senhas
from mandatometro.db import sessao
from mandatometro.db.modelos import (
    PADRAO_ID_ARTIGO,
    TAMANHO_ID_ARTIGO,
    ArtigoLido,
    Conta,
    CredencialConta,
    PapelConta,
)

ESTADOS = set(
    [
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RS",
        "RO",
        "RR",
        "SC",
        "SP",
        "SE",
        "TO",
        "EX",
    ]
)
FORMATO_INVALIDO = "Confira os campos informados."


class RotaConta(APIRoute):
    def get_route_handler(self):
        tratar = super().get_route_handler()

        async def privado(request: Request):
            try:
                if request.method != "GET":
                    if not config().conta_chave:
                        raise HTTPException(503, "Serviço indisponível.")
                    origem = request.client.host if request.client else "desconhecida"
                    if not await run_in_threadpool(consumir_cota, origem, "origem", 30):
                        raise HTTPException(429, "Tente novamente em um minuto.")
                resposta = await tratar(request)
            except RequestValidationError:
                resposta = JSONResponse({"detail": FORMATO_INVALIDO}, 422)
            except HTTPException as erro:
                resposta = JSONResponse(
                    {"detail": erro.detail}, erro.status_code, headers=erro.headers
                )
            except SQLAlchemyError:
                resposta = JSONResponse({"detail": "Serviço indisponível."}, 503)
            resposta.headers["Cache-Control"] = "no-store"
            return resposta

        return privado


class ErroConta(BaseModel):
    detail: str


router = APIRouter(
    prefix="/contas",
    tags=["contas"],
    route_class=RotaConta,
    responses={codigo: {"model": ErroConta} for codigo in (401, 403, 409, 422, 429, 503)},
)


class Termo(BaseModel):
    versao: str
    url: str


@router.get("/termo")
def termo_conta() -> Termo:
    cfg = config()
    if not (cfg.conta_termo_versao and cfg.conta_termo_url and cfg.conta_chave):
        raise HTTPException(503, "Cadastro ainda indisponível.")
    return Termo(versao=cfg.conta_termo_versao, url=cfg.conta_termo_url)


class Endereco(BaseModel):
    email: EmailStr


class SenhaNova(BaseModel):
    senha: Annotated[str, Field(min_length=12, max_length=128)]
    confirmar_senha: Annotated[str, Field(max_length=128)]

    @model_validator(mode="after")
    def coincide(self):
        if self.senha != self.confirmar_senha:
            raise ValueError("As senhas devem coincidir.")
        return self


class Cadastro(Endereco, SenhaNova):
    nome: Annotated[str, Field(min_length=1, max_length=160)]
    genero: (
        Literal["mulher", "homem", "nao_binario", "autodescricao", "prefiro_nao_informar"] | None
    ) = None
    autodescricao: Annotated[str, Field(max_length=100)] | None = None
    estado: str | None = None
    nascimento: date | None = None
    aceite: Literal[True]
    termo: Annotated[str, Field(max_length=100)]

    @model_validator(mode="after")
    def perfil(self):
        if not self.nome.strip() or (self.estado is not None and self.estado not in ESTADOS):
            raise ValueError("Perfil inválido.")
        if self.nascimento and self.nascimento > date.today():
            raise ValueError("Data futura.")
        if self.autodescricao and self.genero != "autodescricao":
            raise ValueError("Gênero inválido.")
        return self


class Codigo(BaseModel):
    token: Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{43}$")]


class Redefinicao(Codigo, SenhaNova):
    pass


class Exclusao(BaseModel):
    senha: Annotated[str, Field(min_length=1, max_length=128)]


class Login(Endereco, Exclusao):
    pass


VALIDADE_SESSAO = timedelta(days=7)
# Mantém o custo de verificação da senha também para endereços desconhecidos.
HASH_SEM_CONTA = senhas.hash(secrets.token_urlsafe(32))


def validar_origem(request: Request) -> None:
    if request.headers.get("origin") != config().app_base_url.rstrip("/"):
        raise HTTPException(403, "Origem inválida.")


@router.post("/login", status_code=204)
def entrar_conta(pedido: Login, request: Request, response: Response) -> None:
    validar_origem(request)
    email = pedido.email.casefold()
    limitar(email)
    with sessao() as db, db.begin():
        conta = db.scalar(select(Conta).where(Conta.email == email).with_for_update())
        erro = "Confira o e-mail, a senha e a confirmação do cadastro."
        try:
            senhas.verify(conta.senha_hash if conta else HASH_SEM_CONTA, pedido.senha)
        except VerifyMismatchError:
            raise HTTPException(401, erro) from None
        if not conta or not conta.confirmada_em:
            raise HTTPException(401, erro)
        token = secrets.token_urlsafe(32)
        db.add(
            CredencialConta(
                resumo=resumo(token),
                conta_id=conta.id,
                finalidade="sessao",
                expira=agora() + VALIDADE_SESSAO,
            )
        )
    response.set_cookie(
        "sessao_conta",
        token,
        max_age=int(VALIDADE_SESSAO.total_seconds()),
        httponly=True,
        secure=config().api_url.startswith("https://"),
        samesite="lax",
        path="/",
    )


@router.post("/logout", status_code=204)
def sair_conta(
    request: Request, response: Response, sessao_conta: Annotated[str | None, Cookie()] = None
) -> None:
    validar_origem(request)
    if sessao_conta:
        with sessao() as db, db.begin():
            db.execute(
                delete(CredencialConta).where(
                    CredencialConta.resumo == resumo(sessao_conta),
                    CredencialConta.finalidade == "sessao",
                )
            )
    response.delete_cookie(
        "sessao_conta",
        path="/",
        httponly=True,
        secure=config().api_url.startswith("https://"),
        samesite="lax",
    )


def limitar(email):
    if not consumir_cota(email, "endereco", 5):
        raise HTTPException(429, "Tente novamente em um minuto.")


@router.post("", status_code=204)
def cadastrar_conta(pedido: Cadastro, tarefas: BackgroundTasks) -> None:
    if pedido.termo != termo_conta().versao:
        raise HTTPException(409, "Leia a versão atual do termo.")
    email = pedido.email.casefold()
    limitar(email)
    instante = agora()
    dados = pedido.model_dump(include={"genero", "autodescricao", "estado", "nascimento", "termo"})
    inserir = insert(Conta).values(
        **dados,
        id=uuid4(),
        nome=pedido.nome.strip(),
        email=email,
        senha_hash=senhas.hash(pedido.senha),
        criada_em=instante,
        aceite_em=instante,
    )
    with sessao() as db, db.begin():
        conta = db.scalar(
            inserir.on_conflict_do_nothing(index_elements=[Conta.email]).returning(Conta)
        )
        if conta:
            agendar(db, conta, "confirmacao")
    tarefas.add_task(entregar_pendentes)


def solicitar(pedido, tarefas, finalidade):
    email = pedido.email.casefold()
    limitar(email)
    with sessao() as db, db.begin():
        conta = db.scalar(select(Conta).where(Conta.email == email).with_for_update())
        if conta and bool(conta.confirmada_em) == (finalidade == "recuperacao"):
            agendar(db, conta, finalidade)
    tarefas.add_task(entregar_pendentes)


@router.post("/reenvio", status_code=204)
def reenviar_confirmacao(pedido: Endereco, tarefas: BackgroundTasks) -> None:
    solicitar(pedido, tarefas, "confirmacao")


@router.post("/recuperacao", status_code=204)
def recuperar_conta(pedido: Endereco, tarefas: BackgroundTasks) -> None:
    solicitar(pedido, tarefas, "recuperacao")


def identificar(db: Session, segredo: str, finalidade: str) -> Conta:
    digest = resumo(segredo)
    criterio = (
        CredencialConta.resumo == digest,
        CredencialConta.finalidade == finalidade,
        CredencialConta.expira > agora(),
    )
    conta = db.scalar(
        select(Conta)
        .where(Conta.id == select(CredencialConta.conta_id).where(*criterio).scalar_subquery())
        .with_for_update()
    )
    # Revalida depois do lock: outro pedido pode ter consumido o código enquanto esperávamos.
    if not conta or not db.scalar(select(CredencialConta.resumo).where(*criterio)):
        raise HTTPException(401, "Código ou sessão inválida.")
    return conta


def conta_da_sessao(db: Session, sessao_conta: str | None) -> Conta:
    if not sessao_conta:
        raise HTTPException(401, "Entre na sua conta.")
    return identificar(db, sessao_conta, "sessao")


class AcessoAdministrativoRecusado(StarletteHTTPException):
    def __init__(self, codigo: Literal[401, 403]) -> None:
        # A resposta padrão do painel é a mesma de uma rota inexistente.
        super().__init__(404)
        self.codigo = codigo


def exigir_administradora(sessao_conta: Annotated[str | None, Cookie()] = None) -> Conta:
    if not sessao_conta:
        raise AcessoAdministrativoRecusado(401)
    with sessao() as db:
        try:
            conta = conta_da_sessao(db, sessao_conta)
        except HTTPException as erro:
            if erro.status_code != 401:
                raise
            raise AcessoAdministrativoRecusado(401) from None
        if conta.papel != "administradora":
            raise AcessoAdministrativoRecusado(403)
        return conta


@router.post("/confirmacao", status_code=204)
def confirmar_conta(pedido: Codigo) -> None:
    with sessao() as db, db.begin():
        conta = identificar(db, pedido.token, "confirmacao")
        conta.confirmada_em = agora()
        db.execute(
            delete(CredencialConta).where(
                CredencialConta.conta_id == conta.id, CredencialConta.finalidade == "confirmacao"
            )
        )


@router.post("/redefinicao", status_code=204)
def redefinir_senha(pedido: Redefinicao) -> None:
    with sessao() as db, db.begin():
        conta = identificar(db, pedido.token, "recuperacao")
        conta.senha_hash = senhas.hash(pedido.senha)
        db.execute(delete(CredencialConta).where(CredencialConta.conta_id == conta.id))


class PerfilConta(BaseModel):
    nome: str
    papel: PapelConta


@router.get("/me")
def consultar_perfil(sessao_conta: Annotated[str | None, Cookie()] = None) -> PerfilConta:
    if not sessao_conta:
        raise HTTPException(401, "Entre na sua conta.")
    with sessao() as db:
        conta = conta_da_sessao(db, sessao_conta)
        return PerfilConta(nome=conta.nome, papel=conta.papel)


MAX_IDS_POR_PEDIDO = 256
MAX_ARTIGOS_LIDOS = 256
LIMITE_CORPO_PROGRESSO = 64 * 1024
IdArtigo = Annotated[str, Field(max_length=TAMANHO_ID_ARTIGO, pattern=PADRAO_ID_ARTIGO)]
LoteDeArtigos = Annotated[list[IdArtigo], Field(max_length=MAX_IDS_POR_PEDIDO)]


class PedidoProgressoLimitado(Request):
    async def stream(self) -> AsyncIterator[bytes]:
        erro = HTTPException(413, "O pedido de progresso excede 64 KiB.")
        try:
            declarado = int(self.headers.get("content-length", "0"))
        except ValueError:
            declarado = 0
        if declarado > LIMITE_CORPO_PROGRESSO:
            raise erro

        recebido = 0
        async for parte in super().stream():
            recebido += len(parte)
            if recebido > LIMITE_CORPO_PROGRESSO:
                raise erro
            yield parte

    async def json(self):
        try:
            return json.loads((await self.body()).decode("utf-8"))
        except (ValueError, RecursionError):
            raise HTTPException(422, FORMATO_INVALIDO) from None


class RotaProgresso(RotaConta):
    def get_route_handler(self):
        tratar = super().get_route_handler()

        async def progresso(request: Request) -> Response:
            if request.method == "POST":
                request = PedidoProgressoLimitado(request.scope, request.receive)
            return await tratar(request)

        return progresso


router_progresso = APIRouter(
    route_class=RotaProgresso,
    responses={
        503: {
            "model": ErroConta,
            "headers": {
                "Retry-After": {
                    "description": "Segundos de espera quando a trava da conta está ocupada.",
                    "schema": {"type": "integer"},
                },
            },
        },
    },
)


class PedidoProgresso(BaseModel):
    model_config = ConfigDict(extra="forbid")

    marcar: LoteDeArtigos = Field(default_factory=list)
    desmarcar: LoteDeArtigos = Field(default_factory=list)

    @model_validator(mode="after")
    def validar_lote(self):
        if len(self.marcar) + len(self.desmarcar) > MAX_IDS_POR_PEDIDO or not set(
            self.marcar
        ).isdisjoint(self.desmarcar):
            raise ValueError("Lote de progresso inválido.")
        return self


class ProgressoConta(BaseModel):
    lidos: list[IdArtigo]


def _ids_lidos(db: Session, conta: Conta) -> set[str]:
    return set(db.scalars(select(ArtigoLido.artigo_id).where(ArtigoLido.conta_id == conta.id)))


@contextmanager
def _sessao_do_progresso() -> Iterator[Session]:
    try:
        with sessao() as db, db.begin():
            db.execute(text("SET LOCAL lock_timeout = '3s'"))
            yield db
    except OperationalError as erro:
        if isinstance(erro.orig, LockNotAvailable):
            raise HTTPException(
                503, "O progresso está ocupado. Tente novamente.", headers={"Retry-After": "3"}
            ) from None
        raise


@router_progresso.get("/progresso")
def consultar_progresso_conta(
    sessao_conta: Annotated[str | None, Cookie()] = None,
) -> ProgressoConta:
    if not sessao_conta:
        raise HTTPException(401, "Entre na sua conta.")
    with _sessao_do_progresso() as db:
        conta = conta_da_sessao(db, sessao_conta)
        return ProgressoConta(lidos=sorted(_ids_lidos(db, conta)))


@router_progresso.post("/progresso", responses={413: {"model": ErroConta}})
def alterar_progresso_conta(
    pedido: PedidoProgresso, request: Request, sessao_conta: Annotated[str | None, Cookie()] = None
) -> ProgressoConta:
    validar_origem(request)
    if not sessao_conta:
        raise HTTPException(401, "Entre na sua conta.")
    with _sessao_do_progresso() as db:
        # O lock da conta serializa alterações e a exclusão, inclusive a checagem do teto.
        conta = conta_da_sessao(db, sessao_conta)
        lidos = _ids_lidos(db, conta)
        marcar = set(pedido.marcar) - lidos
        desmarcar = lidos.intersection(pedido.desmarcar)
        resultado = (lidos - desmarcar) | marcar
        if len(resultado) > MAX_ARTIGOS_LIDOS:
            raise HTTPException(409, "Limite de artigos lidos atingido.")
        if desmarcar:
            db.execute(
                delete(ArtigoLido).where(
                    ArtigoLido.conta_id == conta.id, ArtigoLido.artigo_id.in_(desmarcar)
                )
            )
        db.add_all([ArtigoLido(conta_id=conta.id, artigo_id=id) for id in marcar])
    return ProgressoConta(lidos=sorted(resultado))


router.include_router(router_progresso)


@router.delete("/me", status_code=204)
def excluir_conta(
    pedido: Exclusao,
    request: Request,
    response: Response,
    tarefas: BackgroundTasks,
    sessao_conta: Annotated[str | None, Cookie()] = None,
) -> None:
    validar_origem(request)
    with sessao() as db, db.begin():
        conta = conta_da_sessao(db, sessao_conta)
        limitar(str(conta.id))
        try:
            senhas.verify(conta.senha_hash, pedido.senha)
        except VerifyMismatchError:
            raise HTTPException(401, "Confira sua senha.") from None
        agendar(db, conta, "exclusao")
        db.delete(conta)
    response.delete_cookie("sessao_conta", path="/")
    tarefas.add_task(entregar_pendentes)
