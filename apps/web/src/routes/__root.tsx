import { Toaster } from "@mandatometro/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "../components/header";

import appCss from "../index.css?url";

export interface RouterAppContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: ({ matches }) => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				// Só a raiz casa com um endereço que não existe; as páginas trocam este título pelo delas.
				title:
					matches.length > 1
						? "Mandatômetro"
						: "Página não encontrada · Mandatômetro",
			},
			// A cor da barra do navegador no celular segue o cartão preto do cabeçalho.
			{ name: "theme-color", content: "#161616" },
			{ property: "og:site_name", content: "Mandatômetro" },
			{ property: "og:locale", content: "pt_BR" },
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: RootDocument,
});

function RootDocument() {
	return (
		<html lang="pt-BR">
			<head>
				<HeadContent />
			</head>
			<body>
				<div className="grid min-h-svh grid-rows-[auto_1fr]">
					<Header />
					<main id="conteudo" tabIndex={-1} className="focus:outline-none">
						<Outlet />
					</main>
				</div>
				<Toaster richColors />
				<TanStackRouterDevtools position="bottom-left" />
				<Scripts />
			</body>
		</html>
	);
}
