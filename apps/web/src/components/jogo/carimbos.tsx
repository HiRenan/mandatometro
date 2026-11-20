import type { Selo } from "@/lib/jogo/ler";

/**
 * Os seis carimbos do jogo, um componente por carimbo, com o texto escrito no
 * código: dá para traduzir, ajustar e ler com leitor de tela. O texto fica em
 * tinta, e a cor da fita só contorna o selo (DESIGN.md: nenhum texto em cima de
 * uma cor de fita). A entrada, com a tremida, fica em estilos/jogo.css e para
 * com `prefers-reduced-motion`.
 */
function Carimbado({ texto, cor }: { texto: string; cor: string }) {
	return (
		<p className="jogo-carimbo" data-cor={cor}>
			<span>{texto}</span>
		</p>
	);
}

export function PedidoDeVista() {
	return <Carimbado texto="Pedido de vista!" cor="amarela" />;
}

export function RecursoAoPlenario() {
	return <Carimbado texto="Recurso ao Plenário?" cor="amarela" />;
}

export function SegueParaOSenado() {
	return <Carimbado texto="Segue para o Senado" cor="neutra" />;
}

export function Urgencia() {
	return <Carimbado texto="Urgência!" cor="vermelha" />;
}

export function Aprovado() {
	return <Carimbado texto="Aprovado" cor="verde" />;
}

export function Sancionado() {
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
