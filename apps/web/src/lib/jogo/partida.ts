import type { Decisao, Passo } from "./ler";
import type { JogoNaPagina } from "./paginas.server";

// O andamento de uma partida, em funções puras. A tela fica em
// components/jogo/jogo.tsx, e nada daqui vai para o armazenamento do
// navegador: a partida vive na memória da página, e o jogo não guarda o que a
// pessoa escolheu (docs/jogo-das-comissoes.md).
//
// Não há total de acertos nem nota em lugar nenhum: a tela final mostra o
// caminho percorrido e cada decisão de regra em palavras (DESIGN.md).

/** O que a pessoa escolheu numa decisão. */
export type Escolha = {
	decisao: string;
	opcao: string;
	/** Só na decisão de regra: se a escolha foi a do regimento. */
	comoNoRegimento?: boolean;
};

export type Fase = "abertura" | "cena" | "revelacao" | "fim";

export type Partida = {
	fase: Fase;
	/** O índice da cena na lista do roteiro. */
	cena: number;
	/** O índice do passo dentro da cena. */
	passo: number;
	escolhas: Escolha[];
};

export function comecar(): Partida {
	return { fase: "abertura", cena: 0, passo: 0, escolhas: [] };
}

function cenaDa(jogo: JogoNaPagina, partida: Partida) {
	return jogo.cenas[partida.cena];
}

/** O passo da vez, quando a partida está numa cena. */
export function passoAtual(
	jogo: JogoNaPagina,
	partida: Partida,
): Passo | undefined {
	if (partida.fase !== "cena") {
		return undefined;
	}
	return cenaDa(jogo, partida)?.passos[partida.passo];
}

/** A escolha de uma decisão, se a pessoa já escolheu. */
export function escolhaDa(
	partida: Partida,
	decisao: string,
): Escolha | undefined {
	return partida.escolhas.find((escolha) => escolha.decisao === decisao);
}

function decisaoPendente(jogo: JogoNaPagina, partida: Partida): boolean {
	const passo = passoAtual(jogo, partida);
	return (
		passo?.tipo === "decisao" && escolhaDa(partida, passo.id) === undefined
	);
}

/**
 * O passo seguinte. Numa decisão sem escolha, a partida fica onde está: quem
 * avança é a escolha. No fim da cena vem a revelação e, depois dela, a cena
 * seguinte ou o fim do jogo.
 */
export function avancar(jogo: JogoNaPagina, partida: Partida): Partida {
	if (partida.fase === "abertura") {
		return { ...partida, fase: "cena", cena: 0, passo: 0 };
	}
	if (partida.fase === "cena") {
		if (decisaoPendente(jogo, partida)) {
			return partida;
		}
		const cena = cenaDa(jogo, partida);
		if (partida.passo + 1 < (cena?.passos.length ?? 0)) {
			return { ...partida, passo: partida.passo + 1 };
		}
		return { ...partida, fase: "revelacao" };
	}
	if (partida.fase === "revelacao") {
		if (partida.cena + 1 < jogo.cenas.length) {
			return { ...partida, fase: "cena", cena: partida.cena + 1, passo: 0 };
		}
		return { ...partida, fase: "fim" };
	}
	return partida;
}

/**
 * Guarda a escolha da decisão da vez. A segunda escolha na mesma decisão não
 * muda nada: vale a primeira, como no quiz da trilha.
 */
export function escolher(
	jogo: JogoNaPagina,
	partida: Partida,
	opcao: string,
): Partida {
	const passo = passoAtual(jogo, partida);
	if (passo?.tipo !== "decisao") {
		return partida;
	}
	if (escolhaDa(partida, passo.id) !== undefined) {
		return partida;
	}
	const escolhida = passo.opcoes.find((uma) => uma.texto === opcao);
	if (!escolhida) {
		return partida;
	}
	const escolha: Escolha =
		passo.natureza === "regra" && "resultado" in escolhida
			? {
					decisao: passo.id,
					opcao,
					comoNoRegimento: escolhida.resultado === "certa",
				}
			: { decisao: passo.id, opcao };
	return { ...partida, escolhas: [...partida.escolhas, escolha] };
}

/**
 * O retrato que fica na cena: o de quem falou por último, que continua na
 * decisão, no painel, no prazo e no carimbo. A narração deixa a cena sem
 * retrato, como no roteiro, e cada cena começa do zero.
 */
export function retratoDaVez(
	jogo: JogoNaPagina,
	partida: Partida,
): string | undefined {
	if (partida.fase !== "cena") {
		return undefined;
	}
	const passos = cenaDa(jogo, partida)?.passos ?? [];
	for (let indice = partida.passo; indice >= 0; indice -= 1) {
		const passo = passos[indice];
		if (passo?.tipo !== "fala") {
			continue;
		}
		if (passo.quem === "narracao" || passo.expressao === undefined) {
			return undefined;
		}
		return `${passo.quem}-${passo.expressao}`;
	}
	return undefined;
}

/** Todas as decisões do roteiro, na ordem das cenas. */
export function decisoesDoJogo(jogo: JogoNaPagina): Decisao[] {
	return jogo.cenas.flatMap((cena) =>
		cena.passos.filter((passo): passo is Decisao => passo.tipo === "decisao"),
	);
}

/** Uma decisão de regra na tela final, com o que a pessoa escolheu. */
export type DecisaoNoCaminho = {
	id: string;
	resumo: string;
	fundamento: string;
	/** O texto da opção escolhida, quando a pessoa passou por ela. */
	escolhida?: string;
	/** A opção do regimento, para quando a escolha foi outra. */
	doRegimento: string;
	comoNoRegimento: boolean;
};

/**
 * As decisões de regra para a tela final, em palavras: o que a decisão era, o
 * artigo e se a escolha foi a do regimento. Sem total e sem nota.
 */
export function regrasDoCaminho(
	jogo: JogoNaPagina,
	partida: Partida,
): DecisaoNoCaminho[] {
	return decisoesDoJogo(jogo)
		.filter((decisao) => decisao.natureza === "regra")
		.map((decisao) => {
			const escolha = escolhaDa(partida, decisao.id);
			return {
				id: decisao.id,
				resumo: decisao.resumo,
				fundamento: decisao.fundamento,
				...(escolha && { escolhida: escolha.opcao }),
				doRegimento:
					decisao.opcoes.find((opcao) => opcao.resultado === "certa")?.texto ??
					"",
				comoNoRegimento: escolha?.comoNoRegimento === true,
			};
		});
}

export type EstadoDaCasa = "atras" | "agora" | "adiante";

export type CasaNoCaminho = { nome: string; estado: EstadoDaCasa };

/**
 * O caminho do projeto nas casas do jogo.md, como no infográfico da trilha: a
 * casa da cena da vez fica em "agora", as anteriores em "atras". No fim do
 * jogo, todas ficam atrás.
 */
export function caminho(jogo: JogoNaPagina, partida: Partida): CasaNoCaminho[] {
	const casaDaCena = cenaDa(jogo, partida)?.casa;
	const agora =
		partida.fase === "abertura"
			? -1
			: partida.fase === "fim"
				? jogo.casas.length
				: jogo.casas.indexOf(casaDaCena ?? "");
	return jogo.casas.map((nome, indice) => ({
		nome,
		estado: indice === agora ? "agora" : indice < agora ? "atras" : "adiante",
	}));
}
