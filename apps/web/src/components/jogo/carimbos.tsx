import { useEffect } from "react";
import type { Selo } from "@/lib/jogo/ler";
import { tocar } from "@/lib/jogo/som";

/**
 * Os seis carimbos do jogo, um componente por carimbo, com o texto escrito no
 * código: dá para traduzir, ajustar e ler com leitor de tela. O texto fica em
 * tinta, e a cor da fita só contorna o selo (DESIGN.md: nenhum texto em cima de
 * uma cor de fita).
 *
 * Ele entra grande e torto, bate com a tremida da tela (estilos/jogo.css) e
 * leva a batida do carimbo, quando o som está ligado. Com
 * `prefers-reduced-motion`, entra no lugar, e o som continua o mesmo.
 */
function Carimbado({ texto, cor }: { texto: string; cor: string }) {
	useEffect(() => {
		tocar("carimbo");
	}, []);

	return (
		<p className="jogo-carimbo" data-cor={cor}>
			<span>{texto}</span>
		</p>
	);
}

function PedidoDeVista() {
	return <Carimbado texto="Pedido de vista!" cor="amarela" />;
}

function RecursoAoPlenario() {
	return <Carimbado texto="Recurso ao Plenário?" cor="amarela" />;
}

function SegueParaOSenado() {
	return <Carimbado texto="Segue para o Senado" cor="neutra" />;
}

function Urgencia() {
	return <Carimbado texto="Urgência!" cor="vermelha" />;
}

function Aprovado() {
	return <Carimbado texto="Aprovado" cor="verde" />;
}

function Sancionado() {
	return <Carimbado texto="Sancionado" cor="verde" />;
}

const CARIMBOS: Record<Selo, () => React.ReactElement> = {
	"pedido-de-vista": PedidoDeVista,
	"recurso-ao-plenario": RecursoAoPlenario,
	"segue-para-o-senado": SegueParaOSenado,
	urgencia: Urgencia,
	aprovado: Aprovado,
	sancionado: Sancionado,
};

/** O carimbo que o roteiro pediu, pelo nome do selo. */
export function Carimbo({ selo }: { selo: Selo }) {
	const Peca = CARIMBOS[selo];
	return <Peca />;
}
