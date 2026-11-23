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

import { ProvedorDaBusca } from "../components/busca";
import { CliqueNaTroca } from "../components/clique-na-troca";
import Header, { MarcaDaConta } from "../components/header";
import { Rodape } from "../components/rodape";
import { ENV } from "../env";
import appCss from "../index.css?url";
import { focarNoTitulo, outraPagina } from "../lib/foco";
import {
	cabecalhosDaPagina,
	metaDaImagem,
	preloadDaFonte,
	TITULO_DE_ERRO,
	TITULO_NAO_ENCONTRADA,
} from "../lib/meta";
import {
	acompanharProgressoDaConta,
	relerProgressoDaConta,
} from "../lib/progresso";
import { acompanharVisitas } from "../lib/visitas";

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
			// A cor da barra do navegador no celular segue o bloco de tinta do cabeçalho.
			{ name: "theme-color", content: "#14161c" },
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
			// As fontes são pedidas junto com o CSS. Numa rede boa, chegam antes de o
			// texto aparecer, que já sai na letra certa; numa rede lenta, chegam depois,
			// e o texto ainda pula quando elas trocam a fonte reserva (o font-display:
			// swap do @fontsource). Todas as páginas usam as duas primeiras. A de
			// máquina é a do lema: todas as páginas a baixam,
			// porque o lema está no rodapé, mas o preload só vale onde ela aparece na
			// primeira tela. A partir de 1344 px (84rem, no index.css), é o lema do
			// cabeçalho; abaixo disso, só a página inicial a adianta, para a frase do
			// título (routes/index.tsx), e as outras a pedem pelo CSS, para o rodapé.
			...[fontes.archivo, fontes.literata].map((href) => preloadDaFonte(href)),
			preloadDaFonte(fontes.maquina, "(min-width: 84rem)"),
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
	const router = useRouter();
	useEffect(() => {
		const parar = acompanharProgressoDaConta();
		if (!parar) return;
		const pararNavegacao = router.subscribe(
			"onResolved",
			({ fromLocation, pathChanged }) => {
				if (fromLocation && pathChanged) relerProgressoDaConta();
			},
		);
		return () => {
			parar();
			pararNavegacao();
		};
	}, [router]);

	return (
		// O roteiro da conta marca o <html> antes da hidratação (components/header.tsx):
		// sem o suppressHydrationWarning, o React avisaria do atributo a mais.
		<html lang="pt-BR" suppressHydrationWarning>
			<head>
				{/* No <head>, o roteiro roda antes de o navegador ler o corpo da página.
				    O React põe a folha de estilo antes dele, e ele espera a folha
				    chegar, como a primeira pintura (docs/codigo-do-site.md). */}
				{ENV.API_URL ? <MarcaDaConta /> : null}
				<HeadContent />
			</head>
			<body>
				{/* O main estica: numa página curta, o rodapé fica no fim da tela. A
				    coluna tem a largura da tela: com a letra grande, uma palavra
				    comprida não alarga a página. Ela é também a caixa do teto dos
				    títulos (o caixa-do-teto, no index.css), que mede a página sem a
				    barra de rolagem: o 100vw conta a barra. */}
				{/* A busca, com o Ctrl+K, em todas as páginas: a entrada fica no
				    cabeçalho, e a caixa só entra na página quando abre
				    (components/busca.tsx). */}
				<ProvedorDaBusca comEdicoes={Boolean(ENV.API_URL)}>
					<div className="caixa-do-teto grid min-h-svh grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr_auto]">
						<Header comApi={Boolean(ENV.API_URL)} />
						<main id="conteudo" tabIndex={-1} className="focus:outline-none">
							{children}
						</main>
						<Rodape />
					</div>
				</ProvedorDaBusca>
				<FocoNaPaginaNova />
				{/* As páginas vistas, sem cookie, só onde o site fala com a API
				    (lib/visitas.ts). */}
				{ENV.API_URL ? <ContadorDeVisitas /> : null}
				{/* O clique feito durante a troca de página chega à página nova
				    (components/clique-na-troca.tsx). */}
				<CliqueNaTroca />
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
 * carga não mexe no foco. Outro estado na lista dos parlamentares também é
 * página nova (o outraPagina, em lib/foco.ts).
 */
function FocoNaPaginaNova() {
	const router = useRouter();

	useEffect(
		() =>
			router.subscribe("onRendered", ({ fromLocation, toLocation }) => {
				if (outraPagina(fromLocation, toLocation)) {
					focarNoTitulo(toLocation.hash);
				}
			}),
		[router],
	);

	return null;
}

/**
 * Cada página vista avisa a API uma vez: a da primeira carga e cada página nova
 * do router. O painel e as telas da conta não contam (lib/visitas.ts).
 */
function ContadorDeVisitas() {
	const router = useRouter();

	useEffect(() => acompanharVisitas(router), [router]);

	return null;
}
