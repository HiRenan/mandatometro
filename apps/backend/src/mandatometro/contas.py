"""Credenciais de conta e entrega transacional dos avisos pelo Resend."""

import asyncio
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta
from html import escape
from uuid import uuid4

from argon2 import PasswordHasher
from cryptography.fernet import Fernet
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert

from mandatometro.avisos.email import Mensagem
from mandatometro.avisos.resend import EnvioIndisponivel, Resend
from mandatometro.config import config
from mandatometro.db import sessao
from mandatometro.db.modelos import AvisoConta, CredencialConta, LimiteConta

senhas = PasswordHasher()
ASSUNTOS = {
    "confirmacao": "Confirme seu e-mail no Mandatômetro",
    "recuperacao": "Redefina sua senha do Mandatômetro",
    "exclusao": "Comprovante de exclusão da conta no Mandatômetro",
}


def agora():
    return datetime.now(UTC)


def resumo(segredo):
    return hashlib.sha256(segredo.encode()).hexdigest()


def chave():
    segredo = config().conta_chave
    if not segredo:
        raise RuntimeError("Configure CONTA_CHAVE.")
    return segredo.get_secret_value().encode()


def consumir_cota(valor, grupo, maximo):
    minuto = int(agora().timestamp() // 60)
    identificador = hmac.digest(chave(), f"{grupo}:{valor}".encode(), "sha256").hex()
    with sessao() as db, db.begin():
        db.execute(delete(LimiteConta).where(LimiteConta.minuto < minuto))
        inserir = insert(LimiteConta).values(chave=identificador, minuto=minuto, tentativas=1)
        contador = db.scalar(
            inserir.on_conflict_do_update(
                index_elements=[LimiteConta.chave],
                set_={"tentativas": LimiteConta.tentativas + 1},
            ).returning(LimiteConta.tentativas)
        )
    return contador <= maximo


def agendar(db, conta, finalidade):
    instante = agora()
    prazo = timedelta(minutes=30) if finalidade == "recuperacao" else timedelta(hours=24)
    conta_id = conta.id
    url = None
    if finalidade == "exclusao":
        conta_id = None
        texto = f"Sua conta no Mandatômetro foi excluída em {instante:%d/%m/%Y às %H:%M UTC}."
    else:
        token = secrets.token_urlsafe(32)
        db.add(
            CredencialConta(
                resumo=resumo(token),
                finalidade=finalidade,
                conta_id=conta.id,
                expira=instante + prazo,
            )
        )
        pagina = "confirmar" if finalidade == "confirmacao" else "redefinir"
        url = f"{config().app_base_url.rstrip('/')}/cadastro/{pagina}#{token}"
        texto = f"Se você solicitou esta operação, acesse {url}"
    dados = json.dumps([conta.email, ASSUNTOS[finalidade], texto, url]).encode()
    db.add(
        AvisoConta(
            id=uuid4(),
            conta_id=conta_id,
            conteudo=Fernet(chave()).encrypt(dados),
            proxima=instante,
            expira=instante + prazo,
        )
    )


def entregar_pendentes():
    cfg = config()
    with sessao() as db, db.begin():
        db.execute(delete(CredencialConta).where(CredencialConta.expira <= agora()))
        db.execute(delete(LimiteConta).where(LimiteConta.minuto < int(agora().timestamp() // 60)))
    envio = Resend(
        cfg.resend_api_key.get_secret_value() if cfg.resend_api_key else None, cfg.resend_from
    )
    for _ in range(20):
        with sessao() as db, db.begin():
            aviso = db.scalar(
                select(AvisoConta)
                .where(AvisoConta.proxima <= agora())
                .order_by(AvisoConta.proxima)
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            if aviso is None:
                return
            if aviso.expira > agora():
                email, assunto, texto, url = json.loads(Fernet(chave()).decrypt(aviso.conteudo))
                html = f"<p>{escape(texto)}</p>"
                if url:
                    html = (
                        "<p>Se você solicitou esta operação, use o link abaixo.</p>"
                        f'<a href="{escape(url)}">{escape(assunto)}</a>'
                    )
                mensagem = Mensagem(assunto, html, texto, {})
                try:
                    asyncio.run(envio.enviar(email, mensagem, f"conta-{aviso.id}"))
                except EnvioIndisponivel:
                    aviso.proxima = min(aviso.expira, agora() + timedelta(minutes=5))
                    continue
            db.delete(aviso)


if __name__ == "__main__":
    entregar_pendentes()
