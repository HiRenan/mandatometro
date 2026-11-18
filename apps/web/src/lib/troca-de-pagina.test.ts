// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	cliqueDuranteATroca,
	foiTrocaPulada,
	molduraNaTela,
	rolagemDasPaginas,
	semErroNaTrocaPulada,
	sentidoDaTroca,
	tiposDaTroca,
	trilhaDaPaginaAberta,
} from "./troca-de-pagina";

const TRILHA = "/trilhas/processo-legislativo";
const trilhaAberta = {
	slug: "processo-legislativo",
	artigos: [
		{ slug: "quem-pode-propor-uma-lei" },
		{ slug: "onde-o-projeto-comeca" },
		{ slug: "o-projeto-passa-pelas-comissoes" },
	],
};

afterEach(() => {
	document.body.innerHTML = "";
});

/** A rolagem da página, que o jsdom não muda sozinho. */
function rolar(y: number) {
	Object.defineProperty(window, "scrollY", { configurable: true, value: y });
}

describe("sentidoDaTroca", () => {
	it("avança quando a página fica mais para dentro do bloco", () => {
		expect(sentidoDaTroca("/", "/trilhas")).toBe("avancar");
		expect(sentidoDaTroca("/trilhas", TRILHA)).toBe("avancar");
		expect(sentidoDaTroca(TRILHA, `${TRILHA}/onde-o-projeto-comeca`)).toBe(
			"avancar",
		);
		// "Começar a trilha", na página inicial.
		expect(sentidoDaTroca("/", `${TRILHA}/quem-pode-propor-uma-lei`)).toBe(
			"avancar",
		);
	});

	it("volta quando a página fica mais para fora do bloco", () => {
		expect(sentidoDaTroca(`${TRILHA}/onde-o-projeto-comeca`, TRILHA)).toBe(
			"voltar",
		);
		expect(sentidoDaTroca(`${TRILHA}/onde-o-projeto-comeca`, "/")).toBe(
			"voltar",
		);
		expect(sentidoDaTroca(TRILHA, "/trilhas")).toBe("voltar");
		expect(sentidoDaTroca("/trilhas/", "/")).toBe("voltar");
	});

	it("entre dois artigos da trilha, segue a ordem dela", () => {
		const de = `${TRILHA}/onde-o-projeto-comeca`;
		expect(
			sentidoDaTroca(
				de,
				`${TRILHA}/o-projeto-passa-pelas-comissoes`,
				trilhaAberta,
			),
		).toBe("avancar");
		expect(
			sentidoDaTroca(de, `${TRILHA}/quem-pode-propor-uma-lei`, trilhaAberta),
		).toBe("voltar");
	});

	it("sem a ordem da trilha, ou com um artigo que não está nela, avança", () => {
		const de = `${TRILHA}/onde-o-projeto-comeca`;
		const para = `${TRILHA}/quem-pode-propor-uma-lei`;
		expect(sentidoDaTroca(de, para)).toBe("avancar");
		expect(
			sentidoDaTroca(de, `${TRILHA}/artigo-que-nao-existe`, trilhaAberta),
		).toBe("avancar");
		expect(
			sentidoDaTroca(
				"/trilhas/tres-poderes/o-que-faz-o-executivo",
				"/trilhas/tres-poderes/o-que-faz-o-legislativo",
				trilhaAberta,
			),
		).toBe("avancar");
	});

	it("o quiz fica entre o artigo depois do qual aparece e o seguinte", () => {
		const comQuiz = { ...trilhaAberta, quizDepoisDe: "onde-o-projeto-comeca" };
		const quiz = `${TRILHA}/quiz`;
		// O "Artigo anterior" do quiz, e qualquer artigo de antes dele.
		expect(
			sentidoDaTroca(quiz, `${TRILHA}/onde-o-projeto-comeca`, comQuiz),
		).toBe("voltar");
		expect(
			sentidoDaTroca(quiz, `${TRILHA}/quem-pode-propor-uma-lei`, comQuiz),
		).toBe("voltar");
		// O "Próximo artigo" do quiz.
		expect(
			sentidoDaTroca(
				quiz,
				`${TRILHA}/o-projeto-passa-pelas-comissoes`,
				comQuiz,
			),
		).toBe("avancar");
		// A chamada do quiz, no fim do artigo, e o voltar do navegador num artigo
		// de depois dele.
		expect(
			sentidoDaTroca(`${TRILHA}/onde-o-projeto-comeca`, quiz, comQuiz),
		).toBe("avancar");
		expect(
			sentidoDaTroca(
				`${TRILHA}/o-projeto-passa-pelas-comissoes`,
				quiz,
				comQuiz,
			),
		).toBe("voltar");
	});

	it("sem o lugar do quiz na trilha, ir ao quiz ou sair dele para um artigo avança", () => {
		const quiz = `${TRILHA}/quiz`;
		expect(
			sentidoDaTroca(quiz, `${TRILHA}/onde-o-projeto-comeca`, trilhaAberta),
		).toBe("avancar");
		expect(
			sentidoDaTroca(`${TRILHA}/onde-o-projeto-comeca`, quiz, trilhaAberta),
		).toBe("avancar");
		expect(
			sentidoDaTroca(quiz, `${TRILHA}/onde-o-projeto-comeca`, {
				...trilhaAberta,
				quizDepoisDe: "artigo-que-nao-existe",
			}),
		).toBe("avancar");
	});

	it("o quiz final fica depois do último artigo e do quiz", () => {
		const comQuiz = { ...trilhaAberta, quizDepoisDe: "onde-o-projeto-comeca" };
		const quizFinal = `${TRILHA}/quiz-final`;
		const ultimo = `${TRILHA}/o-projeto-passa-pelas-comissoes`;
		// O "Artigo anterior" do quiz final é o último da trilha.
		expect(sentidoDaTroca(quizFinal, ultimo, trilhaAberta)).toBe("voltar");
		expect(
			sentidoDaTroca(quizFinal, `${TRILHA}/quem-pode-propor-uma-lei`, comQuiz),
		).toBe("voltar");
		expect(sentidoDaTroca(quizFinal, `${TRILHA}/quiz`, comQuiz)).toBe("voltar");
		// A chamada do quiz final, no fim do último artigo.
		expect(sentidoDaTroca(ultimo, quizFinal, trilhaAberta)).toBe("avancar");
		expect(sentidoDaTroca(`${TRILHA}/quiz`, quizFinal, comQuiz)).toBe(
			"avancar",
		);
	});

	it("do quiz para a trilha é voltar, e da trilha para o quiz, avançar", () => {
		expect(sentidoDaTroca(`${TRILHA}/quiz`, TRILHA)).toBe("voltar");
		expect(sentidoDaTroca(TRILHA, `${TRILHA}/quiz`)).toBe("avancar");
		expect(sentidoDaTroca(`${TRILHA}/quiz-final`, TRILHA)).toBe("voltar");
		expect(sentidoDaTroca(TRILHA, `${TRILHA}/quiz-final`)).toBe("avancar");
	});

	it("a página do piloto fica no nível da lista das trilhas", () => {
		expect(sentidoDaTroca("/", "/piloto")).toBe("avancar");
		expect(
			sentidoDaTroca("/piloto", `${TRILHA}/quem-pode-propor-uma-lei`),
		).toBe("avancar");
		expect(sentidoDaTroca(TRILHA, "/piloto")).toBe("voltar");
		expect(sentidoDaTroca("/piloto", "/")).toBe("voltar");
	});

	it("a lista das edições fica no nível da lista das trilhas, e cada edição, no de uma trilha", () => {
		expect(sentidoDaTroca("/", "/edicoes")).toBe("avancar");
		expect(sentidoDaTroca("/edicoes", "/edicoes/7")).toBe("avancar");
		expect(sentidoDaTroca("/edicoes/7", "/edicoes")).toBe("voltar");
		expect(sentidoDaTroca("/edicoes", "/")).toBe("voltar");
		// "Entenda na trilha", no item da edição, e o caminho de volta.
		expect(
			sentidoDaTroca("/edicoes/7", `${TRILHA}/onde-o-projeto-comeca`),
		).toBe("avancar");
		expect(
			sentidoDaTroca(`${TRILHA}/onde-o-projeto-comeca`, "/edicoes/7"),
		).toBe("voltar");
		// Pelo cabeçalho, de uma trilha para a lista das edições.
		expect(sentidoDaTroca(TRILHA, "/edicoes")).toBe("voltar");
		expect(sentidoDaTroca("/trilhas", "/edicoes/7")).toBe("avancar");
	});

	it("a página não encontrada fica no fundo do bloco", () => {
		expect(sentidoDaTroca(TRILHA, "/pagina-que-nao-existe")).toBe("avancar");
		expect(sentidoDaTroca("/pagina-que-nao-existe", "/")).toBe("voltar");
		expect(
			sentidoDaTroca(
				"/edicoes/7/outra-coisa",
				`${TRILHA}/onde-o-projeto-comeca`,
			),
		).toBe("voltar");
	});
});

describe("tiposDaTroca", () => {
	const troca = (de: string | undefined, para: string) => ({
		fromLocation: de === undefined ? undefined : { pathname: de },
		toLocation: { pathname: para },
		pathChanged: de !== para,
	});

	it("diz que é uma troca de folha, e o sentido dela", () => {
		expect(
			tiposDaTroca(troca("/", "/trilhas"), { molduraNaTela: false }),
		).toEqual(["folha", "avancar"]);
		expect(
			tiposDaTroca(troca(TRILHA, "/trilhas"), { molduraNaTela: false }),
		).toEqual(["folha", "voltar"]);
	});

	it("avisa quando o cabeçalho está na tela, para ele ficar parado", () => {
		expect(
			tiposDaTroca(troca("/", "/trilhas"), { molduraNaTela: true }),
		).toEqual(["folha", "avancar", "moldura-na-tela"]);
	});

	it("usa a ordem da trilha aberta entre dois artigos", () => {
		expect(
			tiposDaTroca(
				troca(
					`${TRILHA}/o-projeto-passa-pelas-comissoes`,
					`${TRILHA}/onde-o-projeto-comeca`,
				),
				{ trilhaAberta, molduraNaTela: false },
			),
		).toEqual(["folha", "voltar"]);
	});

	it("usa o lugar do quiz na trilha aberta", () => {
		expect(
			tiposDaTroca(troca(`${TRILHA}/quiz`, `${TRILHA}/onde-o-projeto-comeca`), {
				trilhaAberta: {
					...trilhaAberta,
					quizDepoisDe: "onde-o-projeto-comeca",
				},
				molduraNaTela: false,
			}),
		).toEqual(["folha", "voltar"]);
	});

	it("não anima a primeira carga nem um link para um trecho da mesma página", () => {
		expect(tiposDaTroca(troca(undefined, "/"), { molduraNaTela: true })).toBe(
			false,
		);
		expect(tiposDaTroca(troca(TRILHA, TRILHA), { molduraNaTela: true })).toBe(
			false,
		);
	});
});

describe("trilhaDaPaginaAberta", () => {
	it("pega a trilha dos dados do artigo que está na tela", () => {
		expect(
			trilhaDaPaginaAberta([
				{ routeId: "__root__", loaderData: undefined },
				{
					routeId: "/trilhas/$trilha/$artigo",
					loaderData: { trilha: trilhaAberta, posicao: 2 },
				},
			]),
		).toBe(trilhaAberta);
	});

	it("pega a trilha dos dados do quiz que está na tela", () => {
		const comQuiz = { ...trilhaAberta, quizDepoisDe: "onde-o-projeto-comeca" };
		expect(
			trilhaDaPaginaAberta([
				{ routeId: "__root__", loaderData: undefined },
				{
					routeId: "/trilhas/$trilha/quiz",
					loaderData: { trilha: comQuiz, perguntas: [] },
				},
			]),
		).toBe(comQuiz);
	});

	it("pega a trilha dos dados do quiz final que está na tela", () => {
		expect(
			trilhaDaPaginaAberta([
				{ routeId: "__root__", loaderData: undefined },
				{
					routeId: "/trilhas/$trilha/quiz-final",
					loaderData: { trilha: trilhaAberta, perguntas: [] },
				},
			]),
		).toBe(trilhaAberta);
	});

	it("fora de um artigo e do quiz, não há trilha aberta", () => {
		expect(
			trilhaDaPaginaAberta([
				{ routeId: "__root__" },
				{ routeId: "/trilhas/$trilha/", loaderData: { slug: "x" } },
			]),
		).toBeUndefined();
	});
});

describe("molduraNaTela", () => {
	function cabecalho(embaixo: number) {
		document.body.innerHTML = `<header class="moldura"></header><footer class="moldura"></footer>`;
		const moldura = document.querySelector("header.moldura");
		if (!moldura) {
			throw new Error("sem o cabeçalho");
		}
		moldura.getBoundingClientRect = () => ({ bottom: embaixo }) as DOMRect;
	}

	it("é verdade quando um pedaço do cabeçalho aparece na tela", () => {
		cabecalho(114);
		expect(molduraNaTela()).toBe(true);
		cabecalho(3);
		expect(molduraNaTela()).toBe(true);
	});

	it("é mentira com a página rolada para baixo dele, ou sem cabeçalho", () => {
		cabecalho(-20);
		expect(molduraNaTela()).toBe(false);
		document.body.innerHTML = `<footer class="moldura"></footer>`;
		expect(molduraNaTela()).toBe(false);
	});

	describe("com a rolagem da página nova", () => {
		afterEach(() => {
			rolar(0);
		});

		/** A página de antes rolada `y` px: o cabeçalho, de 72 px, sobe junto. */
		function paginaDeAntes(y: number) {
			cabecalho(72 - y);
			rolar(y);
		}

		// A #164: na volta pelo navegador, o artigo está no alto e a trilha volta
		// rolada. O cabeçalho da trilha fica lá em cima, fora da tela: com o nome, o
		// de antes voava até ele e deixava uma faixa de papel no lugar.
		it("na volta para uma página rolada, é mentira: o cabeçalho dela fica fora da tela", () => {
			paginaDeAntes(0);
			expect(molduraNaTela(1592)).toBe(false);
			expect(molduraNaTela(72)).toBe(false);
		});

		it("com a página nova no alto, ou só um pouco rolada, é verdade", () => {
			paginaDeAntes(0);
			expect(molduraNaTela(0)).toBe(true);
			expect(molduraNaTela(40)).toBe(true);
		});

		it("conta o cabeçalho pelo lugar dele na página, também com a página de antes um pouco rolada", () => {
			// Rolada 30 px, a página de antes mostra 42 px do cabeçalho; a nova, rolada
			// 60 px, mostra 12.
			paginaDeAntes(30);
			expect(molduraNaTela(60)).toBe(true);
			expect(molduraNaTela(72)).toBe(false);
		});

		it("quando não se sabe onde a página nova abre, é mentira: na dúvida, o cabeçalho fica sem o nome", () => {
			paginaDeAntes(0);
			expect(molduraNaTela(null)).toBe(false);
		});
	});
});

describe("rolagemDasPaginas", () => {
	afterEach(() => {
		rolar(0);
	});

	/** Uma visita a uma página: a chave dela no histórico separa duas visitas. */
	const visita = (chave: string, caminho = TRILHA) => ({
		href: caminho,
		state: { __TSR_key: chave },
	});
	const ARTIGO = `${TRILHA}/o-plenario-vota-o-projeto`;

	/**
	 * O histórico avisa cada mudança: a volta (`BACK`), o avançar (`FORWARD`) e o
	 * `GO` vêm do navegador; `PUSH` e `REPLACE`, de um link.
	 */
	function mudou(
		rolagem: ReturnType<typeof rolagemDasPaginas>,
		tipo: string,
		para: ReturnType<typeof visita>,
	) {
		rolagem.anotar({ location: para, action: { type: tipo } });
	}

	it("na volta do navegador, a página chega com a rolagem que tinha quando a pessoa saiu", () => {
		const rolagem = rolagemDasPaginas();
		// A pessoa sai da trilha rolada para o artigo: o router avisa antes de
		// carregar o artigo (o onBeforeLoad).
		rolar(1592);
		rolagem.guardar({ fromLocation: visita("trilha") });
		mudou(rolagem, "PUSH", visita("artigo", ARTIGO));
		rolar(0);

		mudou(rolagem, "BACK", visita("trilha"));
		expect(rolagem.daPaginaNova({ toLocation: visita("trilha") })).toBe(1592);
	});

	it("no avançar do navegador também", () => {
		const rolagem = rolagemDasPaginas();
		// Da trilha, no alto, para o artigo; lido até o meio, de volta para a trilha.
		rolagem.guardar({ fromLocation: visita("trilha") });
		mudou(rolagem, "PUSH", visita("artigo", ARTIGO));
		rolar(900);
		rolagem.guardar({ fromLocation: visita("artigo", ARTIGO) });
		mudou(rolagem, "BACK", visita("trilha"));
		rolar(0);

		mudou(rolagem, "FORWARD", visita("artigo", ARTIGO));
		expect(rolagem.daPaginaNova({ toLocation: visita("artigo", ARTIGO) })).toBe(
			900,
		);
	});

	it("num link, a página nova abre no alto", () => {
		const rolagem = rolagemDasPaginas();
		rolar(1592);
		rolagem.guardar({ fromLocation: visita("trilha") });

		mudou(rolagem, "PUSH", visita("artigo", ARTIGO));
		expect(rolagem.daPaginaNova({ toLocation: visita("artigo", ARTIGO) })).toBe(
			0,
		);
		mudou(rolagem, "REPLACE", visita("outro", ARTIGO));
		expect(rolagem.daPaginaNova({ toLocation: visita("outro", ARTIGO) })).toBe(
			0,
		);
	});

	it("separa duas visitas à mesma página pela chave do histórico", () => {
		const rolagem = rolagemDasPaginas();
		rolar(1592);
		rolagem.guardar({ fromLocation: visita("primeira") });
		rolar(0);
		rolagem.guardar({ fromLocation: visita("segunda") });

		const volta = (chave: string) => {
			mudou(rolagem, "BACK", visita(chave));
			return rolagem.daPaginaNova({ toLocation: visita(chave) });
		};
		expect(volta("primeira")).toBe(1592);
		expect(volta("segunda")).toBe(0);
	});

	// Depois de recarregar a página, ou na volta de outro site, a página começa
	// de novo, sem nada guardado: a volta para uma visita de antes chega sem a
	// rolagem dela.
	it("na volta ou no avançar para uma visita sem a rolagem guardada, não se sabe", () => {
		const rolagem = rolagemDasPaginas();
		mudou(rolagem, "BACK", visita("trilha"));
		expect(rolagem.daPaginaNova({ toLocation: visita("trilha") })).toBeNull();
		mudou(rolagem, "FORWARD", visita("artigo", ARTIGO));
		expect(
			rolagem.daPaginaNova({ toLocation: visita("artigo", ARTIGO) }),
		).toBeNull();
		mudou(rolagem, "GO", visita("inicio", "/"));
		expect(
			rolagem.daPaginaNova({ toLocation: visita("inicio", "/") }),
		).toBeNull();
	});

	it("na primeira carga, sem página de antes, não guarda nada", () => {
		const rolagem = rolagemDasPaginas();
		rolar(1592);
		rolagem.guardar({});

		mudou(rolagem, "PUSH", visita("trilha"));
		expect(rolagem.daPaginaNova({ toLocation: visita("trilha") })).toBe(0);
	});
});

describe("cliqueDuranteATroca", () => {
	let desligar: (() => void) | undefined;

	afterEach(() => {
		desligar?.();
		desligar = undefined;
		Reflect.deleteProperty(document, "activeViewTransition");
		Reflect.deleteProperty(document, "elementFromPoint");
	});

	/**
	 * Uma página com um botão embaixo do ponteiro e, se pedido, uma troca
	 * rodando. O jsdom não tem o activeViewTransition nem o elementFromPoint.
	 */
	function pagina({ trocando }: { trocando: boolean }) {
		document.body.innerHTML = "<button>Começar</button>";
		const botao = document.querySelector("button");
		if (!botao) {
			throw new Error("sem o botão");
		}
		const cliques: MouseEvent[] = [];
		botao.addEventListener("click", (evento) => cliques.push(evento));
		const troca = { skipTransition: vi.fn() };
		Object.defineProperty(document, "activeViewTransition", {
			configurable: true,
			get: () => (trocando ? troca : null),
		});
		Object.defineProperty(document, "elementFromPoint", {
			configurable: true,
			value: () => botao,
		});
		desligar = cliqueDuranteATroca();
		return { botao, cliques, troca };
	}

	// Durante a troca, o navegador entrega o toque e o clique ao documento.
	function tocar() {
		document.documentElement.dispatchEvent(
			new Event("pointerdown", { bubbles: true }),
		);
	}

	function clicar(alvo: Element, detail: number) {
		alvo.dispatchEvent(
			new MouseEvent("click", {
				bubbles: true,
				detail,
				clientX: 120,
				clientY: 340,
			}),
		);
	}

	it("no toque, encerra a troca, e o clique segue para o que está embaixo do ponteiro", () => {
		const { cliques, troca } = pagina({ trocando: true });

		tocar();
		clicar(document.documentElement, 1);

		expect(troca.skipTransition).toHaveBeenCalledTimes(1);
		expect(
			cliques.map(({ detail, clientX, clientY }) => [detail, clientX, clientY]),
		).toEqual([[1, 120, 340]]);
	});

	it("deixa de fora o segundo clique de um clique duplo", () => {
		const { cliques, troca } = pagina({ trocando: true });

		tocar();
		clicar(document.documentElement, 2);

		expect(troca.skipTransition).toHaveBeenCalledTimes(1);
		expect(cliques).toHaveLength(0);
	});

	it("sem troca rodando, não mexe no clique", () => {
		const { cliques, troca } = pagina({ trocando: false });

		tocar();
		clicar(document.documentElement, 1);

		expect(troca.skipTransition).not.toHaveBeenCalled();
		expect(cliques).toHaveLength(0);
	});

	it("não repete o clique que já chegou a uma peça da página", () => {
		const { botao, cliques } = pagina({ trocando: true });

		tocar();
		clicar(botao, 1);

		expect(cliques).toHaveLength(1);
	});

	it("vale para um clique só: o seguinte, sem toque durante a troca, não segue", () => {
		const { cliques } = pagina({ trocando: true });

		tocar();
		clicar(document.documentElement, 1);
		clicar(document.documentElement, 1);

		expect(cliques).toHaveLength(1);
	});

	it("num navegador sem o activeViewTransition, não faz nada", () => {
		const { cliques } = pagina({ trocando: false });
		Reflect.deleteProperty(document, "activeViewTransition");

		expect(tocar).not.toThrow();
		clicar(document.documentElement, 1);

		expect(cliques).toHaveLength(0);
	});

	it("desligado, não encerra a troca nem manda o clique", () => {
		const { cliques, troca } = pagina({ trocando: true });
		desligar?.();

		tocar();
		clicar(document.documentElement, 1);

		expect(troca.skipTransition).not.toHaveBeenCalled();
		expect(cliques).toHaveLength(0);
	});
});

describe("foiTrocaPulada", () => {
	it("é o AbortError da troca que o navegador pulou", () => {
		expect(
			foiTrocaPulada(new DOMException("Transition was skipped", "AbortError")),
		).toBe(true);
	});

	it("outro erro da troca, ou um erro qualquer, não é", () => {
		expect(
			foiTrocaPulada(
				new DOMException(
					"Transition was aborted because of invalid state",
					"InvalidStateError",
				),
			),
		).toBe(false);
		expect(foiTrocaPulada(new TypeError("Failed to fetch"))).toBe(false);
		expect(foiTrocaPulada(undefined)).toBe(false);
	});
});

describe("semErroNaTrocaPulada", () => {
	afterEach(() => {
		Reflect.deleteProperty(document, "activeViewTransition");
	});

	/**
	 * Um router de mentira que, como o TanStack Router, começa a troca no
	 * navegador e devolve a página nova; a troca rejeita o `ready` com o erro dado.
	 */
	function routerComTroca(erro: unknown) {
		const troca = { ready: Promise.reject(erro) };
		const router = {
			startViewTransition: vi.fn((novaPagina: () => Promise<void>) => {
				Object.defineProperty(document, "activeViewTransition", {
					configurable: true,
					get: () => troca,
				});
				return novaPagina();
			}),
		};
		return router;
	}

	async function soltasDurante(fazer: () => Promise<unknown>) {
		const soltas: unknown[] = [];
		const anotar = (motivo: unknown) => soltas.push(motivo);
		process.on("unhandledRejection", anotar);
		try {
			await fazer();
			await new Promise((pronto) => setTimeout(pronto, 20));
		} finally {
			process.off("unhandledRejection", anotar);
		}
		return soltas;
	}

	it("trata o AbortError da troca pulada, e a página nova chega", async () => {
		const router = routerComTroca(
			new DOMException("Transition was skipped", "AbortError"),
		);
		const comecar = router.startViewTransition;
		semErroNaTrocaPulada(router);
		const novaPagina = vi.fn(async () => {});

		const soltas = await soltasDurante(() =>
			router.startViewTransition(novaPagina),
		);

		expect(comecar).toHaveBeenCalledWith(novaPagina);
		expect(novaPagina).toHaveBeenCalledTimes(1);
		expect(soltas).toEqual([]);
	});

	it("deixa solto o erro de outro tipo, que continua aparecendo no console", async () => {
		const erro = new DOMException(
			"Transition was aborted because of invalid state",
			"InvalidStateError",
		);
		const router = routerComTroca(erro);
		semErroNaTrocaPulada(router);

		const soltas = await soltasDurante(() =>
			router.startViewTransition(async () => {}),
		);

		expect(soltas).toHaveLength(1);
		expect(soltas[0]).toBe(erro);
	});

	// Na primeira carga, num link para um trecho da mesma página e no "Tentar de
	// novo", o router troca a página sem animar. Uma troca anterior que ainda está
	// na tela já ganhou quem espere o ready dela quando começou.
	it("quando o router não anima, o ready da troca anterior não ganha outro catch", async () => {
		const anterior = { ready: new Promise<void>(() => {}) };
		const tratou = vi.spyOn(anterior.ready, "catch");
		Object.defineProperty(document, "activeViewTransition", {
			configurable: true,
			get: () => anterior,
		});
		const novaPagina = vi.fn(async () => {});
		const router = {
			startViewTransition: vi.fn((fazer: () => Promise<void>) => fazer()),
		};
		semErroNaTrocaPulada(router);

		await router.startViewTransition(novaPagina);

		expect(novaPagina).toHaveBeenCalledTimes(1);
		expect(tratou).not.toHaveBeenCalled();
	});

	it("num navegador sem o activeViewTransition, só começa a troca", async () => {
		const novaPagina = vi.fn(async () => {});
		const router = {
			startViewTransition: vi.fn((fazer: () => Promise<void>) => fazer()),
		};
		semErroNaTrocaPulada(router);

		await router.startViewTransition(novaPagina);

		expect(novaPagina).toHaveBeenCalledTimes(1);
	});
});
