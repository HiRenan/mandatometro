"""Consultas agregadas do painel, sem devolver dados de uma pessoa ou sessão."""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import Connection, Date, Engine, case, cast, func, or_, select, union_all

from mandatometro.api.contas import VALIDADE_SESSAO
from mandatometro.api.esquemas_numeros import (
    ContasPainel,
    InscritosPainel,
    NewsletterPainel,
    NumerosPainel,
    PessoasPainel,
    PilotoPainel,
    SistemaPainel,
    TotalDiario,
    TotalPagina,
    TotalSemanal,
    TotalTrilha,
    UltimasColetas,
    UsoPainel,
    VisitasPainel,
)
from mandatometro.avisos.consulta import publicadas
from mandatometro.db.modelos import (
    ArtigoLido,
    Ato,
    BemDeclarado,
    Conta,
    CredencialConta,
    Edicao,
    Fonte,
    Inscrito,
    IpcaMensal,
    Mandato,
    Parlamentar,
    Proposicao,
    ProposicaoTema,
    VideoSessao,
    Visita,
    Votacao,
    Voto,
)
from mandatometro.paginas_publicas import ARTIGOS_POR_TRILHA, IDS_DE_ARTIGO
from mandatometro.piloto import VERSAO_QUIZ, relatorio

_FUSO = ZoneInfo("America/Sao_Paulo")
_DOMINIOS_DAS_FONTES = {
    "camara": "camara.leg.br",
    "senado": "senado.leg.br",
    "diario_oficial": "in.gov.br",
    "tse": "tse.jus.br",
    "banco_central": "bcb.gov.br",
}
_TABELAS_COM_TOTAIS = {
    "parlamentares": Parlamentar,
    "mandatos": Mandato,
    "proposicoes": Proposicao,
    "votacoes": Votacao,
    "votos": Voto,
    "atos": Ato,
    "bens": BemDeclarado,
    "meses_ipca": IpcaMensal,
}


def _semana_em_brasilia(instante):
    return cast(func.date_trunc("week", func.timezone(_FUSO.key, instante)), Date)


def _preencher_semanas(contagens: dict[date, int], atual: date) -> list[TotalSemanal]:
    if not contagens:
        return []
    primeira = min(contagens)
    datas = (primeira + timedelta(weeks=i) for i in range((atual - primeira).days // 7 + 1))
    return [TotalSemanal(semana=inicio, total=contagens.get(inicio, 0)) for inicio in datas]


def _novos_por_semana(conexao, coluna, agora, semana_atual):
    semana = _semana_em_brasilia(coluna)
    contagens = conexao.execute(
        select(semana, func.count()).where(coluna <= agora).group_by(semana)
    )
    return _preencher_semanas(dict(contagens.all()), semana_atual)


def _pessoas(conexao: Connection, agora: datetime, semana_atual: date) -> PessoasPainel:
    total, confirmadas = conexao.execute(
        select(func.count(), func.count(Conta.confirmada_em)).select_from(Conta)
    ).one()
    inscritos = conexao.execute(select(func.count()).select_from(Inscrito)).scalar_one()
    return PessoasPainel(
        contas=ContasPainel(
            total=total,
            confirmadas=confirmadas,
            novas_por_semana=_novos_por_semana(conexao, Conta.criada_em, agora, semana_atual),
        ),
        inscritos=InscritosPainel(
            total=inscritos,
            novos_por_semana=_novos_por_semana(conexao, Inscrito.inscrito_em, agora, semana_atual),
        ),
    )


def _leituras(conexao: Connection) -> dict[str, tuple[int, int]]:
    trilha = func.split_part(ArtigoLido.artigo_id, "/", 1)
    por_conta = (
        select(trilha.label("trilha"), func.count().label("lidos"))
        .where(ArtigoLido.artigo_id.in_(sorted(IDS_DE_ARTIGO)))
        .group_by(ArtigoLido.conta_id, trilha)
        .subquery()
    )
    exigidos = case(
        {trilha: len(artigos) for trilha, artigos in ARTIGOS_POR_TRILHA.items()},
        value=por_conta.c.trilha,
    )
    consulta = select(
        por_conta.c.trilha,
        func.sum(por_conta.c.lidos),
        func.count().filter(por_conta.c.lidos == exigidos),
    ).group_by(por_conta.c.trilha)
    return {
        trilha: (int(lidos), concluidas) for trilha, lidos, concluidas in conexao.execute(consulta)
    }


def _uso(conexao: Connection, agora: datetime, semana_atual: date) -> UsoPainel:
    # expira vem do login; validade que passa para a semana seguinte não é atividade nova.
    eventos = union_all(
        select(
            CredencialConta.conta_id,
            (CredencialConta.expira - VALIDADE_SESSAO).label("instante"),
        ).where(CredencialConta.finalidade == "sessao"),
        select(ArtigoLido.conta_id, ArtigoLido.marcado_em),
    ).subquery()
    atividade = (
        select(
            eventos.c.conta_id,
            _semana_em_brasilia(eventos.c.instante).label("semana"),
            _semana_em_brasilia(Conta.criada_em).label("cadastro"),
        )
        .join(Conta, Conta.id == eventos.c.conta_id)
        .where(eventos.c.instante.between(Conta.criada_em, agora))
        .distinct()
        .subquery()
    )
    por_semana = conexao.execute(
        select(atividade.c.semana, func.count()).group_by(atividade.c.semana)
    )
    retornaram = conexao.execute(
        select(func.count(func.distinct(atividade.c.conta_id))).where(
            atividade.c.semana > atividade.c.cadastro
        )
    ).scalar_one()
    leituras = _leituras(conexao)
    return UsoPainel(
        artigos_lidos_por_trilha=[
            TotalTrilha(trilha=trilha, total=leituras.get(trilha, (0, 0))[0])
            for trilha in ARTIGOS_POR_TRILHA
        ],
        trilhas_concluidas=[
            TotalTrilha(trilha=trilha, total=leituras.get(trilha, (0, 0))[1])
            for trilha in ARTIGOS_POR_TRILHA
        ],
        contas_ativas_por_semana=_preencher_semanas(dict(por_semana.all()), semana_atual),
        contas_que_voltaram=retornaram,
    )


def _visitas(conexao: Connection, hoje: date) -> VisitasPainel:
    primeiro = hoje - timedelta(days=29)
    periodo = Visita.dia.between(primeiro, hoje)
    total = func.sum(Visita.quantidade)
    contagens = dict(
        conexao.execute(select(Visita.dia, total).where(periodo).group_by(Visita.dia)).all()
    )
    paginas = conexao.execute(
        select(Visita.caminho, total)
        .where(periodo)
        .group_by(Visita.caminho)
        .order_by(total.desc(), Visita.caminho.collate("C"))
        .limit(10)
    )
    datas = (primeiro + timedelta(days=i) for i in range(30))
    return VisitasPainel(
        por_dia=[TotalDiario(dia=dia, total=contagens.get(dia, 0)) for dia in datas],
        paginas_mais_vistas=[TotalPagina(caminho=caminho, total=n) for caminho, n in paginas],
    )


def _newsletter(conexao: Connection) -> NewsletterPainel:
    ultima = conexao.execute(
        publicadas()
        .with_only_columns(Edicao.id, Edicao.publicada_em, func.count().over())
        .order_by(Edicao.publicada_em.desc(), Edicao.id.desc())
        .limit(1)
    ).one_or_none()
    if ultima is None:
        return NewsletterPainel(
            edicoes_publicadas=0, inscritos_com_a_ultima_edicao=None, ultima_publicada_em=None
        )
    id_, publicada_em, total = ultima
    envios = conexao.execute(
        select(func.count()).where(Inscrito.ultima_edicao_enviada_id == id_)
    ).scalar_one()
    return NewsletterPainel(
        edicoes_publicadas=total,
        inscritos_com_a_ultima_edicao=envios,
        ultima_publicada_em=publicada_em,
    )


def _sistema(conexao: Connection) -> SistemaPainel:
    contagens = (
        conexao.execute(
            select(
                *(
                    select(func.count()).select_from(modelo).scalar_subquery().label(rotulo)
                    for rotulo, modelo in _TABELAS_COM_TOTAIS.items()
                ),
                select(func.count(func.distinct(ProposicaoTema.proposicao_id)))
                .scalar_subquery()
                .label("proposicoes_com_tema"),
                select(func.count())
                .where(VideoSessao.url_video.is_not(None))
                .scalar_subquery()
                .label("videos"),
            )
        )
        .mappings()
        .one()
    )
    # Interessa só o domínio de coleta, sem o trecho ou o endereço na resposta.
    dominio = func.substring(
        func.lower(Fonte.url), r"^https?://([a-z0-9.-]+)(?::[0-9]+)?(?:[/?#]|$)"
    )
    coletas = (
        conexao.execute(
            select(
                *(
                    func.max(Fonte.coletado_em)
                    .filter(or_(dominio == raiz, dominio.like(f"%.{raiz}")))
                    .label(nome)
                    for nome, raiz in _DOMINIOS_DAS_FONTES.items()
                )
            )
        )
        .mappings()
        .one()
    )
    return SistemaPainel(**contagens, ultimas_coletas=UltimasColetas(**coletas))


def numeros_do_painel(banco: Engine) -> NumerosPainel:
    # Usa a mesma fotografia do banco, inclusive para pares, contagens e datas de publicação.
    with banco.connect().execution_options(isolation_level="REPEATABLE READ") as conexao:
        agora = conexao.execute(select(func.clock_timestamp())).scalar_one()
        hoje = agora.astimezone(_FUSO).date()
        semana_atual = hoje - timedelta(days=hoje.weekday())
        return NumerosPainel(
            pessoas=_pessoas(conexao, agora, semana_atual),
            uso=_uso(conexao, agora, semana_atual),
            visitas=_visitas(conexao, hoje),
            newsletter=_newsletter(conexao),
            piloto=PilotoPainel.model_validate(
                relatorio.resultado_na_conexao(conexao, VERSAO_QUIZ)
            ),
            sistema=_sistema(conexao),
        )
