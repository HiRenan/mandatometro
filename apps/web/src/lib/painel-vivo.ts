import {
	type RefObject,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { fitaDaPeca, type Peca, pecaSorteada, sorteio } from "./azulejos";

/**
 * O movimento dos azulejos (DESIGN.md): a peça fica de lado, troca o desenho e
 * volta. É a animação nativa do navegador (Web Animations), sem biblioteca. Com
 * o movimento reduzido, e onde o navegador não anima, a peça troca no lugar.
 */

const MENOS_MOVIMENTO = "(prefers-reduced-motion: reduce)";

/** Se a pessoa pediu menos movimento ao sistema. */
export function movimentoReduzido(): boolean {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia(MENOS_MOVIMENTO).matches
	);
}

/** Avisa quando a pessoa muda a preferência com a página aberta. */
function assinar(avisar: () => void): () => void {
	if (typeof window.matchMedia !== "function") {
		return () => {};
	}
	const consulta = window.matchMedia(MENOS_MOVIMENTO);
	consulta.addEventListener("change", avisar);
	return () => consulta.removeEventListener("change", avisar);
}

/**
 * Vira uma peça: ela gira até ficar de lado, o `mudar` troca o desenho, e ela
 * volta. Devolve a função que desiste da virada, se ela ainda não começou.
 * O `aoMudarOMovimento` avisa no começo e no fim da animação.
 */
export function virar(
	peca: Element,
	mudar: () => void,
	atraso = 0,
	aoMudarOMovimento?: () => void,
): () => void {
	if (movimentoReduzido() || typeof peca.animate !== "function") {
		mudar();
		return () => {};
	}
	let desistiu = false;
	const relogio = setTimeout(() => {
		const ida = peca.animate(
			[
				{ transform: "rotateY(0deg)" },
				{ transform: "rotateY(90deg)", filter: "brightness(0.75)" },
			],
			{ duration: 200, easing: "ease-in", fill: "forwards" },
		);
		aoMudarOMovimento?.();
		ida.finished
			.then(() => {
				if (!desistiu) {
					mudar();
				}
				ida.cancel();
				const volta = peca.animate(
					[
						{ transform: "rotateY(-90deg)", filter: "brightness(0.75)" },
						{ transform: "rotateY(0deg)" },
					],
					{ duration: 380, easing: "cubic-bezier(0.2, 0.8, 0.3, 1.25)" },
				);
				if (aoMudarOMovimento) return volta.finished.then(aoMudarOMovimento);
			})
			// A animação cancelada (a página trocou no meio) rejeita a promessa.
			.catch(() => aoMudarOMovimento?.());
	}, atraso);
	return () => {
		desistiu = true;
		clearTimeout(relogio);
	};
}

/**
 * Vira a peça como o `virar`, e a desistência fica no `pendentes` até a peça
 * trocar: quem guarda o conjunto desiste das viradas que sobraram, como o
 * painel quando sai da página. Sem animação, o `virar` troca a peça na hora,
 * antes de devolver a desistência: por isso a virada entra no conjunto antes, e
 * o `mudar` já a tira dali.
 */
export function virarPendente(
	pendentes: Set<() => void>,
	peca: Element,
	mudar: () => void,
	atraso = 0,
): void {
	let desiste = () => {};
	const pendente = () => desiste();
	pendentes.add(pendente);
	desiste = virar(
		peca,
		() => {
			pendentes.delete(pendente);
			mudar();
		},
		atraso,
	);
}

/** As posições das peças do painel que aparecem na tela (a sobra fica cortada). */
function aVista(painel: HTMLElement): number[] {
	const alto = painel.clientHeight;
	const vistas: number[] = [];
	for (const [indice, peca] of [...painel.children].entries()) {
		const caixa = peca as HTMLElement;
		if (caixa.offsetParent && caixa.offsetTop < alto) {
			vistas.push(indice);
		}
	}
	return vistas;
}

/**
 * O painel vivo: a peça que o ponteiro toca vira, um clique faz a onda, da peça
 * tocada para fora, e, com o `sozinho`, de tempos em tempos uma peça vira
 * sozinha. Com o `ondaAoChegar`, o painel faz a onda uma vez, quando entra na
 * tela. Só entram as peças que estão à vista, e o painel para quando a aba está
 * escondida ou ele saiu da tela. Com o movimento reduzido, nada disso acontece:
 * se a pessoa liga a preferência com a página aberta, o painel para e desiste
 * das viradas pendentes, e, se desliga, ele volta a virar.
 *
 * Cada peça que vira ganha um desenho novo pelo sorteio. As cinco fitas
 * continuam juntas: a peça que é a única da cor dela à vista muda de desenho, e
 * não de cor.
 */
export function usePainelVivo(
	painel: RefObject<HTMLElement | null>,
	pecas: readonly Peca[],
	trocarPeca: (indice: number, nova: Peca) => void,
	{
		sozinho = false,
		ondaAoChegar = false,
	}: { sozinho?: boolean; ondaAoChegar?: boolean } = {},
) {
	// As peças de agora, para os ouvintes, que são criados uma vez só.
	const atuais = useRef(pecas);
	atuais.current = pecas;
	const trocar = useRef(trocarPeca);
	trocar.current = trocarPeca;
	// A preferência pode mudar com a página aberta. No servidor, nada vira.
	const reduzido = useSyncExternalStore(assinar, movimentoReduzido, () => true);
	// Quando o painel para e volta a virar, o sorteio segue de onde parou, e a
	// onda da chegada não se repete.
	const [sorte] = useState(() => sorteio(99));
	const chegou = useRef(false);

	useEffect(() => {
		const elemento = painel.current;
		if (!elemento || reduzido) {
			return;
		}
		const desistir = new Set<() => void>();

		const redesenhar = (indice: number, atraso = 0) => {
			const peca = elemento.children[indice];
			if (!peca) {
				return;
			}
			virarPendente(
				desistir,
				peca,
				() => {
					const dela = fitaDaPeca(atuais.current[indice]);
					const unicaDaCor =
						dela !== undefined &&
						aVista(elemento).filter(
							(outra) => fitaDaPeca(atuais.current[outra]) === dela,
						).length === 1;
					trocar.current(
						indice,
						pecaSorteada(sorte, unicaDaCor ? dela : undefined),
					);
				},
				atraso,
			);
		};

		const onda = (centro: number) => {
			const doCentro = elemento.children[centro] as HTMLElement | undefined;
			if (!doCentro) {
				return;
			}
			const lado = doCentro.offsetWidth + 2;
			for (const indice of aVista(elemento)) {
				const peca = elemento.children[indice] as HTMLElement;
				const distancia = Math.hypot(
					(peca.offsetLeft - doCentro.offsetLeft) / lado,
					(peca.offsetTop - doCentro.offsetTop) / lado,
				);
				redesenhar(indice, 30 + distancia * 85);
			}
		};

		const indiceDe = (alvo: EventTarget | null): number =>
			alvo instanceof Element && alvo.parentElement === elemento
				? [...elemento.children].indexOf(alvo)
				: -1;

		let ultima = -1;
		const aoMover = (evento: PointerEvent) => {
			// No toque, o dedo que rola a página não vira as peças: fica o clique.
			if (evento.pointerType !== "mouse") {
				return;
			}
			const indice = indiceDe(evento.target);
			if (indice >= 0 && indice !== ultima) {
				ultima = indice;
				redesenhar(indice);
			}
		};
		const aoClicar = (evento: MouseEvent) => {
			const indice = indiceDe(evento.target);
			if (indice >= 0) {
				onda(indice);
			}
		};
		elemento.addEventListener("pointermove", aoMover);
		elemento.addEventListener("click", aoClicar);

		let naTela = false;
		const olho =
			typeof IntersectionObserver === "undefined"
				? undefined
				: new IntersectionObserver(
						([entrada]) => {
							naTela = Boolean(entrada?.isIntersecting);
							if (naTela && ondaAoChegar && !chegou.current) {
								chegou.current = true;
								onda(aVista(elemento)[0] ?? 0);
							}
						},
						{ threshold: ondaAoChegar ? 0.6 : 0 },
					);
		olho?.observe(elemento);

		const relogio = sozinho
			? setInterval(() => {
					if (document.hidden || !naTela) {
						return;
					}
					const vistas = aVista(elemento);
					if (vistas.length > 0) {
						redesenhar(vistas[Math.floor(sorte() * vistas.length)]);
					}
				}, 1400)
			: undefined;

		return () => {
			elemento.removeEventListener("pointermove", aoMover);
			elemento.removeEventListener("click", aoClicar);
			olho?.disconnect();
			clearInterval(relogio);
			for (const desiste of desistir) {
				desiste();
			}
		};
	}, [painel, sozinho, ondaAoChegar, reduzido, sorte]);
}
