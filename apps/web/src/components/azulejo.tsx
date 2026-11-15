import { type CSSProperties, useEffect, useRef, useState } from "react";
import { corNoCss, type Peca, painel as pecasDoPainel } from "../lib/azulejos";
import { classes } from "../lib/classes";
import { usePainelVivo, virar } from "../lib/painel-vivo";

/**
 * Os azulejos na tela (DESIGN.md). São só desenho: o painel e o azulejo grande
 * ficam fora do leitor de tela, e nada do que a página diz depende deles. O
 * desenho de cada peça vem de lib/azulejos.ts, e quem pinta é o CSS
 * (estilos/azulejos.css).
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

/** Uma peça, fora do leitor de tela. O `cru` é a peça sem cor, papel sobre papel. */
export function Azulejo({
	peca,
	vez = 0,
	cru = false,
}: {
	peca: Peca;
	vez?: number;
	cru?: boolean;
}) {
	return (
		<span
			aria-hidden="true"
			className={classes("az", `m${peca.motivo}`, cru && "cru")}
			style={variaveis(peca, vez)}
		/>
	);
}

/**
 * O azulejo grande: quatro peças que formam um desenho (o `azulejoGrande` e o
 * `azulejoDaPosicao`, em lib/azulejos.ts). Quando o `cru` muda, as quatro peças
 * viram em fila, e cada uma troca de cor quando está de lado: o `passo` é o
 * tempo entre uma peça e a outra, e o `atraso`, o tempo até a primeira.
 */
export function AzulejoGrande({
	pecas,
	cru = false,
	passo = 70,
	atraso = 0,
	className,
}: {
	pecas: readonly Peca[];
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

	useEffect(() => {
		if (ultimo.current === cru) {
			return;
		}
		ultimo.current = cru;
		const desistir = [...(caixa.current?.children ?? [])].map((peca, qual) =>
			virar(
				peca,
				() =>
					setCrus((antes) =>
						antes.map((era, outra) => (outra === qual ? cru : era)),
					),
				tempos.current.atraso + qual * tempos.current.passo,
			),
		);
		return () => {
			for (const desiste of desistir) {
				desiste();
			}
		};
	}, [cru]);

	return (
		<span
			ref={caixa}
			className={classes("grande", className)}
			aria-hidden="true"
		>
			{pecas.map((peca, qual) => (
				<Azulejo
					// biome-ignore lint/suspicious/noArrayIndexKey: as quatro peças ficam fixas, e só a posição não se repete (duas peças podem ser iguais).
					key={qual}
					peca={peca}
					vez={qual}
					cru={crus[qual]}
				/>
			))}
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
