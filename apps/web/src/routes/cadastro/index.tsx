import { createFileRoute } from "@tanstack/react-router";
import { FormularioConta, titulos } from "@/components/formulario-conta";

export const Route = createFileRoute("/cadastro/")({
	head: () => ({
		meta: [
			{ title: `${titulos.cadastro} · Mandatômetro` },
			{ name: "robots", content: "noindex" },
			{ name: "referrer", content: "no-referrer" },
		],
	}),
	headers: () => ({
		"Cache-Control": "no-store",
		"Referrer-Policy": "no-referrer",
	}),
	component: () => <FormularioConta modo="cadastro" />,
});
