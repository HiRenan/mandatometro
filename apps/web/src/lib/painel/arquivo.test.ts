import { describe, expect, it } from "vitest";
import type { ArquivoRevisao } from "@/client";
import {
	avisosNoRascunhoNovo,
	type Campos,
	camposDoArquivo,
	corpoDaRevisao,
	emLista,
	faltaNaEdicao,
	faltaNoItem,
	frasesDoQueFalta,
	juntarAoRascunhoAtual,
	lerItem,
	lugarDaMensagem,
	oQueFalta,
	prontaParaPublicar,
	revisaoAlterada,
} from "./arquivo";
import { rascunhoDeExemplo, rascunhoPronto } from "./exemplos-de-teste";

/** Os campos do rascunho com uma mudança feita por `mudar`. */
function editar(
	arquivo: ArquivoRevisao,
	mudar: (campos: Campos) => void,
): Campos {
	const campos = camposDoArquivo(arquivo);
	mudar(campos);
	return campos;
}

describe("a leitura de cada item", () => {
	it("tira da votação a proposição, a descrição oficial, o quadro e o link do leitor", () => {
		const [revisada, semTexto] = rascunhoDeExemplo().itens.map(lerItem);
		expect(revisada).toMatchObject({
			tipo: "votacao",
			chave: "votacao:21",
			proposicoes: [
				{
					sigla: "PL 1234/2026",
					ementa: "Cria a Semana das Bibliotecas Escolares.",
				},
			],
			votacoes: [
				{
					data: "2026-11-11",
					resultado: "aprovada",
					placar: {
						sim: 312,
						nao: 98,
						abstencao: 4,
						obstrucao: 0,
						presidente: 1,
					},
					casa: "camara",
					descricao: "Aprovado o projeto, com emenda de redação.",
				},
			],
			publicacao: null,
			pendencias: ["cobertura"],
			retido: false,
			motivo: null,
		});
		// O link é a página oficial, como na edição publicada.
		expect(revisada.fontes.map((fonte) => fonte.url)).toEqual([
			"https://www.camara.leg.br/votacoes/exemplo-1",
		]);
		// Sem a página oficial, a votação leva ao endereço coletado.
		expect(semTexto.fontes.map((fonte) => fonte.url)).toEqual([
			"https://legis.senado.leg.br/dadosabertos/votacao/exemplo-2",
		]);
		expect(semTexto.votacoes).toEqual([
			{
				data: "2026-11-12",
				resultado: "outro",
				placar: null,
				casa: "senado",
				descricao: "Votação do requerimento de urgência.",
			},
		]);
		expect(semTexto.pendencias).toEqual(["redacao", "revisao", "cobertura"]);
		expect(semTexto.avisos).toHaveLength(1);
	});

	it("tira do ato a data da publicação e a retenção, sem repetir o aviso dela", () => {
		const [, , retido, comum] = rascunhoDeExemplo().itens.map(lerItem);
		expect(retido).toMatchObject({
			tipo: "ato",
			chave: "ato:41",
			proposicoes: [],
			votacoes: [],
			publicacao: "2026-11-12",
			retido: true,
			motivo: "ato_de_pessoal",
			avisos: [],
		});
		expect(comum).toMatchObject({
			chave: "ato:42",
			retido: false,
			motivo: null,
		});
	});

	it("deixa sem link o ato sem a página oficial", () => {
		const arquivo = rascunhoDeExemplo();
		const ato = arquivo.itens[3];
		ato.fontes = [{ ...ato.fontes[0], url_publica: null }];
		expect(lerItem(ato).fontes[0].url).toBe("");
	});
});

describe("o corpo do salvar", () => {
	it("devolve os campos de consulta como vieram e troca só os editados", () => {
		const arquivo = rascunhoDeExemplo();
		const original = structuredClone(arquivo);
		const campos = editar(arquivo, (campos) => {
			campos.edicao.titulo = "Jornal da semana das bibliotecas";
			campos.edicao.cobertura = true;
			campos.itens[1].explicacao =
				"O Senado aprovou a urgência.\n\n\n   O projeto volta à pauta.  \n \n";
			campos.itens[1].revisado = true;
			campos.itens[2].privacidade = true;
			campos.itens[3].artigo = "";
		});
		const corpo = corpoDaRevisao(arquivo, campos);

		expect(arquivo).toEqual(original);
		const { titulo, cobertura_confirmada, itens, ...consulta } = corpo;
		const {
			titulo: _t,
			cobertura_confirmada: _c,
			itens: _i,
			...deAntes
		} = original;
		expect(consulta).toEqual(deAntes);
		expect(titulo).toBe("Jornal da semana das bibliotecas");
		expect(cobertura_confirmada).toBe(true);
		itens.forEach((item, posicao) => {
			const antes = original.itens[posicao];
			expect(item.id).toBe(antes.id);
			expect(item.fatos).toEqual(antes.fatos);
			expect(item.fontes).toEqual(antes.fontes);
			expect(item.contexto).toEqual(antes.contexto);
		});
		expect(itens[1].explicacao).toEqual([
			"O Senado aprovou a urgência.",
			"O projeto volta à pauta.",
		]);
		expect(itens[1].revisado).toBe(true);
		// A privacidade só vai no ato retido, o único que tinha o campo.
		expect(itens.map((item) => "privacidade_confirmada" in item)).toEqual([
			false,
			false,
			true,
			false,
		]);
		expect(itens[2].privacidade_confirmada).toBe(true);
		expect(itens[3].artigo_caminho).toBeNull();
	});

	it("devolve o texto que a pessoa não mudou exatamente como veio", () => {
		const arquivo = rascunhoDeExemplo();
		// Um parágrafo com espaço nas pontas: os campos mostram o texto junto, e
		// o corpo não o reescreve se ele não mudou.
		arquivo.itens[0].explicacao = ["  Primeiro.", "Segundo.  "];
		const corpo = corpoDaRevisao(arquivo, camposDoArquivo(arquivo));
		expect(corpo.itens[0].explicacao).toEqual(["  Primeiro.", "Segundo.  "]);
		expect(corpo).toEqual(arquivo);
	});

	it("manda o item que sai com os textos do arquivo e o motivo sem espaços", () => {
		const arquivo = rascunhoDeExemplo();
		const campos = editar(arquivo, (campos) => {
			campos.itens[1].titulo = "";
			campos.itens[1].explicacao = "";
			campos.itens[1].excluir = true;
			campos.itens[1].motivo = "  Fala de uma pessoa.  ";
			// O motivo escrito num item que fica não vai.
			campos.itens[0].motivo = "Rascunho de motivo";
		});
		const corpo = corpoDaRevisao(arquivo, campos);
		expect(corpo.itens[1]).toMatchObject({
			titulo: arquivo.itens[1].titulo,
			explicacao: arquivo.itens[1].explicacao,
			excluir: true,
			motivo_exclusao: "Fala de uma pessoa.",
		});
		expect(corpo.itens[0].motivo_exclusao).toBe("");
	});
});

describe("o que a revisão mudou", () => {
	it("conta a mudança e esquece a que foi desfeita", () => {
		const arquivo = rascunhoDeExemplo();
		expect(revisaoAlterada(arquivo, camposDoArquivo(arquivo))).toBe(false);
		const campos = editar(arquivo, (campos) => {
			campos.itens[2].revisado = true;
		});
		expect(revisaoAlterada(arquivo, campos)).toBe(true);
		campos.itens[2].revisado = false;
		expect(revisaoAlterada(arquivo, campos)).toBe(false);
		campos.edicao.cobertura = true;
		expect(revisaoAlterada(arquivo, campos)).toBe(true);
	});
});

describe("as conferências antes de enviar", () => {
	const [revisada, , retido] = rascunhoDeExemplo().itens.map(lerItem);
	const campos = () => camposDoArquivo(rascunhoDeExemplo()).itens;

	it("pedem o motivo do item que sai, e mais nada dele", () => {
		const [item] = campos();
		item.excluir = true;
		item.titulo = "";
		expect(faltaNoItem(item, revisada)?.mensagem).toBe(
			"Escreva o motivo para tirar este item da edição.",
		);
		item.motivo = "Repetido.";
		expect(faltaNoItem(item, revisada)).toBeUndefined();
	});

	it("pedem o título, a explicação e no máximo 12 parágrafos", () => {
		const [item] = campos();
		expect(faltaNoItem(item, revisada)).toBeUndefined();
		item.titulo = "   ";
		expect(faltaNoItem(item, revisada)?.mensagem).toBe(
			"Escreva o título do item.",
		);
		item.titulo = "Título";
		item.explicacao = " \n\n \n";
		expect(faltaNoItem(item, revisada)?.mensagem).toBe(
			"Escreva a explicação do item.",
		);
		item.explicacao = Array.from({ length: 12 }, (_, n) => `P${n}.`).join(
			"\n\n",
		);
		expect(faltaNoItem(item, revisada)).toBeUndefined();
		item.explicacao += "\n\nP12.";
		expect(faltaNoItem(item, revisada)?.mensagem).toBe(
			"A explicação tem 13 parágrafos. Junte alguns: o limite é 12.",
		);
	});

	it("pedem a decisão sobre o ato retido", () => {
		const [, , item] = campos();
		expect(faltaNoItem(item, retido)?.mensagem).toBe(
			"Confira a privacidade do ato: marque que ele fica na edição ou tire o item.",
		);
		item.privacidade = true;
		expect(faltaNoItem(item, retido)).toBeUndefined();
	});

	it("pedem o título da edição", () => {
		expect(faltaNaEdicao({ titulo: " ", cobertura: true })).toBe(
			"Escreva o título da edição.",
		);
		expect(
			faltaNaEdicao({ titulo: "Jornal", cobertura: false }),
		).toBeUndefined();
	});
});

describe("o lugar das mensagens da API", () => {
	it("liga o item pela posição, a edição pelo título e o resto ao pé", () => {
		expect(lugarDaMensagem("Item 3: confira o campo título.")).toEqual({
			onde: "item",
			posicao: 3,
		});
		expect(
			lugarDaMensagem(
				"Item 12 (ato_de_pessoal). Marque privacidade_confirmada ou use excluir com motivo_exclusao.",
			),
		).toEqual({ onde: "item", posicao: 12 });
		expect(
			lugarDaMensagem(
				"Confira o item 2: o texto pode citar parlamentar ou partido.",
			),
		).toEqual({ onde: "item", posicao: 2 });
		expect(
			lugarDaMensagem("Edição: o título precisa ficar em uma linha."),
		).toEqual({ onde: "edicao" });
		expect(
			lugarDaMensagem(
				"Confira o título da edição: o texto pode citar parlamentar ou partido.",
			),
		).toEqual({ onde: "edicao" });
		expect(lugarDaMensagem("Mantenha ao menos um item na edição.")).toEqual({
			onde: "pe",
		});
		expect(lugarDaMensagem("Item 3a: outra coisa.")).toEqual({ onde: "pe" });
	});

	it("leva o aviso do salvar ao item certo quando um item antes dele saiu", () => {
		const enviado = rascunhoDeExemplo();
		// O salvar tirou o item 2, e os outros ganharam ids novos.
		const novo: ArquivoRevisao = {
			...enviado,
			itens: [enviado.itens[0], enviado.itens[2], enviado.itens[3]].map(
				(item, indice) => ({ ...item, id: 200 + indice }),
			),
		};
		const noLugar = avisosNoRascunhoNovo(
			[
				"Confira o item 4: o texto pode citar parlamentar ou partido.",
				"Item 3 (ato_de_pessoal). Confira a privacidade do ato. Exclua o item com motivo ou confirme que ele fica.",
				"Confira o título da edição: o texto pode citar parlamentar ou partido.",
				"Confira o item 9: um item que não existe.",
			],
			enviado,
			novo,
		);
		expect([...noLugar.itens]).toEqual([
			[3, ["Confira o item 4: o texto pode citar parlamentar ou partido."]],
		]);
		expect(noLugar.edicao).toEqual([
			"Confira o título da edição: o texto pode citar parlamentar ou partido.",
		]);
		expect(noLugar.pe).toEqual(["Confira o item 9: um item que não existe."]);
	});
});

describe("o rascunho que mudou durante a revisão (409)", () => {
	it("passa só o que a pessoa mudou para o rascunho atual, item por item", () => {
		const antes = rascunhoDeExemplo();
		const campos = editar(antes, (campos) => {
			campos.edicao.titulo = "Meu título";
			campos.itens[0].titulo = "Meu título do item";
			campos.itens[3].revisado = true;
		});
		// Outra gravação tirou o item 2, mudou a explicação do item 1, confirmou
		// a cobertura e recriou os itens com ids novos.
		const atual: ArquivoRevisao = {
			...antes,
			versao_rascunho: "e".repeat(64),
			cobertura_confirmada: true,
			itens: [antes.itens[0], antes.itens[2], antes.itens[3]].map(
				(item, indice) => ({ ...item, id: 300 + indice }),
			),
		};
		atual.itens[0] = {
			...atual.itens[0],
			explicacao: ["Texto da outra gravação."],
		};

		const junto = juntarAoRascunhoAtual(antes, campos, atual);
		expect(junto.edicao).toEqual({ titulo: "Meu título", cobertura: true });
		expect(junto.itens).toHaveLength(3);
		expect(junto.itens[0]).toMatchObject({
			titulo: "Meu título do item",
			explicacao: "Texto da outra gravação.",
		});
		expect(junto.itens[1]).toEqual(camposDoArquivo(atual).itens[1]);
		expect(junto.itens[2].revisado).toBe(true);
	});
});

describe("o que falta para publicar", () => {
	it("conta o que está gravado e diz em palavras", () => {
		const arquivo = rascunhoDeExemplo();
		const falta = oQueFalta(arquivo, arquivo.itens.map(lerItem));
		expect(falta).toEqual({
			redacao: 1,
			revisao: 3,
			artigo: 0,
			privacidade: 1,
			cobertura: true,
		});
		expect(prontaParaPublicar(falta, false)).toBe(false);
		expect(emLista(frasesDoQueFalta(falta))).toBe(
			"escrever a explicação de 1 item, confirmar a revisão de 3 itens, conferir a privacidade de 1 ato e confirmar a cobertura da semana",
		);
	});

	it("libera a edição pronta, sem nada por salvar", () => {
		const arquivo = rascunhoPronto();
		const falta = oQueFalta(arquivo, arquivo.itens.map(lerItem));
		expect(frasesDoQueFalta(falta)).toEqual([]);
		expect(prontaParaPublicar(falta, false)).toBe(true);
		expect(prontaParaPublicar(falta, true)).toBe(false);
	});

	it("não libera a cobertura confirmada enquanto um item ainda a pede", () => {
		const arquivo = rascunhoPronto();
		arquivo.itens[1].fatos = {
			...arquivo.itens[1].fatos,
			pendencias: ["cobertura"],
		};
		const falta = oQueFalta(arquivo, arquivo.itens.map(lerItem));
		expect(falta.cobertura).toBe(true);
		expect(prontaParaPublicar(falta, false)).toBe(false);
	});

	it("junta as partes como em português", () => {
		expect(emLista([])).toBe("");
		expect(emLista(["a"])).toBe("a");
		expect(emLista(["a", "b"])).toBe("a e b");
		expect(emLista(["a", "b", "c"])).toBe("a, b e c");
	});
});
