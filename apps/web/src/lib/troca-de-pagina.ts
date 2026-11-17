/**
 * A troca de página: a página nova aparece azulejo por azulejo, num giro de
 * relógio em cada peça; quem volta vê o giro ao contrário. As páginas ficam em
 * ordem, como as folhas de um bloco: a inicial em cima, depois a lista das
 * trilhas, ao lado dela a página do piloto, cada trilha e os artigos dela, com
 * o quiz no lugar dele entre os artigos e o quiz final depois do último. Aqui
 * ficam o sentido de cada troca, que o router passa ao navegador como tipo da
 * View Transition (router.tsx), o clique feito durante a troca e a troca que o
 * navegador pula. O movimento fica em estilos/movimento.css.
 */

export type Sentido = "avancar" | "voltar";

/** A trilha da página aberta, com os artigos na ordem dela e o lugar do quiz. */
export type TrilhaAberta = {
	slug: string;
	artigos: ReadonlyArray<{ slug: string }>;
	/** O artigo depois do qual o quiz aparece, quando a trilha tem quiz. */
	quizDepoisDe?: string;
};

/** O fim do endereço do quiz de uma trilha: /trilhas/{trilha}/quiz. */
const QUIZ = "quiz";

/** O fim do endereço do quiz final, que vem depois do último artigo. */
const QUIZ_FINAL = "quiz-final";

/** A página do piloto, que vem antes da trilha dele: fica com a lista. */
const PILOTO = "piloto";

/** O que o router diz de cada troca (o `locationChangeInfo` do TanStack Router). */
export type Troca = {
	fromLocation?: { pathname: string };
	toLocation: { pathname: string };
	pathChanged: boolean;
};

type Lugar = { fundura: number; trilha?: string; artigo?: string };

/**
 * Onde a página fica no bloco: a inicial em cima, depois a lista das trilhas e
 * a do piloto, cada trilha e os artigos dela. Um endereço que não é de
 * nenhuma, como o da página não encontrada, fica no fundo.
 */
function lugarNoBloco(caminho: string): Lugar {
	const partes = caminho.split("/").filter(Boolean);
	if (partes.length === 0) {
		return { fundura: 0 };
	}
	if (partes.length === 1 && partes[0] === PILOTO) {
		return { fundura: 1 };
	}
	if (partes[0] !== "trilhas" || partes.length > 3) {
		return { fundura: 4 };
	}
	return { fundura: partes.length, trilha: partes[1], artigo: partes[2] };
}

/**
 * Ir mais para dentro do bloco, ou para um artigo mais adiante na mesma trilha,
 * é avançar; o contrário é voltar. O quiz fica entre o artigo depois do qual
 * aparece e o seguinte: do quiz para o "Artigo anterior" é voltar. O quiz
 * final fica depois do último artigo, e dele para qualquer artigo é voltar. O
 * botão voltar do navegador segue a mesma regra: o que vale é o lugar da página
 * no bloco, e não a ordem da visita. Sem a ordem da trilha, duas páginas dela
 * contam como avançar.
 */
export function sentidoDaTroca(
	de: string,
	para: string,
	trilhaAberta?: TrilhaAberta,
): Sentido {
	const origem = lugarNoBloco(de);
	const destino = lugarNoBloco(para);
	if (origem.fundura !== destino.fundura) {
		return destino.fundura < origem.fundura ? "voltar" : "avancar";
	}
	if (
		origem.artigo &&
		destino.artigo &&
		trilhaAberta &&
		origem.trilha === trilhaAberta.slug &&
		destino.trilha === trilhaAberta.slug
	) {
		const doArtigo = (slug: string) =>
			trilhaAberta.artigos.findIndex((artigo) => artigo.slug === slug);
		const posicao = (slug: string) => {
			if (slug === QUIZ_FINAL) {
				return trilhaAberta.artigos.length - 0.5;
			}
			if (slug !== QUIZ) {
				return doArtigo(slug);
			}
			const antes =
				trilhaAberta.quizDepoisDe === undefined
					? -1
					: doArtigo(trilhaAberta.quizDepoisDe);
			return antes < 0 ? -1 : antes + 0.5;
		};
		const daOrigem = posicao(origem.artigo);
		const doDestino = posicao(destino.artigo);
		if (daOrigem >= 0 && doDestino >= 0 && doDestino < daOrigem) {
			return "voltar";
		}
	}
	return "avancar";
}

/**
 * Os tipos da View Transition de uma troca: `folha`, o sentido e, quando o
 * cabeçalho está na tela, `moldura-na-tela`, para ele ficar parado enquanto a
 * página troca. Sem página de origem (a primeira carga) ou sem
 * mudar de página (um link para um trecho da mesma página, como #caminho), não
 * há troca de folha, e o `false` diz ao router para não animar.
 */
export function tiposDaTroca(
	troca: Troca,
	{
		trilhaAberta,
		molduraNaTela,
	}: { trilhaAberta?: TrilhaAberta; molduraNaTela: boolean },
): string[] | false {
	if (!troca.fromLocation || !troca.pathChanged) {
		return false;
	}
	const tipos = [
		"folha",
		sentidoDaTroca(
			troca.fromLocation.pathname,
			troca.toLocation.pathname,
			trilhaAberta,
		),
	];
	if (molduraNaTela) {
		tipos.push("moldura-na-tela");
	}
	return tipos;
}

/**
 * A trilha do artigo, do quiz ou do quiz final que está na tela, pelos dados
 * que o router já carregou para a página, para comparar a posição de duas
 * páginas da trilha. Fora deles, não há.
 */
export function trilhaDaPaginaAberta(
	matches: ReadonlyArray<{ routeId: string; loaderData?: unknown }>,
): TrilhaAberta | undefined {
	const daPagina = matches.find(
		(match) =>
			match.routeId === "/trilhas/$trilha/$artigo" ||
			match.routeId === "/trilhas/$trilha/quiz" ||
			match.routeId === "/trilhas/$trilha/quiz-final",
	);
	// Os três loaders devolvem a trilha como nas listas (lib/conteudo), com os
	// artigos na ordem e o lugar do quiz.
	return (daPagina?.loaderData as { trilha?: TrilhaAberta } | undefined)
		?.trilha;
}

/** Se o cabeçalho aparece na tela, nem que seja um pedaço. */
export function molduraNaTela(): boolean {
	const moldura = document.querySelector("header.moldura");
	return moldura ? moldura.getBoundingClientRect().bottom > 0 : false;
}

/**
 * O clique durante a troca de página. Enquanto a troca roda, o navegador mostra
 * fotos das duas páginas, e nada da página nova responde ao ponteiro: o clique
 * vai para o documento, e um clique logo depois de uma navegação se perdia. O
 * `pointer-events: none` nas fotos não resolve, porque a página inteira está na
 * foto.
 *
 * Aqui, o toque encerra a troca na hora, e o clique que o navegador entregou ao
 * documento segue para o que está embaixo do ponteiro, já na página nova. O
 * segundo clique de um clique duplo (`detail` 2) não segue: ele cairia num
 * botão da página nova sem a pessoa ter visto o botão (lib/clique.ts).
 *
 * Num navegador sem o `activeViewTransition`, nada muda: o clique feito durante
 * a troca continua se perdendo. Devolve a função que desliga.
 */
export function cliqueDuranteATroca(): () => void {
	let encerrou = false;
	const aoTocar = () => {
		const troca = document.activeViewTransition;
		encerrou = Boolean(troca);
		troca?.skipTransition();
	};
	const aoClicar = (evento: MouseEvent) => {
		if (!encerrou) {
			return;
		}
		encerrou = false;
		if (
			evento.target !== document.documentElement ||
			evento.button !== 0 ||
			evento.detail > 1
		) {
			return;
		}
		document.elementFromPoint(evento.clientX, evento.clientY)?.dispatchEvent(
			new MouseEvent("click", {
				bubbles: true,
				cancelable: true,
				composed: true,
				detail: evento.detail,
				clientX: evento.clientX,
				clientY: evento.clientY,
				ctrlKey: evento.ctrlKey,
				metaKey: evento.metaKey,
				shiftKey: evento.shiftKey,
				altKey: evento.altKey,
			}),
		);
	};
	document.addEventListener("pointerdown", aoTocar, true);
	document.addEventListener("click", aoClicar, true);
	return () => {
		document.removeEventListener("pointerdown", aoTocar, true);
		document.removeEventListener("click", aoClicar, true);
	};
}

/**
 * Se o erro é o da troca que o navegador pulou: um AbortError. Ele chega quando
 * a pessoa volta pelo navegador antes de a troca começar a animar.
 */
export function foiTrocaPulada(erro: unknown): boolean {
	return erro instanceof DOMException && erro.name === "AbortError";
}

/** O router, com a função que começa cada troca de página no navegador. */
type ComTroca = {
	startViewTransition: (novaPagina: () => Promise<void>) => unknown;
};

/**
 * A troca pulada sem erro no console. Quando a pessoa volta pelo navegador antes
 * de a troca começar a animar (da trilha para o quiz, por exemplo), o navegador
 * pula a troca e rejeita a promessa `ready` dela com um AbortError. O router só
 * espera a página nova (o `updateCallbackDone`), e ninguém esperava o `ready`: o
 * erro ia para o console, com a página certa na tela.
 *
 * Aqui, cada troca que o router começa ganha quem espere o `ready` e deixe passar
 * só esse AbortError; outro erro continua aparecendo. A troca que o router
 * começou é o `activeViewTransition` do documento, quando ele muda na chamada.
 * Quando o router não anima (na primeira carga, num link para um trecho da mesma
 * página e no "Tentar de novo"), ele não muda, e nenhum `ready` ganha outro
 * `catch`: uma troca anterior que ainda está na tela já ganhou o dela quando
 * começou, e o erro dela apareceria duas vezes. Num navegador sem o
 * `activeViewTransition`, nada muda, como no clique durante a troca.
 */
export function semErroNaTrocaPulada(router: ComTroca): void {
	const comecar = router.startViewTransition;
	const trocaNaTela = () =>
		typeof document === "undefined" ? undefined : document.activeViewTransition;
	router.startViewTransition = (novaPagina) => {
		const anterior = trocaNaTela();
		const chegou = comecar.call(router, novaPagina);
		const troca = trocaNaTela();
		if (troca && troca !== anterior) {
			troca.ready.catch((erro: unknown) => {
				if (!foiTrocaPulada(erro)) {
					throw erro;
				}
			});
		}
		return chegou;
	};
}
