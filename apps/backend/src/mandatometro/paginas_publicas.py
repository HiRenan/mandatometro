"""Endereços públicos que podem entrar no contador e no agregado de leituras."""

import re

# O deploy da API contém apenas apps/backend. O teste confere este catálogo com
# os arquivos do site, que são a origem dos slugs das trilhas e dos artigos.
ARTIGOS_POR_TRILHA = {
    "constituicao-brasileira": (
        "como-a-constituicao-e-organizada",
        "como-funcionam-as-emendas-constitucionais",
        "como-surgiu-a-constituicao-de-1988",
        "o-que-e-a-constituicao",
        "principios-fundamentais-do-brasil",
        "uniao-estados-distrito-federal-e-municipios",
    ),
    "direitos-e-deveres": (
        "deveres-basicos-em-sociedade",
        "deveres-em-situacoes-especificas",
        "direitos-individuais-e-garantias-fundamentais",
        "direitos-sociais",
        "fiscalizar-o-governo-e-participar-alem-do-voto",
        "o-que-significa-ser-cidadao",
        "quando-um-direito-nao-e-respeitado",
        "voto-candidatura-e-decisoes-coletivas",
    ),
    "processo-legislativo": (
        "a-outra-casa-revisa-o-projeto",
        "o-plenario-vota-o-projeto",
        "o-presidente-sanciona-ou-veta",
        "o-projeto-passa-pelas-comissoes",
        "onde-o-projeto-comeca",
        "quem-pode-propor-uma-lei",
    ),
    "tres-poderes": (
        "como-os-poderes-se-fiscalizam",
        "como-um-projeto-se-transforma-em-lei",
        "ministerio-publico-defensoria-e-tcu",
        "poder-executivo",
        "poder-judiciario",
        "poder-legislativo",
        "poderes-na-uniao-estados-e-municipios",
        "por-que-tres-poderes",
    ),
}
IDS_DE_ARTIGO = frozenset(
    f"{trilha}/{artigo}" for trilha, artigos in ARTIGOS_POR_TRILHA.items() for artigo in artigos
)
CAMINHOS_PUBLICOS = frozenset(
    {
        "/",
        "/edicoes",
        "/jogos",
        "/jogos/6x1",
        "/jogos/comissoes",
        "/opiniao",
        "/parlamentares",
        "/piloto",
        "/termo",
        "/trilhas",
        "/trilhas/processo-legislativo/quiz",
        "/trilhas/processo-legislativo/quiz-final",
    }
    | {f"/trilhas/{trilha}" for trilha in ARTIGOS_POR_TRILHA}
    | {f"/trilhas/{artigo}" for artigo in IDS_DE_ARTIGO}
)
_ITEM = re.compile(
    r"/(?P<tipo>edicoes|parlamentares|votacoes)/(?P<id>[1-9][0-9]{0,9})"
    r"(?P<sufixo>-[a-z0-9]+(?:-[a-z0-9]+)*)?"
)


def normalizar_caminho(caminho: str) -> str | None:
    if len(caminho) > 1 and not caminho.startswith("//"):
        caminho = caminho.removesuffix("/")
    if caminho in CAMINHOS_PUBLICOS:
        return caminho

    item = _ITEM.fullmatch(caminho)
    if not item:
        return None
    tipo, id_, sufixo = item.group("tipo", "id", "sufixo")
    if int(id_) > 2**31 - 1 or (sufixo and tipo != "parlamentares"):
        return None
    # A rota do parlamentar reconhece o ID e redireciona aliases. O nome não entra na chave.
    return f"/{tipo}/{id_}"
