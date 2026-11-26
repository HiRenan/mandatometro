import { createFileRoute } from "@tanstack/react-router";
import { FormularioDeOpiniao } from "@/components/formulario-de-opiniao";
import { ENV } from "@/env";
import { estiloDoTeto } from "@/lib/conteudo/regua";
import { metaDaPagina } from "@/lib/meta";
import { OPINIAO_FORA_DO_AR } from "@/lib/opiniao";

const TITULO = "Dê sua opinião";

export const Route = createFileRoute("/opiniao")({
	head: () => ({
		meta: metaDaPagina({
			titulo: TITULO,
			descricao: "Conte o que funcionou e o que pode melhorar no Mandatômetro.",
		}),
	}),
	component: Opiniao,
});

function Opiniao() {
	return (
		<div className="parede pagina-de-opiniao">
			<div className="folha artigo-folha caixa-do-teto">
				<h1
					className="titulo-condensado letra-com-teto teto-pela-caixa"
					style={estiloDoTeto(TITULO, "titulo-condensado")}
				>
					{TITULO}
				</h1>
				{ENV.API_URL ? (
					<FormularioDeOpiniao />
				) : (
					<p className="lide">{OPINIAO_FORA_DO_AR}</p>
				)}
			</div>
		</div>
	);
}
