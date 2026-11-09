import { Toaster } from "@mandatometro/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

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
				// Um endereço que não existe, mesmo fundo como /trilhas/x/y/z, deixa uma
				// das rotas marcada como não encontrada. As páginas que existem trocam
				// este título pelo delas.
				title: matches.some(
					(match) => match.status === "notFound" || match._notFound,
				)
					? "Página não encontrada · Mandatômetro"
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
 * nova, ou para o main se ela não tiver h1: quem usa o teclado continua dali, e o
 * leitor de tela anuncia a página. A primeira carga não mexe no foco.
 */
function FocoNaPaginaNova() {
	const router = useRouter();

	useEffect(
		() =>
			router.subscribe("onRendered", ({ pathChanged }) => {
				if (!pathChanged) {
					return;
				}
				const titulo = document.querySelector<HTMLElement>("#conteudo h1");
				if (titulo) {
					titulo.tabIndex = -1;
				}
				(titulo ?? document.getElementById("conteudo"))?.focus({
					preventScroll: true,
				});
			}),
		[router],
	);

	return null;
}
