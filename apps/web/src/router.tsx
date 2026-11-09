import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import Loader from "./components/loader";
import { NaoEncontrado } from "./components/nao-encontrado";
import { PaginaDeErro } from "./components/pagina-de-erro";
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
	});
	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
