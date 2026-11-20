import { createFileRoute } from "@tanstack/react-router";
import { PaginaDoPainel } from "@/components/painel/pagina-do-painel";

// A revisão da edição da semana, só para a administradora. A guarda, o head
// do robots e os headers ficam no layout (routes/_autenticado.tsx); o título
// da aba só aparece no navegador, depois da guarda.
export const Route = createFileRoute("/_autenticado/painel")({
	head: () => ({ meta: [{ title: "Revisão da edição | Mandatômetro" }] }),
	component: PaginaDoPainel,
});
