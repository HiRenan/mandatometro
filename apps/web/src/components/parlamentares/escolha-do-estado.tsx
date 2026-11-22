import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useId } from "react";
import { ESTADOS_PELO_NOME } from "@/lib/parlamentares";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "../botao-continuar";

/**
 * O campo "Estado" e o botão que abre a lista do estado, na página inicial e na
 * lista dos parlamentares. É um formulário GET para /parlamentares: sem o
 * JavaScript, o navegador vai a /parlamentares?uf=SC; com ele, a troca de página
 * é a do site, sem recarregar. O campo vem com o estado aberto escolhido, e
 * volta a ele quando a página troca de estado.
 */
export function EscolhaDoEstado({ escolhido }: { escolhido?: string }) {
	const id = useId();
	const navigate = useNavigate();
	return (
		<form
			key={escolhido ?? ""}
			action="/parlamentares"
			method="get"
			className="escolha-do-estado"
			onSubmit={(evento) => {
				evento.preventDefault();
				const uf = new FormData(evento.currentTarget).get("uf");
				navigate({
					to: "/parlamentares",
					search: typeof uf === "string" && uf ? { uf } : {},
				});
			}}
		>
			<label htmlFor={id} className="rotulo">
				Estado
			</label>
			<div className="escolha-linha">
				<select
					id={id}
					name="uf"
					defaultValue={escolhido ?? ""}
					className="campo"
				>
					<option value="">Escolha o estado</option>
					{ESTADOS_PELO_NOME.map((estado) => (
						<option key={estado.sigla} value={estado.sigla}>
							{estado.nome}
						</option>
					))}
				</select>
				<button type="submit" className={BOTAO_CONTINUAR}>
					Ver os parlamentares{" "}
					<ArrowRight
						aria-hidden="true"
						className={SETA_DO_BOTAO}
						strokeWidth={2.5}
					/>
				</button>
			</div>
		</form>
	);
}
