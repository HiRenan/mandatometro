import { createFileRoute } from "@tanstack/react-router";
import { PaginaDeSair } from "@/components/pagina-de-sair";
import { ENV } from "@/env";
import { metaDaPagina } from "@/lib/meta";

// A página para sair da newsletter. O link do fim de cada edição abre a API, que
// manda o navegador para cá, com o código de saída (?codigo=). A página não tem
// loader: nada sai ao abrir, nem quando o roteador adianta a página, e só o
// botão apaga a inscrição (components/pagina-de-sair.tsx). O código fica fora
// dos buscadores, do Referer e do cache.
export const Route = createFileRoute("/newsletter/sair")({
	// O roteador lê "?codigo=123" como número: o código volta a ser texto, e a
	// página confere o formato.
	validateSearch: (busca: Record<string, unknown>): { codigo?: string } => ({
		codigo:
			busca.codigo === undefined || busca.codigo === null
				? undefined
				: String(busca.codigo),
	}),
	head: () => ({
		meta: [
			...metaDaPagina({
				titulo: "Sair da newsletter",
				descricao:
					"Confirme a saída da newsletter do Mandatômetro, o jornal legislativo de domingo.",
			}),
			{ name: "robots", content: "noindex" },
			{ name: "referrer", content: "no-referrer" },
		],
	}),
	headers: () => ({
		"X-Robots-Tag": "noindex",
		"Referrer-Policy": "no-referrer",
		"Cache-Control": "no-store",
	}),
	component: Sair,
});

function Sair() {
	const { codigo } = Route.useSearch();
	return <PaginaDeSair codigo={codigo} comApi={Boolean(ENV.API_URL)} />;
}
