import { createFileRoute } from "@tanstack/react-router";
import { PaginaDasOpinioes } from "@/components/painel/pagina-das-opinioes";

export const Route = createFileRoute("/_autenticado/painel_/opinioes")({
	head: () => ({ meta: [{ title: "Opiniões sobre o site | Mandatômetro" }] }),
	component: PaginaDasOpinioes,
});
