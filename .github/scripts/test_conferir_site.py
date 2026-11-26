import io
import json
import os
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

import conferir_site as roteiro

SITE = "https://site.example.com"
API = "https://api.example.com"
INICIO = SITE + "/"
PARLAMENTARES = SITE + "/parlamentares"
PILOTO = SITE + "/piloto"
LISTA = PARLAMENTARES + "?uf=SP"
FICHA = SITE + "/parlamentares/891-agata-cedrolume"
FICHA_NO_RESUMO = SITE + "/parlamentares/891"
VOTACAO = SITE + "/votacoes/306"
TITULO_INICIAL = "Entenda a política brasileira, um passo de cada vez."
CORPO_INICIAL = f"<h1><span>{TITULO_INICIAL}</span></h1>"
CORPO_RESERVADO = "informação reservada na resposta simulada"
PAGINAS = {
    INICIO: CORPO_INICIAL,
    SITE + "/trilhas": "<h1>Trilhas</h1>",
    SITE + "/trilhas/processo-legislativo/o-plenario-vota-o-projeto": (
        "<h1>O Plenário vota o projeto</h1>"
    ),
    SITE + "/jogos": "<h1>Jogos</h1>",
    PARLAMENTARES: "<h1>Parlamentares</h1><select><option>Escolha o estado</option></select>",
    PILOTO: "<h1>Antes da trilha</h1>",
    SITE + "/edicoes": "<h1>Edições</h1><span>Fonte oficial em cada item</span>",
    LISTA: (
        '<h1>São Paulo</h1><a href="https://outro.example.com/parlamentares/1-externo">Fora</a>'
        '<a href="/parlamentares/891-agata-cedrolume">Ágata Cedrolume</a>'
    ),
    FICHA: '<h2>Ficha</h2><a href="/votacoes/306?partido=PF">Ver a votação</a>',
    VOTACAO: "<h2>Placar</h2>",
    API + "/health": '{"status":"ok"}',
    API + "/edicoes?limite=1": '{"edicoes":[],"total":0,"limite":1,"deslocamento":0}',
}


class ConferenciaTest(unittest.TestCase):
    def rodar(self, alterar=None, endereco_alterado=INICIO):
        enderecos = []

        def curl(comando, **opcoes):
            self.assertEqual(comando[0], "curl")
            self.assertEqual(comando[comando.index("--request") + 1], "GET")
            self.assertEqual(comando[comando.index("--max-time") + 1], "20")
            self.assertNotIn("--location", comando)
            endereco = comando[-1]
            enderecos.append(endereco)
            if alterar is not None and endereco == endereco_alterado:
                codigo, corpo, retorno = next(alterar)
            else:
                codigo, corpo, retorno = 200, PAGINAS[endereco], 0
            saida = f"{corpo}\n{codigo:03}".encode()
            return subprocess.CompletedProcess(comando, retorno, stdout=saida)

        terminal = io.StringIO()
        with (
            tempfile.TemporaryDirectory() as pasta,
            patch.object(roteiro.subprocess, "run", side_effect=curl),
            patch.object(roteiro.time, "sleep") as espera,
            patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": str(Path(pasta) / "resumo.md")}),
            redirect_stdout(terminal),
        ):
            saida = roteiro.conferir(SITE, API)
            resumo = (Path(pasta) / "resumo.md").read_text(encoding="utf-8")
            self.assertEqual(resumo, terminal.getvalue())
            self.assertNotIn(CORPO_RESERVADO, resumo)
            self.assertEqual(espera.call_count, len(enderecos) - len(set(enderecos)))
        return saida, resumo, enderecos

    def test_paginas_e_api_corretas(self):
        saida, resumo, enderecos = self.rodar()
        self.assertEqual(saida, 0)
        self.assertIn("12 de 12 verificações passaram.", resumo)
        self.assertCountEqual(enderecos, PAGINAS)

    def test_falhas_aparecem_no_resumo_depois_da_retentativa(self):
        casos = (
            (500, CORPO_INICIAL, 0, "HTTP 500"),
            (
                200,
                f"<h1>Ocorreu um erro</h1><nav>{TITULO_INICIAL}</nav>{CORPO_RESERVADO}",
                0,
                "HTTP 200 (texto esperado ausente)",
            ),
            (0, CORPO_RESERVADO, 28, "sem status HTTP (prazo excedido)"),
            (200, "<h1>Outra página</h1>", 0, "HTTP 200 (texto esperado ausente)"),
        )
        for codigo, corpo, retorno, motivo in casos:
            with self.subTest(codigo=codigo, retorno=retorno, corpo=corpo):
                resposta = (codigo, corpo, retorno)
                saida, resumo, enderecos = self.rodar(iter([resposta, resposta]))
                self.assertEqual(saida, 1)
                self.assertEqual(enderecos.count(INICIO), 2)
                self.assertIn("11 de 12 verificações passaram.", resumo)
                self.assertIn(f"- Página inicial — `{INICIO}` — {motivo}\n", resumo)

    def test_resposta_correta_na_segunda_tentativa(self):
        saida, resumo, enderecos = self.rodar(
            iter([(500, CORPO_RESERVADO, 0), (200, CORPO_INICIAL, 0)])
        )
        self.assertEqual(saida, 0)
        self.assertIn("12 de 12 verificações passaram.", resumo)
        self.assertEqual(enderecos.count(INICIO), 2)

    def test_redirecionamento_falha_mesmo_com_o_titulo_correto(self):
        saida, resumo, enderecos = self.rodar(iter([(307, CORPO_INICIAL, 0)] * 2))
        self.assertEqual(saida, 1)
        self.assertEqual(enderecos.count(INICIO), 2)
        self.assertIn("11 de 12 verificações passaram.", resumo)
        self.assertIn(f"- Página inicial — `{INICIO}` — HTTP 307\n", resumo)

    def test_paginas_sem_api_falham_mesmo_com_o_titulo_correto(self):
        casos = (
            (
                "Parlamentares",
                PARLAMENTARES,
                "<h1>Parlamentares</h1>"
                "<p>Os parlamentares ainda não aparecem neste endereço do site.</p>",
            ),
            (
                "Piloto",
                PILOTO,
                "<h1>Antes da trilha</h1>"
                "<p>O piloto ainda não funciona neste endereço do site.</p>",
            ),
        )
        for nome, endereco, corpo in casos:
            with self.subTest(endereco=endereco):
                saida, resumo, enderecos = self.rodar(iter([(200, corpo, 0)] * 2), endereco)
                self.assertEqual(saida, 1)
                self.assertEqual(enderecos.count(endereco), 2)
                self.assertIn("11 de 12 verificações passaram.", resumo)
                self.assertIn(
                    f"- {nome} — `{endereco}` — HTTP 200 (texto esperado ausente)\n", resumo
                )

    def test_lista_fora_do_ar_impede_descoberta_e_mantem_as_outras_leituras(self):
        saida, resumo, enderecos = self.rodar(iter([(404, CORPO_RESERVADO, 0)] * 2), LISTA)
        self.assertEqual(saida, 1)
        self.assertIn("9 de 12 verificações passaram.", resumo)
        self.assertIn(f"- Lista de parlamentares de SP — `{LISTA}` — HTTP 404\n", resumo)
        self.assertIn(
            f"- Ficha parlamentar — `{LISTA}` — sem consulta (lista indisponível)\n", resumo
        )
        self.assertIn(f"- Votação — `{LISTA}` — sem consulta (lista indisponível)\n", resumo)
        self.assertNotIn(FICHA, enderecos)
        self.assertNotIn(VOTACAO, enderecos)
        self.assertIn(API + "/edicoes?limite=1", enderecos)

    def test_lista_200_sem_link_de_ficha_falha(self):
        saida, resumo, enderecos = self.rodar(iter([(200, "<h1>São Paulo</h1>", 0)] * 2), LISTA)
        self.assertEqual(saida, 1)
        self.assertEqual(enderecos.count(LISTA), 2)
        self.assertIn("9 de 12 verificações passaram.", resumo)
        self.assertIn(f"- Lista de parlamentares de SP — `{LISTA}` — HTTP 200", resumo)
        self.assertNotIn(FICHA, enderecos)
        self.assertNotIn(VOTACAO, enderecos)

    def test_ficha_200_sem_link_de_votacao_falha(self):
        saida, resumo, enderecos = self.rodar(iter([(200, "<h2>Ficha</h2>", 0)] * 2), FICHA)
        self.assertEqual(saida, 1)
        self.assertEqual(enderecos.count(FICHA), 2)
        self.assertIn("10 de 12 verificações passaram.", resumo)
        self.assertIn(f"- Ficha parlamentar — `{FICHA_NO_RESUMO}` — HTTP 200", resumo)
        self.assertIn(
            f"- Votação — `{FICHA_NO_RESUMO}` — sem consulta (ficha indisponível)\n", resumo
        )
        self.assertNotIn(VOTACAO, enderecos)

    def test_falha_da_ficha_usa_o_id_no_resumo_e_a_url_canonica_no_get(self):
        saida, resumo, enderecos = self.rodar(iter([(500, CORPO_RESERVADO, 0)] * 2), FICHA)
        self.assertEqual(saida, 1)
        self.assertEqual(enderecos.count(FICHA), 2)
        self.assertNotIn(FICHA_NO_RESUMO, enderecos)
        self.assertNotIn("agata-cedrolume", resumo)
        self.assertIn(f"- Ficha parlamentar — `{FICHA_NO_RESUMO}` — HTTP 500\n", resumo)
        self.assertIn(
            f"- Votação — `{FICHA_NO_RESUMO}` — sem consulta (ficha indisponível)\n", resumo
        )


class PublicacaoTest(unittest.TestCase):
    def rodar(self, consultas, tempos):
        sha = "1" * 40

        def github(comando, **opcoes):
            self.assertEqual(
                comando,
                [
                    "gh",
                    "api",
                    "--method",
                    "GET",
                    f"repos/dono/repo/commits/{sha}/status?per_page=100",
                ],
            )
            estados = next(consultas)
            corpo = json.dumps(
                {"statuses": [{"context": nome, "state": estado} for nome, estado in estados]}
            )
            return subprocess.CompletedProcess(comando, 0, stdout=corpo.encode())

        terminal = io.StringIO()
        with (
            patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": ""}),
            patch.object(roteiro.subprocess, "run", side_effect=github),
            patch.object(roteiro.time, "monotonic", side_effect=tempos),
            patch.object(roteiro.time, "sleep"),
            redirect_stdout(terminal),
        ):
            saida = roteiro.aguardar_publicacao("dono/repo", sha)
        return saida, terminal.getvalue()

    def test_espera_o_sucesso_dos_dois_contextos(self):
        site, api = roteiro.CONTEXTOS_VERCEL
        consultas = iter(
            [[(site, "success"), (api, "pending")], [(site, "success"), (api, "success")]]
        )
        saida, resumo = self.rodar(consultas, [0, 0, 0, 15])
        self.assertEqual(saida, 0)
        self.assertIn("publicação confirmada", resumo)
        self.assertIn(f"- {api} — success", resumo)

    def test_expira_se_um_contexto_nao_chegar(self):
        site, api = roteiro.CONTEXTOS_VERCEL
        consultas = iter([[(site, "success"), ("Web", "success")]])
        saida, resumo = self.rodar(consultas, [0, 0, 0, 600])
        self.assertEqual(saida, 1)
        self.assertIn("prazo de 10 min excedido", resumo)
        self.assertIn(f"- {site} — success", resumo)
        self.assertIn(f"- {api} — ausente", resumo)

    def test_falha_da_vercel_interrompe_a_espera(self):
        site, api = roteiro.CONTEXTOS_VERCEL
        consultas = iter([[(site, "success"), (api, "failure")]])
        saida, resumo = self.rodar(consultas, [0, 0])
        self.assertEqual(saida, 1)
        self.assertIn("falha informada pela Vercel", resumo)
        self.assertIn(f"- {api} — failure", resumo)
