import { Toaster } from "@mandatometro/ui/components/sonner";
import { fontes } from "@mandatometro/ui/lib/fontes";
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
import { Rodape } from "../components/rodape";
import { ENV } from "../env";
import appCss from "../index.css?url";
import { focarNoTitulo } from "../lib/foco";
import {
	cabecalhosDaPagina,
	metaDaImagem,
	TITULO_DE_ERRO,
	TITULO_NAO_ENCONTRADA,
} from "../lib/meta";

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
			...metaDaImagem(ENV.APP_BASE_URL),
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			// O ícone da aba e o da tela de início do celular (imagens/gerar.mjs).
			{ rel: "icon", href: "/favicon.ico", sizes: "16x16 32x32 48x48" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			// As fontes são pedidas junto com o CSS: chegam antes de o texto aparecer, e
			// o texto não pula quando elas trocam a fonte reserva. Todas as páginas usam
			// as duas.
			...[fontes.archivo, fontes.literata].map((href) => ({
				rel: "preload",
				href,
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous" as const,
			})),
		],
	}),

	// A rota raiz vale para toda página, inclusive a que não existe: fora da
	// produção da Vercel, todas pedem aos buscadores para não indexar.
	headers: () => cabecalhosDaPagina(ENV.VERCEL_ENV),

	// O documento e a moldura ficam fora das páginas: quando uma página dá erro, a
	// página de erro (router.tsx) aparece dentro do main, com o cabeçalho, o
	// rodapé e o lang="pt-BR".
	shellComponent: Documento,
});

function Documento({ children }: { children: ReactNode }) {
	return (
		<html lang="pt-BR">
			<head>
				<HeadContent />
			</head>
			<body>
				{/* O main estica: numa página curta, o rodapé fica no fim da tela. A
				    coluna tem a largura da tela: com a letra grande, uma palavra
				    comprida não alarga a página. */}
				<div className="grid min-h-svh grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr_auto]">
					<Header />
					<main id="conteudo" tabIndex={-1} className="focus:outline-none">
						{children}
					</main>
					<Rodape />
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
 * nova, inclusive a de erro, ou para o trecho do endereço (#caminho). A primeira
 * carga não mexe no foco.
 */
function FocoNaPaginaNova() {
	const router = useRouter();

	useEffect(
		() =>
			router.subscribe("onRendered", ({ pathChanged, toLocation }) => {
				if (pathChanged) {
					focarNoTitulo(toLocation.hash);
				}
			}),
		[router],
	);

	return null;
}
