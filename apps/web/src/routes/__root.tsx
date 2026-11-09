import { Toaster } from "@mandatometro/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
	useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { type ReactNode, useEffect } from "react";

import Header from "../components/header";
import appCss from "../index.css?url";
import { focarNoTitulo } from "../lib/foco";
import { TITULO_DE_ERRO, TITULO_NAO_ENCONTRADA } from "../lib/meta";

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
				// Um endereço que não existe, mesmo fundo como /trilhas/x/y/z, deixa uma
				// das rotas marcada como não encontrada, e uma página que não chegou deixa
				// a rota com erro. As páginas que existem trocam este título pelo delas.
				title: matches.some((match) => match.status === "error")
					? TITULO_DE_ERRO
					: matches.some(
								(match) => match.status === "notFound" || match._notFound,
							)
						? TITULO_NAO_ENCONTRADA
						: "Mandatômetro",
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

	// O documento e a moldura ficam fora das páginas: quando uma página dá erro, a
	// página de erro (router.tsx) aparece dentro do main, com o cabeçalho e o
	// lang="pt-BR".
	shellComponent: Documento,
});

function Documento({ children }: { children: ReactNode }) {
	return (
		<html lang="pt-BR">
			<head>
				<HeadContent />
			</head>
			<body>
				<div className="grid min-h-svh grid-rows-[auto_1fr]">
					<Header />
					<main id="conteudo" tabIndex={-1} className="focus:outline-none">
						{children}
					</main>
				</div>
				<FocoNaPaginaNova />
				<Toaster richColors />
				<TanStackRouterDevtools position="bottom-left" />
				<Scripts />
			</body>
		</html>
	);
}

/**
 * Depois de cada navegação dentro do site, o foco vai para o título da página
 * nova, inclusive a de erro. A primeira carga não mexe no foco.
 */
function FocoNaPaginaNova() {
	const router = useRouter();

	useEffect(
		() =>
			router.subscribe("onRendered", ({ pathChanged }) => {
				if (pathChanged) {
					focarNoTitulo();
				}
			}),
		[router],
	);

	return null;
}
