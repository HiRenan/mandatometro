import { useEffect, useId, useRef } from "react";

/**
 * A folha por cima da página, para uma decisão que não volta atrás: publicar a
 * edição ou sair sem salvar. É a <dialog> do navegador, aberta com o
 * showModal(), como a busca: o resto da página fica inerte, e o Esc volta. O
 * foco começa em quem volta, e não em quem confirma; ao fechar, volta para
 * quem tinha antes (o botão "Publicar a edição" ou o link que a pessoa seguiu).
 */
export function FolhaPorCima({
	aberta,
	titulo,
	texto,
	confirmar,
	voltar,
	aoConfirmar,
	aoVoltar,
}: {
	aberta: boolean;
	titulo: string;
	texto: string;
	confirmar: string;
	voltar: string;
	aoConfirmar: () => void;
	aoVoltar: () => void;
}) {
	const id = useId();
	const dialogo = useRef<HTMLDialogElement>(null);
	const botaoDeVoltar = useRef<HTMLButtonElement>(null);
	const antes = useRef<Element | null>(null);

	useEffect(() => {
		const folha = dialogo.current;
		if (aberta && folha && !folha.hasAttribute("open")) {
			antes.current = document.activeElement;
			folha.showModal();
			botaoDeVoltar.current?.focus();
		} else if (!aberta && folha?.hasAttribute("open")) {
			folha.close();
		}
	}, [aberta]);

	// O navegador pode fechar a folha sozinho (o Esc repetido): aí, é o voltar.
	function aoFechar() {
		if (aberta) {
			aoVoltar();
		}
		const anterior = antes.current;
		if (anterior instanceof HTMLElement && anterior.isConnected) {
			anterior.focus();
		}
	}

	return (
		<dialog
			ref={dialogo}
			className="folha-por-cima"
			aria-labelledby={`${id}-titulo`}
			aria-describedby={`${id}-texto`}
			onCancel={(evento) => {
				evento.preventDefault();
				aoVoltar();
			}}
			onClose={aoFechar}
		>
			<h2 id={`${id}-titulo`} className="subtitulo-condensado">
				{titulo}
			</h2>
			<p id={`${id}-texto`}>{texto}</p>
			<div className="acoes-da-folha">
				<button type="button" className="botao" onClick={aoConfirmar}>
					{confirmar}
				</button>
				<button
					ref={botaoDeVoltar}
					type="button"
					className="botao vazado"
					onClick={aoVoltar}
				>
					{voltar}
				</button>
			</div>
		</dialog>
	);
}
