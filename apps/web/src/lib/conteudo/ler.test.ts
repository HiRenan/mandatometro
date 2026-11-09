import { describe, expect, it } from "vitest";
import { lerTrilhas } from "./ler";

const pasta = "/conteudo/trilhas/processo-legislativo";
const BOM = "\uFEFF";

const trilhaMd = `---
titulo: Processo legislativo
descricao: Como uma ideia vira lei.
ordem: 1
---
`;

function artigoMd({
	titulo = "Um artigo",
	ordem = "1",
	url = "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art61",
	consultadoEm = "2026-11-09",
	resumo = "resumo: O resumo do artigo.\n",
	corpo = "Um texto curto.",
} = {}) {
	return `---
titulo: ${titulo}
${resumo}ordem: ${ordem}
fontes:
  - titulo: Constituição Federal, art. 61
    url: ${url}
    consultadoEm: ${consultadoEm}
---

${corpo}
`;
}

describe("lerTrilhas", () => {
	it("lê a trilha e os artigos dela, na ordem do cabeçalho", () => {
		const [trilha] = lerTrilhas({
			[`${pasta}/trilha.md`]: trilhaMd,
			[`${pasta}/segundo.md`]: artigoMd({ titulo: "Segundo", ordem: "2" }),
			[`${pasta}/primeiro.md`]: artigoMd({ titulo: "Primeiro", ordem: "1" }),
		});

		expect(trilha).toMatchObject({
			slug: "processo-legislativo",
			titulo: "Processo legislativo",
			descricao: "Como uma ideia vira lei.",
		});
		expect(trilha.artigos.map((artigo) => artigo.slug)).toEqual([
			"primeiro",
			"segundo",
		]);
		expect(trilha.artigos[0]).toEqual({
			trilha: "processo-legislativo",
			slug: "primeiro",
			titulo: "Primeiro",
			resumo: "O resumo do artigo.",
			ordem: 1,
			fontes: [
				{
					titulo: "Constituição Federal, art. 61",
					url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art61",
					consultadoEm: "2026-11-09",
				},
			],
			corpo: "Um texto curto.",
			minutos: 1,
		});
	});

	it("põe um artigo novo no lugar da ordem dele, só com o arquivo novo", () => {
		const arquivos = {
			[`${pasta}/trilha.md`]: trilhaMd,
			[`${pasta}/primeiro.md`]: artigoMd({ ordem: "1" }),
			[`${pasta}/terceiro.md`]: artigoMd({ ordem: "3" }),
		};
		const [trilha] = lerTrilhas({
			...arquivos,
			[`${pasta}/segundo.md`]: artigoMd({ ordem: "2" }),
		});

		expect(trilha.artigos.map((artigo) => artigo.slug)).toEqual([
			"primeiro",
			"segundo",
			"terceiro",
		]);
	});

	it("ordena as trilhas pela ordem do cabeçalho", () => {
		const trilhas = lerTrilhas({
			"/conteudo/trilhas/eleicoes/trilha.md": trilhaMd.replace(
				"ordem: 1",
				"ordem: 2",
			),
			"/conteudo/trilhas/eleicoes/voto.md": artigoMd(),
			[`${pasta}/trilha.md`]: trilhaMd,
			[`${pasta}/primeiro.md`]: artigoMd(),
		});

		expect(trilhas.map((trilha) => trilha.slug)).toEqual([
			"processo-legislativo",
			"eleicoes",
		]);
	});

	it("calcula o tempo de leitura a 200 palavras por minuto", () => {
		const [trilha] = lerTrilhas({
			[`${pasta}/trilha.md`]: trilhaMd,
			[`${pasta}/longo.md`]: artigoMd({
				corpo: "palavra ".repeat(600).trim(),
			}),
		});

		expect(trilha.artigos[0].minutos).toBe(3);
	});

	it("aceita arquivos com fim de linha do Windows", () => {
		const [trilha] = lerTrilhas({
			[`${pasta}/trilha.md`]: trilhaMd.replaceAll("\n", "\r\n"),
			[`${pasta}/primeiro.md`]: artigoMd().replaceAll("\n", "\r\n"),
		});

		expect(trilha.artigos[0].corpo).toBe("Um texto curto.");
	});

	it("aceita arquivos que começam com BOM", () => {
		const [trilha] = lerTrilhas({
			[`${pasta}/trilha.md`]: `${BOM}${trilhaMd}`,
			[`${pasta}/primeiro.md`]: `${BOM}${artigoMd()}`,
		});

		expect(trilha.titulo).toBe("Processo legislativo");
	});

	describe("avisa o erro com o nome do arquivo", () => {
		function ler(artigo: string) {
			return () =>
				lerTrilhas({
					[`${pasta}/trilha.md`]: trilhaMd,
					[`${pasta}/primeiro.md`]: artigo,
				});
		}

		it("quando falta um campo", () => {
			expect(ler(artigoMd({ resumo: "" }))).toThrow(
				/processo-legislativo\/primeiro\.md.*"resumo"/,
			);
		});

		it("quando um campo tem outro nome", () => {
			expect(
				ler(artigoMd().replace("consultadoEm:", "consultado_em:")),
			).toThrow(/primeiro\.md.*consultado_em/);
		});

		it("quando a fonte não é um site oficial", () => {
			expect(ler(artigoMd({ url: "https://exemplo.com/lei" }))).toThrow(
				/primeiro\.md.*"fontes\.0\.url".*gov\.br/,
			);
		});

		it("quando a fonte não usa https", () => {
			expect(
				ler(artigoMd({ url: "http://www.planalto.gov.br/constituicao" })),
			).toThrow(/primeiro\.md.*"fontes\.0\.url"/);
		});

		it("quando a data da consulta não é AAAA-MM-DD", () => {
			expect(ler(artigoMd({ consultadoEm: "09/11/2026" }))).toThrow(
				/primeiro\.md.*"fontes\.0\.consultadoEm".*AAAA-MM-DD/,
			);
		});

		it("quando o artigo não tem fonte", () => {
			const semFonte = artigoMd().replace(/fontes:[\s\S]*?(?=---)/, "");
			expect(ler(semFonte)).toThrow(/primeiro\.md.*"fontes"/);
		});

		it("quando a ordem não é um número inteiro", () => {
			expect(ler(artigoMd({ ordem: "primeiro" }))).toThrow(
				/primeiro\.md.*"ordem"/,
			);
		});

		it("quando falta o cabeçalho", () => {
			expect(ler("Só o texto, sem cabeçalho.")).toThrow(
				/primeiro\.md.*cabeçalho/,
			);
		});

		it("quando o cabeçalho não é YAML válido", () => {
			expect(ler("---\ntitulo: [aberto\n---\n\nTexto.")).toThrow(
				/primeiro\.md.*YAML/,
			);
		});

		it("quando o texto está vazio", () => {
			expect(ler(artigoMd({ corpo: "" }))).toThrow(/primeiro\.md.*texto/);
		});

		it("quando o texto usa título de nível 1", () => {
			expect(ler(artigoMd({ corpo: "# Outro título\n\nTexto." }))).toThrow(
				/primeiro\.md.*##/,
			);
		});

		it("quando dois artigos têm a mesma ordem", () => {
			expect(() =>
				lerTrilhas({
					[`${pasta}/trilha.md`]: trilhaMd,
					[`${pasta}/primeiro.md`]: artigoMd({ ordem: "1" }),
					[`${pasta}/outro.md`]: artigoMd({ ordem: "1" }),
				}),
			).toThrow(
				/outro\.md.*primeiro\.md.*ordem 1|primeiro\.md.*outro\.md.*ordem 1/,
			);
		});

		it("quando o nome do arquivo tem acento ou maiúscula", () => {
			expect(() =>
				lerTrilhas({
					[`${pasta}/trilha.md`]: trilhaMd,
					[`${pasta}/Começo.md`]: artigoMd(),
				}),
			).toThrow(/Começo\.md.*minúsculas/);
		});

		it("quando a pasta não tem trilha.md", () => {
			expect(() =>
				lerTrilhas({ [`${pasta}/primeiro.md`]: artigoMd() }),
			).toThrow(/processo-legislativo.*trilha\.md/);
		});

		it("quando a trilha não tem artigos", () => {
			expect(() => lerTrilhas({ [`${pasta}/trilha.md`]: trilhaMd })).toThrow(
				/processo-legislativo.*nenhum artigo/,
			);
		});
	});
});
