import { createFileRoute, Outlet } from "@tanstack/react-router";
import { VerificandoSessao } from "@/components/painel/verificando-sessao";
import { exigirAdministradora } from "@/lib/painel/acesso";

// O layout das páginas da administradora, sem caminho próprio: hoje, só o
// /painel. O cookie da sessão é da API, e o servidor do site nunca o recebe:
// a guarda (o beforeLoad) e as páginas rodam só no navegador (ssr: false), e o
// servidor manda só o "Verificando sua sessão…".
//
// O head e os headers ficam aqui, e não na página: com o ssr: false, o servidor
// para nesta rota e só roda o head e os headers dela e das rotas de cima. A
// página não é pública, não entra no sitemap e não fica no cache.
export const Route = createFileRoute("/_autenticado")({
	ssr: false,
	beforeLoad: ({ abortController }) =>
		exigirAdministradora({ abortController }),
	head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
	headers: () => ({
		"X-Robots-Tag": "noindex",
		"Cache-Control": "no-store",
	}),
	pendingComponent: VerificandoSessao,
	component: Outlet,
});
