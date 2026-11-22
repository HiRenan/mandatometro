import { createFileRoute } from "@tanstack/react-router";
import { FormularioConta, titulos } from "@/components/formulario-conta";

export const Route = createFileRoute("/cadastro/confirmar")({
	head: () => ({
		meta: [
			{ title: `${titulos.confirmar} · Mandatômetro` },
			{ name: "robots", content: "noindex" },
			{ name: "referrer", content: "no-referrer" },
		],
	}),
	headers: () => ({
		"Cache-Control": "no-store",
		"Referrer-Policy": "no-referrer",
	}),
	component: () => <FormularioConta modo="confirmar" />,
});
