import { describe, expect, it } from "vitest";
import {
	caminhoDaTrilha,
	enderecoSeguro,
	fontesPorEndereco,
	paragrafos,
} from "./conteudo-da-edicao";
import {
	FONTE_DA_PROPOSICAO,
	FONTE_DA_VOTACAO,
	FONTE_DO_SENADO,
	OUTRA_COLETA_DA_VOTACAO,
} from "./exemplos-de-teste";

describe("os parágrafos do texto de um item", () => {
	it("separam na linha em branco, sem parágrafo vazio", () => {
		expect(
			paragrafos("Primeiro parágrafo.\n\nSegundo,\ncom quebra.\n \n\n"),
		).toEqual(["Primeiro parágrafo.", "Segundo,\ncom quebra."]);
	});

	it("um texto sem linha em branco é um parágrafo só", () => {
		expect(paragrafos("  Um parágrafo.  ")).toEqual(["Um parágrafo."]);
		expect(paragrafos("")).toEqual([]);
	});
});

describe("as fontes de um item", () => {
	it("ficam agrupadas pelo endereço, na ordem da API, como no e-mail", () => {
		expect(
			fontesPorEndereco([
				FONTE_DA_VOTACAO,
				FONTE_DA_PROPOSICAO,
				OUTRA_COLETA_DA_VOTACAO,
				FONTE_DO_SENADO,
			]),
		).toEqual([
			{
				url: FONTE_DA_VOTACAO.url,
				coletas: [FONTE_DA_VOTACAO, OUTRA_COLETA_DA_VOTACAO],
			},
			{ url: FONTE_DA_PROPOSICAO.url, coletas: [FONTE_DA_PROPOSICAO] },
			{ url: FONTE_DO_SENADO.url, coletas: [FONTE_DO_SENADO] },
		]);
	});
});

describe("o endereço do link de uma fonte", () => {
	it("aceita os sites oficiais, em http ou https", () => {
		for (const url of [
			"https://www.camara.leg.br/votacoes/exemplo-1",
			"https://www25.senado.leg.br/web/atividade/materias/exemplo-2",
			"http://dadosabertos.camara.leg.br/api/v2/votacoes/1",
			"https://www.planalto.gov.br/ccivil_03/leis/exemplo.htm",
			"https://leg.br/",
		]) {
			expect(enderecoSeguro(url), url).toBe(url);
		}
	});

	it("recusa outro esquema, outro site, usuário no endereço e caractere de controle", () => {
		for (const url of [
			"javascript:alert(1)",
			"data:text/html,oi",
			"ftp://www.camara.leg.br/arquivo",
			"https://exemplo.com/camara.leg.br",
			"https://camara.leg.br.exemplo.com/",
			"https://naoleg.br/",
			"https://fulano:senha@www.camara.leg.br/",
			"https://www.camara.leg.br/\nvotacoes",
			"https://www.camara.leg.br/ votacoes",
			"/votacoes/exemplo-1",
			"",
		]) {
			expect(enderecoSeguro(url), JSON.stringify(url)).toBeNull();
		}
	});
});

describe("o artigo da trilha de um item", () => {
	it("dá a trilha e o artigo de um caminho da trilha", () => {
		expect(
			caminhoDaTrilha({
				titulo: "Onde o projeto começa",
				caminho: "/trilhas/processo-legislativo/onde-o-projeto-comeca",
			}),
		).toEqual({
			trilha: "processo-legislativo",
			artigo: "onde-o-projeto-comeca",
		});
	});

	it("sem artigo, ou com outro caminho, o item fica sem o link", () => {
		expect(caminhoDaTrilha(null)).toBeNull();
		for (const caminho of [
			"https://exemplo.com/trilhas/a/b",
			"//exemplo.com/trilhas/a/b",
			"/trilhas/processo-legislativo",
			"/trilhas/processo-legislativo/onde-o-projeto-comeca/mais",
			"/trilhas/processo-legislativo/../segredo",
			"/trilhas/Processo/Artigo",
			"javascript:alert(1)",
			"",
		]) {
			expect(caminhoDaTrilha({ titulo: "Um artigo", caminho }), caminho).toBe(
				null,
			);
		}
	});
});
