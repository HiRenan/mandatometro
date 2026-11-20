import { createFileRoute, Outlet } from "@tanstack/react-router";
import { VerificandoSessao } from "@/components/painel/verificando-sessao";
import { exigirAdministradora } from "@/lib/painel/acesso";

// O layout das páginas da administradora, sem caminho próprio: hoje, só o
// /painel. Na hospedagem, o cookie da sessão é do host da API. A guarda (o
// beforeLoad) e as páginas rodam no navegador (ssr: false), e o servidor
// manda só o "Verificando sua sessão…", mesmo quando os hosts coincidem.
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
