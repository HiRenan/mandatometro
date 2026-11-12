import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import Loader from "./components/loader";
import { NaoEncontrado } from "./components/nao-encontrado";
import { PaginaDeErro } from "./components/pagina-de-erro";
import {
	molduraNaTela,
	tiposDaTroca,
	trilhaDoArtigoAberto,
} from "./lib/troca-de-pagina";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
	// Um QueryClient por router: no SSR, cada requisição tem o seu e não vê o cache de outra.
	const queryClient = new QueryClient();
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		context: { queryClient },
		defaultPendingComponent: () => <Loader />,
		defaultNotFoundComponent: NaoEncontrado,
		// Quando uma página não chega (a rede caiu ou o servidor falhou), a página de
		// erro aparece no lugar dela, dentro do site.
		defaultErrorComponent: PaginaDeErro,
		// Na troca de página, a folha da tela é arrancada, como na folhinha de
		// parede, e voltar na trilha devolve a folha ao bloco (lib/troca-de-pagina.ts
		// e index.css). A primeira carga e o "Tentar de novo" da página de erro não
		// animam.
		defaultViewTransition: {
			types: (troca): string[] | false =>
				tiposDaTroca(troca, {
					trilhaAberta: trilhaDoArtigoAberto(router.state.matches),
					molduraNaTela: molduraNaTela(),
				}),
		},
	});
	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
