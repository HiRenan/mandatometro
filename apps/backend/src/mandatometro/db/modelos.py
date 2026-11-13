"""O modelo de dados do MVP: o que a coleta grava e o que a newsletter usa.

- A coleta da Câmara (#10) e do Senado (#11) grava parlamentar, mandato, proposição, votação e
  voto. Os campos de cada API estão em docs/dicionario-de-dados.md.
- A newsletter: a edição da semana, com os itens, que a IA rascunha e o time revisa (#22), e
  quem assina, que se inscreve pela #21 e recebe as edições pelo envio da #39.
- Fonte em tudo (AGENTS.md): cada dado coletado e cada item da edição aponta para uma fonte, com
  o endereço e a data da coleta. Sem fonte, o banco não grava.
- Cada Casa tem os seus números: a chave de parlamentar, proposição e votação é a Casa com o id da
  Casa (casa, id_externo).
- Os valores fixos são texto com CHECK, sem enum do PostgreSQL: um valor novo entra trocando o
  CHECK numa migration.
- O diagrama está no README, em "Modelo de dados".
"""

import logging
from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    String,
    Table,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from mandatometro.db import Base

logger = logging.getLogger(__name__)

CASAS = ("camara", "senado")

# --- O voto e o resultado: o valor num conjunto nosso e, se pode, o código da Casa ---

# presidente: quem presidiu a sessão e não vota. nao_votou: presente sem voto, ausente em atividade
# parlamentar ou de licença. outro: um código que ainda não está em nenhuma das listas abaixo.
VALORES_DE_VOTO = ("sim", "nao", "abstencao", "obstrucao", "presidente", "nao_votou", "outro")

# Os códigos que o banco guarda como a Casa publica: votos e presença, nenhum motivo pessoal. O
# CHECK do voto só aceita estes. Código novo entra aqui depois de conferido, com a migration.
CODIGOS_GRAVADOS = {
    "Sim": "sim",
    "Não": "nao",
    "Abstenção": "abstencao",
    "Obstrução": "obstrucao",  # da Câmara; ainda não apareceu nas respostas gravadas
    "Artigo 17": "presidente",  # Câmara: art. 17 do Regimento Interno
    "Presidente (art. 51 RISF)": "presidente",
    "P-NRV": "nao_votou",  # "Presente – Não registrou voto": estava lá e não votou
}
# As ausências do Senado: entram como nao_votou, sem o código, todas iguais. O banco não guarda o
# motivo, para a licença saúde não sair de consulta nenhuma (decisões do Renan na #7, em
# 12/11/2026: o LS só como "não votou" e, depois, nenhuma ausência com o código).
CODIGOS_DE_AUSENCIA = {
    "AP",  # "Atividade parlamentar"
    "LS",  # "Licença saúde"
}

RESULTADOS = ("aprovada", "rejeitada", "outro")
# Câmara: aprovacao 1 ou 0. Senado: resultadoVotacao "A" nas 7 votações que a revisão do PR #79
# viu; nas 4 gravadas em tests/fixtures, o informeLegislativo da sessão diz que cada uma foi
# aprovada. As outras letras ainda não apareceram e viram "outro".
_RESULTADOS_CONHECIDOS = {"1": "aprovada", "0": "rejeitada", "A": "aprovada"}


def normalizar_voto(bruto: str) -> tuple[str, str | None]:
    """O (valor, valor_bruto) a gravar para o código de voto que a Casa publicou.

    Só os códigos de CODIGOS_GRAVADOS ficam gravados. Uma ausência vira nao_votou, sem o código.
    Um código desconhecido vira "outro", também sem o código, porque pode ser outro motivo pessoal,
    e vai para o log sozinho, sem a pessoa: quem conferir o significado o põe numa das listas, e
    uma nova coleta da votação corrige o voto. O conector não acrescenta a pessoa a esse aviso.
    """
    codigo = bruto.strip()
    if codigo in CODIGOS_GRAVADOS:
        return CODIGOS_GRAVADOS[codigo], codigo
    if codigo in CODIGOS_DE_AUSENCIA:
        return "nao_votou", None
    logger.warning("Código de voto desconhecido: %r. Entra como outro, sem o código.", codigo)
    return "outro", None


def normalizar_resultado(bruto: str | int | None) -> tuple[str, str | None]:
    """O (resultado, resultado_bruto) a gravar para o resultado que a Casa publicou."""
    if bruto is None:
        return "outro", None
    codigo = str(bruto).strip()
    return _RESULTADOS_CONHECIDOS.get(codigo, "outro"), codigo


def _um_de(coluna: str, valores: tuple[str, ...]) -> str:
    """A condição de um CHECK: a coluna só aceita os valores da lista."""
    return f"{coluna} in ({', '.join(repr(valor) for valor in valores)})"


# --- A fonte ---


class Fonte(Base):
    """De onde veio um dado: o endereço coletado, a página que o leitor abre, a data e o trecho.

    - url: o que a coleta leu (a API, ou a página e o PDF lidos pelo Firecrawl).
    - url_publica: a página da Câmara ou do Senado que o leitor abre, quando houver. É a que a
      newsletter mostra.
    - trecho: o trecho literal, quando a afirmação vier de texto.

    Registros da mesma resposta dividem a fonte: os votos de uma votação apontam todos para a fonte
    da lista de votos.
    """

    __tablename__ = "fonte"

    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str]
    url_publica: Mapped[str | None]
    coletado_em: Mapped[datetime] = mapped_column(server_default=func.now())
    trecho: Mapped[str | None]


# --- O Congresso: o que a coleta grava ---


class Parlamentar(Base):
    """Um deputado ou senador, pela Casa e pelo id que a Casa dá a ele.

    Os ids das duas Casas são números independentes. No Senado, o mesmo código vem como texto na
    lista ("5672") e como número no /votacao (5672): o conector converte para inteiro, e os dois
    acham a mesma linha. Quem foi deputado e virou senador tem uma linha em cada Casa.
    """

    __tablename__ = "parlamentar"
    __table_args__ = (
        UniqueConstraint("casa", "id_externo"),
        CheckConstraint(_um_de("casa", CASAS), name="casa"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    casa: Mapped[str]
    id_externo: Mapped[int]
    nome: Mapped[str]
    fonte_id: Mapped[int] = mapped_column(ForeignKey("fonte.id"))

    fonte: Mapped[Fonte] = relationship()


class Mandato(Base):
    """O cargo do parlamentar numa legislatura: a UF, a condição e se está em exercício.

    - legislatura: na Câmara, o idLegislatura; no Senado, a primeira legislatura do mandato, que
      cobre duas.
    - condicao: como a Casa escreve ("Titular", "Suplente", "1º Suplente").
    - em_exercicio: se estava em exercício na última coleta da lista de deputados ou de senadores.

    O partido não fica aqui, porque muda dentro do mandato: vai no voto. O motivo de afastamento do
    senador também não entra, porque traz a "Licença saúde".
    """

    __tablename__ = "mandato"
    __table_args__ = (UniqueConstraint("parlamentar_id", "legislatura"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    parlamentar_id: Mapped[int] = mapped_column(ForeignKey("parlamentar.id", ondelete="CASCADE"))
    legislatura: Mapped[int]
    uf: Mapped[str] = mapped_column(String(2))
    condicao: Mapped[str | None]
    em_exercicio: Mapped[bool]
    fonte_id: Mapped[int] = mapped_column(ForeignKey("fonte.id"))

    parlamentar: Mapped[Parlamentar] = relationship()
    fonte: Mapped[Fonte] = relationship()


class Proposicao(Base):
    """Um projeto numa Casa: PL, PEC, requerimento...

    A mesma matéria tem id e ementa diferentes em cada Casa (a PEC 18/2025 é 2500080 na Câmara e
    9006525 no Senado): uma linha por Casa, ligadas por sigla, número e ano. O número é inteiro,
    então "00018" e "18" viram 18. A ligação vale para a numeração única das duas Casas, de 2019 em
    diante.

    - id_externo: o id da Câmara; no Senado, o idProcesso (e não o codigoMateria).
    - ementa: no Senado, a do conteudo.ementa ou a do /votacao, nunca a do processo, que não vem.
    - url_inteiro_teor: o urlInteiroTeor da Câmara ou o documento.url do Senado.
    """

    __tablename__ = "proposicao"
    __table_args__ = (
        UniqueConstraint("casa", "id_externo"),
        Index(None, "sigla", "numero", "ano"),
        CheckConstraint(_um_de("casa", CASAS), name="casa"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    casa: Mapped[str]
    id_externo: Mapped[int]
    sigla: Mapped[str]
    numero: Mapped[int]
    ano: Mapped[int]
    ementa: Mapped[str | None]
    apelido: Mapped[str | None]
    url_inteiro_teor: Mapped[str | None]
    fonte_id: Mapped[int] = mapped_column(ForeignKey("fonte.id"))

    fonte: Mapped[Fonte] = relationship()


# Quais proposições cada votação afetou. Na Câmara, a lista proposicoesAfetadas do
# /votacoes/{id}; no Senado, o idProcesso. Nunca o prefixo do id da votação da Câmara: nas
# urgências e nos recursos, ele é o do requerimento, e não o da matéria.
votacao_proposicao = Table(
    "votacao_proposicao",
    Base.metadata,
    Column("votacao_id", ForeignKey("votacao.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "proposicao_id",
        ForeignKey("proposicao.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    ),
)


class Votacao(Base):
    """Uma votação do plenário.

    - id_externo: texto. Na Câmara, "{id}-{sequencial}" ("2637478-26"); no Senado, o
      codigoSessaoVotacao ("7109"), que sozinho é único.
    - resultado e resultado_bruto: saem de normalizar_resultado.

    Não há colunas de total: no Senado elas vêm null, e na Câmara não existem. O total se conta
    pelos votos. Na Câmara, o /votos só traz quem votou, e só nas votações nominais: quem não
    aparece não vira linha, e a conta "X dos 513 votaram" sai dos votos gravados.
    """

    __tablename__ = "votacao"
    __table_args__ = (
        UniqueConstraint("casa", "id_externo"),
        CheckConstraint(_um_de("casa", CASAS), name="casa"),
        CheckConstraint(_um_de("resultado", RESULTADOS), name="resultado"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    casa: Mapped[str]
    id_externo: Mapped[str]
    data: Mapped[date] = mapped_column(index=True)
    descricao: Mapped[str]
    resultado: Mapped[str]
    resultado_bruto: Mapped[str | None]
    fonte_id: Mapped[int] = mapped_column(ForeignKey("fonte.id"))

    fonte: Mapped[Fonte] = relationship()
    proposicoes: Mapped[list[Proposicao]] = relationship(secondary=votacao_proposicao)
    votos: Mapped[list["Voto"]] = relationship(
        back_populates="votacao", cascade="all, delete-orphan", passive_deletes=True
    )


class Voto(Base):
    """Como um parlamentar votou numa votação.

    - valor e valor_bruto: saem de normalizar_voto. O valor_bruto, o código como a Casa publicou,
      só existe para os códigos de CODIGOS_GRAVADOS, e o CHECK garante. Uma ausência (atividade
      parlamentar, licença saúde...) fica nao_votou sem código, igual a qualquer outra; o P-NRV,
      de quem estava presente e não votou, guarda o código.
    - partido e uf: os do dia do voto. O partido muda dentro do mandato.

    A fonte é a da lista de votos, sem trecho: o motivo da ausência também não vai para a fonte.
    """

    __tablename__ = "voto"
    __table_args__ = (
        CheckConstraint(_um_de("valor", VALORES_DE_VOTO), name="valor"),
        CheckConstraint(_um_de("valor_bruto", tuple(CODIGOS_GRAVADOS)), name="valor_bruto"),
    )

    votacao_id: Mapped[int] = mapped_column(
        ForeignKey("votacao.id", ondelete="CASCADE"), primary_key=True
    )
    parlamentar_id: Mapped[int] = mapped_column(ForeignKey("parlamentar.id"), primary_key=True)
    valor: Mapped[str]
    valor_bruto: Mapped[str | None]
    partido: Mapped[str | None]
    uf: Mapped[str | None] = mapped_column(String(2))
    fonte_id: Mapped[int] = mapped_column(ForeignKey("fonte.id"))

    votacao: Mapped[Votacao] = relationship(back_populates="votos")
    parlamentar: Mapped[Parlamentar] = relationship()
    fonte: Mapped[Fonte] = relationship()


# --- A newsletter: a edição da semana e quem assina ---

ESTADOS_DA_EDICAO = ("rascunho", "publicada")


class Edicao(Base):
    """Uma edição do jornal legislativo: o que o Congresso votou numa semana.

    - inicio e fim: as datas das votações que a edição cobre.
    - estado: nasce rascunho, quando a IA escreve (#22), e vira publicada quando o time revisa.
      Só a edição publicada tem publicada_em, e só ela vai para o site e para o envio (#39).
    """

    __tablename__ = "edicao"
    __table_args__ = (
        CheckConstraint(_um_de("estado", ESTADOS_DA_EDICAO), name="estado"),
        CheckConstraint("(estado = 'publicada') = (publicada_em is not null)", name="publicada_em"),
        CheckConstraint("inicio <= fim", name="periodo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str]
    inicio: Mapped[date]
    fim: Mapped[date]
    estado: Mapped[str] = mapped_column(server_default="rascunho")
    publicada_em: Mapped[datetime | None]

    itens: Mapped[list["ItemEdicao"]] = relationship(
        back_populates="edicao",
        order_by="ItemEdicao.ordem",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ItemEdicao(Base):
    """Uma notícia da edição, na ordem em que aparece, com a fonte obrigatória.

    A fonte é a da afirmação: a newsletter mostra a url_publica dela, quando houver, e a data da
    coleta. Sem fonte, o item não grava (AGENTS.md: o que não tem fonte fica fora da newsletter).
    """

    __tablename__ = "item_edicao"
    __table_args__ = (UniqueConstraint("edicao_id", "ordem"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    edicao_id: Mapped[int] = mapped_column(ForeignKey("edicao.id", ondelete="CASCADE"))
    ordem: Mapped[int]
    titulo: Mapped[str]
    texto: Mapped[str]
    fonte_id: Mapped[int] = mapped_column(ForeignKey("fonte.id"))

    edicao: Mapped[Edicao] = relationship(back_populates="itens")
    fonte: Mapped[Fonte] = relationship()


class Inscrito(Base):
    """Quem assina a newsletter: só o e-mail, a data da inscrição e o código do link de sair.

    - email: único e em minúsculas. A inscrição (#21) converte antes de gravar; o banco recusa
      maiúscula, para "Pessoa@" e "pessoa@" não virarem duas inscrições.
    - codigo_saida: um uuid que o próprio banco sorteia na inscrição (gen_random_uuid), sem
      relação com o e-mail. Vai no link de sair de cada envio (#39).

    Sair apaga a linha inteira: a inscrição não deixa rastro de quem saiu (DELETE pelo
    codigo_saida, testado em tests/test_modelo.py). Tabela nova que aponte para o inscrito, como
    um registro de envios, apaga junto (ondelete CASCADE).

    O e-mail é dado pessoal (AGENTS.md): só sai do banco para o envio, e a API, os logs e os
    fixtures citam o inscrito pelo id.
    """

    __tablename__ = "inscrito"
    __table_args__ = (CheckConstraint("email = lower(email)", name="email_minusculo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True)
    codigo_saida: Mapped[UUID] = mapped_column(
        unique=True, server_default=text("gen_random_uuid()")
    )
    inscrito_em: Mapped[datetime] = mapped_column(server_default=func.now())
