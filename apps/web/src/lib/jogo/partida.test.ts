import { describe, expect, it } from "vitest";
import {
	acharJogo,
	JOGO_DAS_COMISSOES,
	type JogoNaPagina,
	jogos,
} from "./paginas.server";
import {
	avancar,
	caminho,
	comecar,
	decisoesDoJogo,
	escolhaDa,
	escolher,
	type Partida,
	passoAtual,
	regrasDoCaminho,
	retratoDaVez,
} from "./partida";

// A partida roda no roteiro de verdade: o que o jogo conta e o que a tela
// final mostra saem daqui, sem total e sem nota.

function lerOJogo(): JogoNaPagina {
	const jogo = acharJogo(jogos, JOGO_DAS_COMISSOES);
	if (!jogo) {
		throw new Error("o roteiro do Jogo das Comissões não foi lido");
	}
	return jogo;
}

const jogo = lerOJogo();

/** Joga até o fim, escolhendo por uma regra de teste em cada decisão. */
function jogarTudo(escolhe: (opcoes: string[], id: string) => string): Partida {
	let partida = avancar(jogo, comecar());
	for (let volta = 0; volta < 500; volta += 1) {
		if (partida.fase === "fim") {
			return partida;
		}
		const passo = passoAtual(jogo, partida);
		if (
			passo?.tipo === "decisao" &&
			escolhaDa(partida, passo.id) === undefined
		) {
			partida = escolher(
				jogo,
				partida,
				escolhe(
					passo.opcoes.map((opcao) => opcao.texto),
					passo.id,
				),
			);
			continue;
		}
		partida = avancar(jogo, partida);
	}
	throw new Error("a partida não chegou ao fim");
}

describe("partida", () => {
	it("começa na abertura e entra na primeira cena", () => {
		const inicio = comecar();
		expect(inicio).toEqual({
			fase: "abertura",
			cena: 0,
			passo: 0,
			escolhas: [],
		});
		expect(passoAtual(jogo, inicio)).toBeUndefined();

		const primeira = avancar(jogo, inicio);
		expect(primeira.fase).toBe("cena");
		expect(passoAtual(jogo, primeira)).toMatchObject({
			tipo: "fala",
			id: "c1-01",
		});
	});

	it("não passa de uma decisão sem escolha", () => {
		let partida = avancar(jogo, comecar());
		while (passoAtual(jogo, partida)?.tipo !== "decisao") {
			partida = avancar(jogo, partida);
		}

		expect(avancar(jogo, partida)).toBe(partida);

		const decisao = passoAtual(jogo, partida);
		if (decisao?.tipo !== "decisao") {
			expect.unreachable("a parada precisa ser numa decisão");
		}
		const escolhida = escolher(jogo, partida, decisao.opcoes[0].texto);
		expect(escolhaDa(escolhida, decisao.id)?.opcao).toBe(
			decisao.opcoes[0].texto,
		);
		expect(avancar(jogo, escolhida)).not.toBe(escolhida);
	});

	it("guarda a primeira escolha e ignora a segunda, e recusa opção de fora", () => {
		let partida = avancar(jogo, comecar());
		while (passoAtual(jogo, partida)?.tipo !== "decisao") {
			partida = avancar(jogo, partida);
		}
		const decisao = passoAtual(jogo, partida);
		if (decisao?.tipo !== "decisao") {
			expect.unreachable("a parada precisa ser numa decisão");
		}

		const comPrimeira = escolher(jogo, partida, decisao.opcoes[0].texto);
		const comSegunda = escolher(jogo, comPrimeira, decisao.opcoes[1].texto);
		expect(comSegunda).toBe(comPrimeira);
		expect(comSegunda.escolhas).toHaveLength(1);
		expect(escolher(jogo, partida, "uma opção que não existe")).toBe(partida);
	});

	it("passa pela revelação de cada cena e chega ao fim", () => {
		const fases: string[] = [];
		let partida = avancar(jogo, comecar());
		for (let volta = 0; volta < 500 && partida.fase !== "fim"; volta += 1) {
			const passo = passoAtual(jogo, partida);
			if (
				passo?.tipo === "decisao" &&
				escolhaDa(partida, passo.id) === undefined
			) {
				partida = escolher(jogo, partida, passo.opcoes[0].texto);
				continue;
			}
			const antes = partida.fase;
			partida = avancar(jogo, partida);
			if (antes !== partida.fase) {
				fases.push(partida.fase);
			}
		}

		expect(partida.fase).toBe("fim");
		expect(fases.filter((fase) => fase === "revelacao")).toHaveLength(
			jogo.cenas.length,
		);
	});

	it("marca a decisão de regra conforme a escolha, sem somar nada", () => {
		const porRegimento = jogarTudo((opcoes, id) => {
			const decisao = decisoesDoJogo(jogo).find((uma) => uma.id === id);
			if (decisao?.natureza !== "regra") {
				return opcoes[0];
			}
			return (
				decisao.opcoes.find((opcao) => opcao.resultado === "certa")?.texto ??
				opcoes[0]
			);
		});
		const regras = regrasDoCaminho(jogo, porRegimento);

		expect(regras).toHaveLength(6);
		expect(regras.every((regra) => regra.comoNoRegimento)).toBe(true);
		expect(regras[0]).toMatchObject({
			id: "1.1",
			resumo: "Desarquivamento a pedido",
			fundamento: "art. 105 do Regimento da Câmara",
			escolhida: "O autor pede o desarquivamento",
			comoNoRegimento: true,
		});

		const porFora = jogarTudo((opcoes, id) => {
			const decisao = decisoesDoJogo(jogo).find((uma) => uma.id === id);
			if (decisao?.natureza !== "regra") {
				return opcoes[0];
			}
			return (
				decisao.opcoes.find((opcao) => opcao.resultado === "errada")?.texto ??
				opcoes[0]
			);
		});
		const erradas = regrasDoCaminho(jogo, porFora);

		expect(erradas.every((regra) => !regra.comoNoRegimento)).toBe(true);
		expect(erradas[0].doRegimento).toBe("O autor pede o desarquivamento");
	});

	it("mantém na cena o retrato de quem falou por último, e a narração deixa sem retrato", () => {
		let partida = avancar(jogo, comecar());
		// A cena 1 começa na narração, e o retrato só entra com a Lia.
		expect(retratoDaVez(jogo, partida)).toBeUndefined();
		partida = avancar(jogo, partida);
		expect(retratoDaVez(jogo, partida)).toBe("lia-confiante");

		// Na decisão, o retrato é o de quem falou antes dela.
		while (passoAtual(jogo, partida)?.tipo !== "decisao") {
			partida = avancar(jogo, partida);
		}
		expect(retratoDaVez(jogo, partida)).toBe("lia-preocupada");
		expect(
			retratoDaVez(jogo, { ...partida, fase: "revelacao" }),
		).toBeUndefined();
	});

	it("deixa a decisão de regra sem escolha quando a partida não chegou nela", () => {
		const regras = regrasDoCaminho(jogo, comecar());

		expect(regras.every((regra) => regra.escolhida === undefined)).toBe(true);
		expect(regras.every((regra) => !regra.comoNoRegimento)).toBe(true);
	});

	it("anda pelas casas do caminho, e no fim todas ficam atrás", () => {
		expect(caminho(jogo, comecar()).map((casa) => casa.estado)).toEqual(
			jogo.casas.map(() => "adiante"),
		);

		const naPrimeira = caminho(jogo, avancar(jogo, comecar()));
		expect(naPrimeira[0]).toEqual({ nome: jogo.casas[0], estado: "agora" });
		expect(naPrimeira.slice(1).every((casa) => casa.estado === "adiante")).toBe(
			true,
		);

		const fim = jogarTudo((opcoes) => opcoes[0]);
		expect(caminho(jogo, fim).every((casa) => casa.estado === "atras")).toBe(
			true,
		);
	});
});
