import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { Carregando, TEMPOS_DO_CARREGANDO } from "./components/carregando";
import { NaoEncontrado } from "./components/nao-encontrado";
import { PaginaDeErro } from "./components/pagina-de-erro";
import {
	molduraNaTela,
	tiposDaTroca,
	trilhaDaPaginaAberta,
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
		// Quando a página demora, a frase "Carregando a página…" fica no lugar dela:
		// numa navegação, depois de 1 s; no "Tentar de novo" da página de erro, na
		// hora. Quando aparece, fica pelo menos 0,5 s (components/carregando.tsx).
		defaultPendingComponent: Carregando,
		...TEMPOS_DO_CARREGANDO,
		defaultNotFoundComponent: NaoEncontrado,
		// Quando uma página não chega (a rede caiu ou o servidor falhou), a página de
		// erro aparece no lugar dela, dentro do site.
		defaultErrorComponent: PaginaDeErro,
		// Na troca de página, a página nova aparece azulejo por azulejo, e voltar na
		// trilha faz o giro ao contrário (lib/troca-de-pagina.ts e
		// estilos/movimento.css). A primeira carga e o "Tentar de novo" da página de
		// erro não animam.
		defaultViewTransition: {
			types: (troca): string[] | false =>
				tiposDaTroca(troca, {
					trilhaAberta: trilhaDaPaginaAberta(router.state.matches),
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
