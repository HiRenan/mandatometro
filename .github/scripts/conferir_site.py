"""Confere as páginas e a API públicas sem executar o JavaScript do site."""

import argparse
import json
import os
import re
import subprocess
import time
from html.parser import HTMLParser
from pathlib import Path

PRAZO_HTTP = 20
ESPERA_RETENTATIVA = 2
PRAZO_PUBLICACAO = 10 * 60
INTERVALO_PUBLICACAO = 15
CONTEXTOS_VERCEL = ("Vercel – mandatometro", "Vercel – mandatometro-api")
ESTADOS_PUBLICACAO = ("success", "pending", "error", "failure")

PAGINAS = (
    ("Página inicial", "/", "Entenda a política brasileira, um passo de cada vez."),
    ("Trilhas", "/trilhas", "Trilhas"),
    (
        "Artigo",
        "/trilhas/processo-legislativo/o-plenario-vota-o-projeto",
        "O Plenário vota o projeto",
    ),
    ("Jogos", "/jogos", "Jogos"),
)
LISTA_PARLAMENTARES = "/parlamentares?uf=SP"
LINK_FICHA = re.compile(r"/parlamentares/[1-9][0-9]*(?:-[a-z0-9-]+)?")
LINK_VOTACAO = re.compile(r"/votacoes/[1-9][0-9]*")


class Pagina(HTMLParser):
    def __init__(self, corpo, tag):
        super().__init__()
        self.tag = tag
        self.texto = None
        self.titulos = set()
        self.links = []
        self.feed(corpo)
        self.close()

    def handle_starttag(self, tag, attrs):
        if tag == self.tag:
            self.texto = []
        elif tag == "a" and (href := dict(attrs).get("href")):
            self.links.append(href)

    def handle_data(self, data):
        if self.texto is not None:
            self.texto.append(data)

    def handle_endtag(self, tag):
        if tag == self.tag and self.texto is not None:
            self.titulos.add(" ".join("".join(self.texto).split()))
            self.texto = None

    def primeiro_link(self, padrao):
        for href in self.links:
            caminho = href.split("?", 1)[0]
            if padrao.fullmatch(caminho):
                return caminho
        return None


def html_esperado(titulo, tag="h1", *, link=None, trecho="", aviso_indisponivel=None):
    def validar(corpo):
        try:
            pagina = Pagina(corpo, tag)
        except (AssertionError, ValueError):
            return None
        if titulo not in pagina.titulos or trecho not in corpo:
            return None
        if aviso_indisponivel is not None and aviso_indisponivel in corpo:
            return None
        if link is not None:
            return pagina.primeiro_link(link)
        return pagina

    return validar


def json_esperado(condicao):
    def validar(corpo):
        try:
            dados = json.loads(corpo)
        except (ValueError, RecursionError):
            return None
        return dados if isinstance(dados, dict) and condicao(dados) else None

    return validar


def pedir(endereco):
    try:
        resposta = subprocess.run(
            [
                "curl",
                "--disable",
                "--silent",
                "--compressed",
                "--globoff",
                "--proto",
                "=https",
                "--request",
                "GET",
                "--max-time",
                str(PRAZO_HTTP),
                "--write-out",
                "\n%{http_code}",
                "--url",
                endereco,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=PRAZO_HTTP + 2,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return "sem status HTTP (prazo excedido)", ""
    except OSError:
        return "sem status HTTP (curl indisponível)", ""

    corpo, _, codigo = resposta.stdout.rpartition(b"\n")
    estado = (
        f"HTTP {codigo.decode('ascii')}"
        if codigo.isdigit() and codigo != b"000"
        else "sem status HTTP"
    )
    if resposta.returncode:
        motivo = "prazo excedido" if resposta.returncode == 28 else "falha de rede"
        return f"{estado} ({motivo})", ""
    return estado, corpo.decode("utf-8", errors="replace")


def verificar(endereco, validar):
    for tentativa in range(2):
        if tentativa:
            time.sleep(ESPERA_RETENTATIVA)
        estado, corpo = pedir(endereco)
        if estado == "HTTP 200":
            dado = validar(corpo)
            if dado is not None:
                return estado, dado
            estado += " (texto esperado ausente)"
    return estado, None


def resumo(titulo, linhas):
    texto = "\n".join((f"## {titulo}", "", *linhas, ""))
    print(texto, end="")
    if arquivo := os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(arquivo).open("a", encoding="utf-8") as saida:
            saida.write(texto)


def conferir(site, api):
    site, api = site.rstrip("/"), api.rstrip("/")
    falhas = []
    aprovadas = 0

    def consultar(nome, endereco, validar, *, endereco_no_resumo=None):
        nonlocal aprovadas
        estado, dado = verificar(endereco, validar)
        if dado is None:
            exibido = endereco_no_resumo or endereco
            falhas.append(f"- {nome} — `{exibido}` — {estado}")
        else:
            aprovadas += 1
        return dado

    for nome, caminho, titulo in PAGINAS:
        consultar(nome, site + caminho, html_esperado(titulo))
    consultar(
        "Parlamentares",
        site + "/parlamentares",
        html_esperado("Parlamentares", trecho="Escolha o estado"),
    )
    consultar(
        "Piloto",
        site + "/piloto",
        html_esperado(
            "Antes da trilha",
            aviso_indisponivel="O piloto ainda não funciona neste endereço do site.",
        ),
    )
    consultar(
        "Edições", site + "/edicoes", html_esperado("Edições", trecho="Fonte oficial em cada item")
    )

    lista = site + LISTA_PARLAMENTARES
    ficha = consultar(
        "Lista de parlamentares de SP", lista, html_esperado("São Paulo", link=LINK_FICHA)
    )
    if ficha is None:
        falhas.append(f"- Ficha parlamentar — `{lista}` — sem consulta (lista indisponível)")
        falhas.append(f"- Votação — `{lista}` — sem consulta (lista indisponível)")
    else:
        endereco = site + ficha
        # O link canônico inclui o nome. O resumo identifica a ficha pelo ID.
        endereco_no_resumo = site + ficha.split("-", 1)[0]
        votacao = consultar(
            "Ficha parlamentar",
            endereco,
            html_esperado("Ficha", "h2", link=LINK_VOTACAO),
            endereco_no_resumo=endereco_no_resumo,
        )
        if votacao is None:
            falhas.append(f"- Votação — `{endereco_no_resumo}` — sem consulta (ficha indisponível)")
        else:
            consultar("Votação", site + votacao, html_esperado("Placar", "h2"))

    consultar(
        "Saúde da API", api + "/health", json_esperado(lambda dados: dados.get("status") == "ok")
    )
    consultar(
        "Leitura de edições da API",
        api + "/edicoes?limite=1",
        json_esperado(
            lambda dados: isinstance(dados.get("edicoes"), list) and dados.get("limite") == 1
        ),
    )

    resumo(
        "Conferência do site no ar",
        [f"{aprovadas} de {aprovadas + len(falhas)} verificações passaram.", "", *falhas],
    )
    return int(bool(falhas))


def status_da_publicacao(repositorio, sha, prazo):
    try:
        resposta = subprocess.run(
            [
                "gh",
                "api",
                "--method",
                "GET",
                f"repos/{repositorio}/commits/{sha}/status?per_page=100",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=prazo,
            check=True,
        )
        return {
            item["context"]: item["state"]
            for item in json.loads(resposta.stdout)["statuses"]
            if item.get("context") in CONTEXTOS_VERCEL and item.get("state") in ESTADOS_PUBLICACAO
        }
    except (OSError, subprocess.SubprocessError, ValueError, KeyError, TypeError, AttributeError):
        return None


def aguardar_publicacao(repositorio, sha):
    limite = time.monotonic() + PRAZO_PUBLICACAO
    estados = {}
    consulta_falhou = False
    resultado = "prazo de 10 min excedido"
    while (restante := limite - time.monotonic()) > 0:
        consultados = status_da_publicacao(repositorio, sha, min(INTERVALO_PUBLICACAO, restante))
        consulta_falhou = consultados is None
        if consultados is not None:
            estados = consultados
            if all(estados.get(contexto) == "success" for contexto in CONTEXTOS_VERCEL):
                resultado = "publicação confirmada"
                break
            if any(estado in ("failure", "error") for estado in estados.values()):
                resultado = "falha informada pela Vercel"
                break
        time.sleep(max(0, min(INTERVALO_PUBLICACAO, limite - time.monotonic())))

    linhas = [f"Commit `{sha}` — {resultado}.", ""]
    linhas.extend(
        f"- {contexto} — {estados.get(contexto, 'ausente')}" for contexto in CONTEXTOS_VERCEL
    )
    if consulta_falhou:
        linhas.extend(("", "A última consulta de status ao GitHub falhou."))
    resumo("Publicação na Vercel", linhas)
    return int(resultado != "publicação confirmada")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    comandos = parser.add_subparsers(dest="comando", required=True)
    checar = comandos.add_parser("conferir", help="Conferir o site e a API")
    checar.add_argument("site", help="Endereço HTTPS do site")
    checar.add_argument("api", help="Endereço HTTPS da API")
    aguardar = comandos.add_parser("aguardar", help="Aguardar os status da Vercel")
    aguardar.add_argument("repositorio", help="Repositório GitHub no formato dono/nome")
    aguardar.add_argument("sha", help="SHA do commit publicado")
    args = parser.parse_args()

    if args.comando == "conferir":
        return conferir(args.site, args.api)
    return aguardar_publicacao(args.repositorio, args.sha)


if __name__ == "__main__":
    raise SystemExit(main())
