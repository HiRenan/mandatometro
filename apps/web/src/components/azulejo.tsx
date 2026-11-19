import {
	type CSSProperties,
	type ReactNode,
	type TransitionEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { corNoCss, type Peca, painel as pecasDoPainel } from "../lib/azulejos";
import { classes } from "../lib/classes";
import { usePainelVivo, virar } from "../lib/painel-vivo";
import { type NomeDoSimbolo, SIMBOLOS } from "../lib/simbolos";

/**
 * Os azulejos na tela (DESIGN.md). São só desenho: o painel e o azulejo grande
 * ficam fora do leitor de tela, e nada do que a página diz depende deles. O
 * desenho de cada peça vem de lib/azulejos.ts, e quem pinta é o CSS
 * (estilos/azulejos.css). O símbolo do azulejo grande vem de lib/simbolos.ts.
 */

/** As variáveis que o CSS lê: o fundo, o desenho, a volta e a vez na entrada. */
function variaveis(peca: Peca, vez: number): CSSProperties {
	return {
		"--a": corNoCss(peca.fundo),
		"--b": corNoCss(peca.desenho),
		"--r": peca.volta,
		"--i": vez,
	} as CSSProperties;
}

/**
 * Uma peça, fora do leitor de tela. O `cru` é a peça sem cor, papel sobre papel.
 * Dentro dela vai o quarto do símbolo, no azulejo grande que tem um.
 */
export function Azulejo({
	peca,
	vez = 0,
	cru = false,
	children,
}: {
	peca: Peca;
	vez?: number;
	cru?: boolean;
	children?: ReactNode;
}) {
	return (
		<span
			aria-hidden="true"
			className={classes("az", `m${peca.motivo}`, cru && "cru")}
			style={variaveis(peca, vez)}
		>
			{children}
		</span>
	);
}

/** A peça lisa, só com o fundo: a do símbolo, que vem desenhado no SVG. */
const LISA = 8;

/** O mesmo desenho inteiro ou num quarto, com sobra para o recorte da peça. */
function DesenhoDoSimbolo({
	simbolo,
	quarto,
}: {
	simbolo: NomeDoSimbolo;
	quarto?: number;
}) {
	const inteiro = quarto === undefined;
	const x = ((quarto ?? 0) % 2) * 50;
	const y = Math.floor((quarto ?? 0) / 2) * 50;
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			className={inteiro ? "simbolo-inteiro" : undefined}
			viewBox={inteiro ? "0 0 100 100" : `${x - 1} ${y - 1} 52 52`}
			preserveAspectRatio={inteiro ? "none" : undefined}
		>
			{SIMBOLOS[simbolo].map((parte) => (
				<path
					key={parte.d}
					d={parte.d}
					fillRule={parte.vazada ? "evenodd" : undefined}
					className={parte.traco ? "traco" : undefined}
					strokeWidth={parte.traco}
					transform={parte.giro ? `rotate(${parte.giro} 50 50)` : undefined}
				/>
			))}
		</svg>
	);
}

/**
 * O azulejo grande: quatro peças que formam um desenho (o `azulejoGrande` e o
 * `azulejoDaPosicao`, em lib/azulejos.ts). Quando o `cru` muda, as quatro peças
 * viram em fila, e cada uma troca de cor quando está de lado: o `passo` é o
 * tempo entre uma peça e a outra, e o `atraso`, o tempo até a primeira.
 *
 * Com o `simbolo`, as quatro peças ficam lisas e dividem o desenho dele, que diz
 * o assunto da trilha ou do passo. A cor continua sendo a das peças.
 */
export function AzulejoGrande({
	pecas,
	simbolo,
	cru = false,
	passo = 70,
	atraso = 0,
	className,
}: {
	pecas: readonly Peca[];
	simbolo?: NomeDoSimbolo;
	cru?: boolean;
	passo?: number;
	atraso?: number;
	className?: string;
}) {
	const caixa = useRef<HTMLSpanElement>(null);
	const [crus, setCrus] = useState(() => pecas.map(() => cru));
	const ultimo = useRef(cru);
	const tempos = useRef({ passo, atraso });
	tempos.current = { passo, atraso };

	const sincronizarSimbolo = useCallback(() => {
		const azulejo = caixa.current;
		if (!azulejo) return;
		// A figura inteira volta quando a última peça termina de virar.
		const virando = [...azulejo.querySelectorAll(":scope > .az")].some((peca) =>
			peca.getAnimations?.().some((giro) => giro.playState === "running"),
		);
		azulejo.toggleAttribute("data-virando", virando);
	}, []);

	const aoGirar = (evento: TransitionEvent<HTMLSpanElement>) => {
		// O React só copia o propertyName para o evento sintético no transitionend.
		if (evento.nativeEvent.propertyName === "rotate") sincronizarSimbolo();
	};

	useEffect(() => {
		if (simbolo) sincronizarSimbolo();
		if (ultimo.current === cru) {
			return;
		}
		ultimo.current = cru;
		const pecasNaTela = caixa.current?.querySelectorAll(":scope > .az") ?? [];
		const desistir = [...pecasNaTela].map((peca, qual) =>
			virar(
				peca,
				() =>
					setCrus((antes) =>
						antes.map((era, outra) => (outra === qual ? cru : era)),
					),
				tempos.current.atraso + qual * tempos.current.passo,
				simbolo ? sincronizarSimbolo : undefined,
			),
		);
		return () => {
			for (const desiste of desistir) {
				desiste();
			}
		};
	}, [cru, simbolo, sincronizarSimbolo]);

	const primeira = pecas[0];
	const corUniforme =
		primeira &&
		pecas.length === 4 &&
		pecas.every(
			(peca, qual) =>
				crus[qual] === crus[0] &&
				peca.fundo === primeira.fundo &&
				peca.desenho === primeira.desenho,
		);
	const coresDoInteiro =
		simbolo && corUniforme
			? variaveis(
					crus[0]
						? { ...primeira, fundo: "papel-2", desenho: "papel-3" }
						: primeira,
					0,
				)
			: undefined;

	return (
		<span
			ref={caixa}
			className={classes("grande", simbolo && "com-simbolo", className)}
			data-simbolo={simbolo}
			style={coresDoInteiro}
			aria-hidden="true"
			onTransitionRun={simbolo ? aoGirar : undefined}
			onTransitionEnd={simbolo ? aoGirar : undefined}
			onTransitionCancel={simbolo ? aoGirar : undefined}
		>
			{pecas.map((peca, qual) => (
				<Azulejo
					// biome-ignore lint/suspicious/noArrayIndexKey: as quatro peças ficam fixas, e só a posição não se repete (duas peças podem ser iguais).
					key={qual}
					peca={simbolo ? { ...peca, motivo: LISA } : peca}
					vez={qual}
					cru={crus[qual]}
				>
					{simbolo && <DesenhoDoSimbolo simbolo={simbolo} quarto={qual} />}
				</Azulejo>
			))}
			{simbolo && coresDoInteiro && <DesenhoDoSimbolo simbolo={simbolo} />}
		</span>
	);
}

type DoPainel = {
	/** A semente do sorteio: a mesma semente dá sempre o mesmo painel. */
	semente: number;
	colunas: number;
	/** Quantas peças o painel tem. As que não cabem na altura ficam cortadas. */
	quantas: number;
	/** Em quantas das primeiras peças as cinco fitas aparecem juntas. */
	juntas?: number;
	className?: string;
	/** De tempos em tempos, uma peça vira sozinha. */
	sozinho?: boolean;
	/** O painel faz a onda uma vez, quando entra na tela. */
	ondaAoChegar?: boolean;
};

/**
 * O painel de azulejos: as peças sorteadas pela semente, lado a lado. Ele é
 * vivo (lib/painel-vivo.ts): a peça que o ponteiro toca vira, e um clique faz a
 * onda. O servidor e o navegador desenham o mesmo painel; as peças só mudam
 * depois, quando viram.
 */
export function Painel(props: DoPainel) {
	// Outra semente é outro painel: as peças começam de novo.
	return <PainelVivo key={props.semente} {...props} />;
}

function PainelVivo({
	semente,
	colunas,
	quantas,
	juntas,
	className,
	sozinho = false,
	ondaAoChegar = false,
}: DoPainel) {
	const caixa = useRef<HTMLDivElement>(null);
	const [pecas, setPecas] = useState(() =>
		pecasDoPainel(semente, quantas, juntas),
	);
	usePainelVivo(
		caixa,
		pecas,
		(lugar, nova) =>
			setPecas((antes) =>
				antes.map((peca, outro) => (outro === lugar ? nova : peca)),
			),
		{ sozinho, ondaAoChegar },
	);

	return (
		<div
			ref={caixa}
			className={classes("painel", className)}
			style={{ "--col": colunas } as CSSProperties}
			aria-hidden="true"
		>
			{pecas.map((peca, lugar) => (
				<Azulejo
					// biome-ignore lint/suspicious/noArrayIndexKey: cada lugar do painel é fixo, e a peça dele é que muda quando vira.
					key={lugar}
					peca={peca}
					// As peças entram em onda, da ponta de cima à esquerda para fora.
					vez={Math.floor(lugar / colunas) + (lugar % colunas)}
				/>
			))}
		</div>
	);
}
