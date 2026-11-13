import { describe, expect, it } from "vitest";
import { ErroDeConteudo, lerTrilhas } from "./ler";

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

	it.each([
		"https://www.mpf.mp.br/o-mpf",
		"https://direitoshumanos.dpu.def.br/dpu-completa-29-anos-de-implantacao/",
	])("aceita a fonte oficial %s", (url) => {
		const [trilha] = lerTrilhas({
			[`${pasta}/trilha.md`]: trilhaMd,
			[`${pasta}/primeiro.md`]: artigoMd({ url }),
		});

		expect(trilha.artigos[0].fontes[0].url).toBe(url);
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

		it.each([
			"https://exemplo.com/lei",
			"https://falsomp.br/lei",
			"https://www.mpf.mp.br.exemplo.com/lei",
			"https://falsodef.br/lei",
			"https://dpu.def.br.exemplo.com/lei",
		])("quando a fonte não é um site oficial: %s", (url) => {
			expect(ler(artigoMd({ url }))).toThrow(
				/primeiro\.md.*"fontes\.0\.url".*gov\.br/,
			);
		});

		it("quando a fonte não usa https", () => {
			expect(
				ler(artigoMd({ url: "http://www.planalto.gov.br/constituicao" })),
			).toThrow(/primeiro\.md.*"fontes\.0\.url"/);
		});

		it("uma vez só quando a fonte não usa https nem é um site oficial", () => {
			expect(ler(artigoMd({ url: "http://exemplo.com/fonte" }))).toThrow(
				new ErroDeConteudo([
					'conteudo/trilhas/processo-legislativo/primeiro.md: campo "fontes.0.url": precisa ser um link https de um site oficial (gov.br, leg.br, jus.br, mp.br ou def.br)',
				]),
			);
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

		it("em português, quando uma fonte é um texto solto, sem os campos", () => {
			const fonteEmTexto = artigoMd().replace(
				/ {2}- titulo: (.*)\n {4}url: .*\n {4}consultadoEm: .*\n/,
				"  - $1\n",
			);
			expect(ler(fonteEmTexto)).toThrow(
				new ErroDeConteudo([
					'conteudo/trilhas/processo-legislativo/primeiro.md: campo "fontes.0": precisa ser uma fonte com os campos titulo, url e consultadoEm',
				]),
			);
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

		it("quando há texto embaixo do cabeçalho do trilha.md", () => {
			expect(() =>
				lerTrilhas({
					[`${pasta}/trilha.md`]: `${trilhaMd}\nUm texto que não aparece na página.\n`,
					[`${pasta}/primeiro.md`]: artigoMd(),
				}),
			).toThrow(
				new ErroDeConteudo([
					"conteudo/trilhas/processo-legislativo/trilha.md: o trilha.md é só o cabeçalho, e o texto embaixo dele não aparece na página",
				]),
			);
		});

		it("quando a trilha não tem artigos", () => {
			expect(() => lerTrilhas({ [`${pasta}/trilha.md`]: trilhaMd })).toThrow(
				/processo-legislativo.*nenhum artigo/,
			);
		});
	});
});

const infograficoMd = `---
titulo: O caminho de um projeto de lei
resumo: Os passos de um projeto, do começo ao fim.
passos:
  - titulo: Apresentação
    texto: Quem pode propor apresenta o projeto.
    artigos:
      - primeiro
    fontes:
      - titulo: Constituição Federal, art. 61
        url: https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art61
        consultadoEm: 2026-11-10
  - titulo: Comissões
    texto: As comissões estudam o projeto.
    desvios:
      - Se o regimento permitir, a comissão decide sozinha.
    fontes:
      - titulo: Constituição Federal, art. 58
        url: https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art58
        consultadoEm: 2026-11-10
---
`;

describe("o infográfico da trilha", () => {
	function ler(infografico: string) {
		return lerTrilhas({
			[`${pasta}/trilha.md`]: trilhaMd,
			[`${pasta}/primeiro.md`]: artigoMd(),
			[`${pasta}/infografico.md`]: infografico,
		});
	}

	it("lê o infografico.md, com os passos na ordem do arquivo", () => {
		const [trilha] = ler(infograficoMd);

		expect(trilha.infografico).toEqual({
			titulo: "O caminho de um projeto de lei",
			resumo: "Os passos de um projeto, do começo ao fim.",
			passos: [
				{
					titulo: "Apresentação",
					texto: "Quem pode propor apresenta o projeto.",
					desvios: [],
					artigos: ["primeiro"],
					fontes: [
						{
							titulo: "Constituição Federal, art. 61",
							url: "https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art61",
							consultadoEm: "2026-11-10",
						},
					],
				},
				{
					titulo: "Comissões",
					texto: "As comissões estudam o projeto.",
					desvios: ["Se o regimento permitir, a comissão decide sozinha."],
					artigos: [],
					fontes: [
						{
							titulo: "Constituição Federal, art. 58",
							url: "https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art58",
							consultadoEm: "2026-11-10",
						},
					],
				},
			],
		});
	});

	it("não vira um artigo da trilha", () => {
		const [trilha] = ler(infograficoMd);

		expect(trilha.artigos.map((artigo) => artigo.slug)).toEqual(["primeiro"]);
	});

	it("é opcional: a trilha sem o arquivo fica sem infográfico", () => {
		const [trilha] = lerTrilhas({
			[`${pasta}/trilha.md`]: trilhaMd,
			[`${pasta}/primeiro.md`]: artigoMd(),
		});

		expect(trilha.infografico).toBeUndefined();
	});

	describe("avisa o erro com o nome do arquivo", () => {
		it("quando um passo não tem fonte", () => {
			const semFonte = infograficoMd.replace(
				/ {4}fontes:\n {6}- titulo: Constituição Federal, art\. 61\n.*\n.*\n/,
				"",
			);
			expect(() => ler(semFonte)).toThrow(
				/infografico\.md.*"passos\.0\.fontes"/,
			);
		});

		it("quando a fonte de um passo não é um site oficial", () => {
			expect(() =>
				ler(
					infograficoMd.replace(
						"https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art58",
						"https://exemplo.com/constituicao",
					),
				),
			).toThrow(/infografico\.md.*"passos\.1\.fontes\.0\.url".*gov\.br/);
		});

		it("quando um passo aponta um artigo que não existe na trilha", () => {
			expect(() =>
				ler(infograficoMd.replace("- primeiro", "- nao-existe")),
			).toThrow(
				new ErroDeConteudo([
					'conteudo/trilhas/processo-legislativo/infografico.md: campo "passos.0.artigos": o artigo "nao-existe" não existe nesta trilha',
				]),
			);
		});

		it("quando o infográfico não tem passos", () => {
			const semPassos = infograficoMd.replace(/passos:[\s\S]*?(?=---)/, "");
			expect(() => ler(semPassos)).toThrow(/infografico\.md.*"passos"/);
		});

		it("em português, quando um passo é um texto solto, sem os campos", () => {
			const passoEmTexto = infograficoMd.replace(
				/ {2}- titulo: Comissões[\s\S]*?(?=---)/,
				"  - Comissões\n",
			);
			expect(() => ler(passoEmTexto)).toThrow(
				new ErroDeConteudo([
					'conteudo/trilhas/processo-legislativo/infografico.md: campo "passos.1": precisa ser um passo com os campos titulo, texto e fontes',
				]),
			);
		});

		it("quando um campo tem outro nome", () => {
			expect(() =>
				ler(infograficoMd.replace("    desvios:", "    desvio:")),
			).toThrow(/infografico\.md.*"passos\.1\.desvio"/);
		});

		it("quando um passo repete um artigo", () => {
			expect(() =>
				ler(
					infograficoMd.replace(
						"      - primeiro\n",
						"      - primeiro\n      - primeiro\n",
					),
				),
			).toThrow(
				new ErroDeConteudo([
					'conteudo/trilhas/processo-legislativo/infografico.md: campo "passos.0.artigos.1": o artigo "primeiro" já está neste passo',
				]),
			);
		});

		it("quando um passo repete um desvio", () => {
			const desvio =
				"      - Se o regimento permitir, a comissão decide sozinha.\n";
			expect(() =>
				ler(infograficoMd.replace(desvio, `${desvio}${desvio}`)),
			).toThrow(
				new ErroDeConteudo([
					'conteudo/trilhas/processo-legislativo/infografico.md: campo "passos.1.desvios.1": o desvio "Se o regimento permitir, a comissão decide sozinha." já está neste passo',
				]),
			);
		});

		it("quando um passo repete o link de uma fonte, mesmo com outro título", () => {
			const fonte = `      - titulo: Constituição Federal, art. 58
        url: https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art58
        consultadoEm: 2026-11-10
`;
			const outraVez = fonte.replace("art. 58\n", "artigo 58\n");
			expect(() =>
				ler(infograficoMd.replace(fonte, `${fonte}${outraVez}`)),
			).toThrow(
				new ErroDeConteudo([
					'conteudo/trilhas/processo-legislativo/infografico.md: campo "passos.1.fontes.1.url": a fonte "https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art58" já está neste passo',
				]),
			);
		});

		it("quando dois passos têm o mesmo título", () => {
			expect(() =>
				ler(
					infograficoMd.replace(
						"- titulo: Comissões",
						"- titulo: Apresentação",
					),
				),
			).toThrow(
				new ErroDeConteudo([
					'conteudo/trilhas/processo-legislativo/infografico.md: campo "passos.1.titulo": o passo "Apresentação" já está no infográfico',
				]),
			);
		});

		it("quando há texto embaixo do cabeçalho", () => {
			expect(() =>
				ler(`${infograficoMd}\nUm texto que não aparece na página.\n`),
			).toThrow(
				new ErroDeConteudo([
					"conteudo/trilhas/processo-legislativo/infografico.md: o infográfico é só o cabeçalho, e o texto embaixo dele não aparece na página",
				]),
			);
		});

		it("quando a pasta só tem o infográfico, sem o trilha.md", () => {
			expect(() =>
				lerTrilhas({ [`${pasta}/infografico.md`]: infograficoMd }),
			).toThrow(/processo-legislativo: falta o trilha\.md/);
		});
	});
});

const quizMd = `---
depoisDe: segundo
perguntas:
  - artigo: primeiro
    enunciado: Quem pode propor uma lei?
    opcoes:
      - texto: Só os deputados.
      - texto: Os deputados, os senadores, o presidente e os cidadãos, entre outros.
        certa: true
      - texto: Só o presidente da República.
    explicacao: "A Constituição lista quem pode propor: deputados, senadores, o presidente e os cidadãos, entre outros."
    fontes:
      - titulo: Constituição Federal, art. 61
        url: https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art61
        consultadoEm: 2026-11-12
  - artigo: segundo
    enunciado: Por onde começa um projeto de lei de um deputado?
    opcoes:
      - texto: Pela Câmara dos Deputados.
        certa: true
      - texto: Pelo Senado Federal.
    explicacao: Em regra, o projeto começa na Câmara dos Deputados.
    fontes:
      - titulo: Câmara dos Deputados, Entenda o processo legislativo
        url: https://www.camara.leg.br/entenda-o-processo-legislativo/
        consultadoEm: 2026-11-12
---
`;

const OPCAO_DO_SENADO = "      - texto: Pelo Senado Federal.\n";

describe("o quiz da trilha", () => {
	function ler(quiz: string) {
		return lerTrilhas({
			[`${pasta}/trilha.md`]: trilhaMd,
			[`${pasta}/primeiro.md`]: artigoMd({ ordem: "1" }),
			[`${pasta}/segundo.md`]: artigoMd({ ordem: "2" }),
			[`${pasta}/terceiro.md`]: artigoMd({ ordem: "3" }),
			[`${pasta}/quiz.md`]: quiz,
		});
	}

	function erro(problema: string) {
		return new ErroDeConteudo([
			`conteudo/trilhas/processo-legislativo/quiz.md: ${problema}`,
		]);
	}

	it("lê o quiz.md, com as perguntas e as opções na ordem do arquivo", () => {
		const [trilha] = ler(quizMd);

		expect(trilha.quiz).toEqual({
			depoisDe: "segundo",
			perguntas: [
				{
					artigo: "primeiro",
					enunciado: "Quem pode propor uma lei?",
					opcoes: [
						{ texto: "Só os deputados.", certa: false },
						{
							texto:
								"Os deputados, os senadores, o presidente e os cidadãos, entre outros.",
							certa: true,
						},
						{ texto: "Só o presidente da República.", certa: false },
					],
					explicacao:
						"A Constituição lista quem pode propor: deputados, senadores, o presidente e os cidadãos, entre outros.",
					fontes: [
						{
							titulo: "Constituição Federal, art. 61",
							url: "https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art61",
							consultadoEm: "2026-11-12",
						},
					],
				},
				{
					artigo: "segundo",
					enunciado: "Por onde começa um projeto de lei de um deputado?",
					opcoes: [
						{ texto: "Pela Câmara dos Deputados.", certa: true },
						{ texto: "Pelo Senado Federal.", certa: false },
					],
					explicacao: "Em regra, o projeto começa na Câmara dos Deputados.",
					fontes: [
						{
							titulo: "Câmara dos Deputados, Entenda o processo legislativo",
							url: "https://www.camara.leg.br/entenda-o-processo-legislativo/",
							consultadoEm: "2026-11-12",
						},
					],
				},
			],
		});
	});

	it("não vira um artigo da trilha", () => {
		const [trilha] = ler(quizMd);

		expect(trilha.artigos.map((artigo) => artigo.slug)).toEqual([
			"primeiro",
			"segundo",
			"terceiro",
		]);
	});

	it("é opcional: a trilha sem o arquivo nem leva o campo do quiz", () => {
		const [trilha] = lerTrilhas({
			[`${pasta}/trilha.md`]: trilhaMd,
			[`${pasta}/primeiro.md`]: artigoMd(),
		});

		expect(trilha).not.toHaveProperty("quiz");
	});

	it("aceita uma pergunta sobre o próprio artigo do depoisDe", () => {
		const [trilha] = ler(quizMd);

		expect(trilha.quiz?.perguntas[1].artigo).toBe(trilha.quiz?.depoisDe);
	});

	describe("avisa o erro com o nome do arquivo", () => {
		it("quando nenhuma opção é a certa", () => {
			expect(() => ler(quizMd.replace("        certa: true\n", ""))).toThrow(
				erro(
					'campo "perguntas.0.opcoes": precisa de exatamente uma opção com "certa: true", e tem 0',
				),
			);
		});

		it("quando mais de uma opção é a certa", () => {
			expect(() =>
				ler(
					quizMd.replace(
						OPCAO_DO_SENADO,
						`${OPCAO_DO_SENADO}        certa: true\n`,
					),
				),
			).toThrow(
				erro(
					'campo "perguntas.1.opcoes": precisa de exatamente uma opção com "certa: true", e tem 2',
				),
			);
		});

		it("quando a pergunta tem uma opção só", () => {
			expect(() => ler(quizMd.replace(OPCAO_DO_SENADO, ""))).toThrow(
				erro('campo "perguntas.1.opcoes": precisa de pelo menos 2 opções'),
			);
		});

		it("quando a pergunta tem mais de 5 opções", () => {
			const mais = [
				"Pelo Supremo Tribunal Federal.",
				"Pelo Tribunal de Contas da União.",
				"Pela Presidência da República.",
				"Por uma assembleia estadual.",
			]
				.map((texto) => `      - texto: ${texto}\n`)
				.join("");
			expect(() =>
				ler(quizMd.replace(OPCAO_DO_SENADO, `${OPCAO_DO_SENADO}${mais}`)),
			).toThrow(
				erro('campo "perguntas.1.opcoes": pode ter no máximo 5 opções'),
			);
		});

		it("quando a pergunta repete uma opção", () => {
			expect(() =>
				ler(quizMd.replace(OPCAO_DO_SENADO, OPCAO_DO_SENADO.repeat(2))),
			).toThrow(
				erro(
					'campo "perguntas.1.opcoes.2.texto": a opção "Pelo Senado Federal." já está nesta pergunta',
				),
			);
		});

		it("quando a certa não é true nem false", () => {
			expect(() =>
				ler(quizMd.replace("        certa: true\n", "        certa: sim\n")),
			).toThrow(
				erro('campo "perguntas.0.opcoes.1.certa": precisa ser true ou false'),
			);
		});

		it("em português, quando uma opção é um texto solto, sem o campo texto", () => {
			expect(() =>
				ler(quizMd.replace(OPCAO_DO_SENADO, "      - Pelo Senado Federal.\n")),
			).toThrow(
				erro(
					'campo "perguntas.1.opcoes.1": precisa ser uma opção com o campo texto',
				),
			);
		});

		it("em português, quando uma pergunta é um texto solto, sem os campos", () => {
			const perguntaEmTexto = quizMd.replace(
				/ {2}- artigo: segundo[\s\S]*?(?=---)/,
				"  - Por onde começa um projeto de lei de um deputado?\n",
			);
			expect(() => ler(perguntaEmTexto)).toThrow(
				erro(
					'campo "perguntas.1": precisa ser uma pergunta com os campos artigo, enunciado, opcoes, explicacao e fontes',
				),
			);
		});

		it("quando falta a explicação", () => {
			expect(() =>
				ler(
					quizMd.replace(
						"    explicacao: Em regra, o projeto começa na Câmara dos Deputados.\n",
						"",
					),
				),
			).toThrow(erro('campo "perguntas.1.explicacao": falta este campo'));
		});

		it("quando a pergunta não tem fonte", () => {
			const semFonte = quizMd.replace(
				/ {4}fontes:\n {6}- titulo: Câmara[^\n]*\n.*\n.*\n/,
				"",
			);
			expect(() => ler(semFonte)).toThrow(
				erro('campo "perguntas.1.fontes": falta este campo'),
			);
		});

		it("quando a fonte não é um site oficial", () => {
			expect(() =>
				ler(
					quizMd.replace(
						"https://www.camara.leg.br/entenda-o-processo-legislativo/",
						"https://exemplo.com/processo-legislativo",
					),
				),
			).toThrow(
				erro(
					'campo "perguntas.1.fontes.0.url": precisa ser um link https de um site oficial (gov.br, leg.br, jus.br, mp.br ou def.br)',
				),
			);
		});

		it("quando a pergunta repete o link de uma fonte", () => {
			const fonte = `      - titulo: Câmara dos Deputados, Entenda o processo legislativo
        url: https://www.camara.leg.br/entenda-o-processo-legislativo/
        consultadoEm: 2026-11-12
`;
			expect(() => ler(quizMd.replace(fonte, fonte.repeat(2)))).toThrow(
				erro(
					'campo "perguntas.1.fontes.1.url": a fonte "https://www.camara.leg.br/entenda-o-processo-legislativo/" já está nesta pergunta',
				),
			);
		});

		it("quando a pergunta aponta um artigo que não existe na trilha", () => {
			expect(() =>
				ler(quizMd.replace("  - artigo: primeiro", "  - artigo: nao-existe")),
			).toThrow(
				erro(
					'campo "perguntas.0.artigo": o artigo "nao-existe" não existe nesta trilha',
				),
			);
		});

		it("quando a pergunta é de um artigo que vem depois do quiz", () => {
			expect(() =>
				ler(quizMd.replace("  - artigo: segundo", "  - artigo: terceiro")),
			).toThrow(
				erro(
					'campo "perguntas.1.artigo": o artigo "terceiro" vem depois de "segundo", e o quiz aparece antes de a pessoa ler esse artigo',
				),
			);
		});

		it("quando o depoisDe aponta um artigo que não existe na trilha", () => {
			expect(() =>
				ler(quizMd.replace("depoisDe: segundo", "depoisDe: nao-existe")),
			).toThrow(
				erro('campo "depoisDe": o artigo "nao-existe" não existe nesta trilha'),
			);
		});

		it("quando duas perguntas têm o mesmo enunciado", () => {
			expect(() =>
				ler(
					quizMd.replace(
						"Por onde começa um projeto de lei de um deputado?",
						"Quem pode propor uma lei?",
					),
				),
			).toThrow(
				erro(
					'campo "perguntas.1.enunciado": a pergunta "Quem pode propor uma lei?" já está no quiz',
				),
			);
		});

		it("quando o quiz não tem perguntas", () => {
			const semPerguntas = quizMd.replace(/perguntas:[\s\S]*?(?=---)/, "");
			expect(() => ler(semPerguntas)).toThrow(
				erro('campo "perguntas": falta este campo'),
			);
		});

		it("quando um campo tem outro nome", () => {
			expect(() =>
				ler(quizMd.replace("    explicacao: Em", "    dica: Em")),
			).toThrow(/quiz\.md: campo desconhecido "perguntas\.1\.dica"/);
		});

		it("quando há texto embaixo do cabeçalho", () => {
			expect(() =>
				ler(`${quizMd}\nUm texto que não aparece na página.\n`),
			).toThrow(
				erro(
					"o quiz é só o cabeçalho, e o texto embaixo dele não aparece na página",
				),
			);
		});

		it("quando a pasta só tem o quiz, sem o trilha.md", () => {
			expect(() => lerTrilhas({ [`${pasta}/quiz.md`]: quizMd })).toThrow(
				/processo-legislativo: falta o trilha\.md/,
			);
		});
	});
});
