import { createFileRoute } from "@tanstack/react-router";
import { FormularioConta, titulos } from "@/components/formulario-conta";

export const Route = createFileRoute("/cadastro/recuperar")({
	head: () => ({
		meta: [
			{ title: `${titulos.recuperar} · Mandatômetro` },
			{ name: "robots", content: "noindex" },
			{ name: "referrer", content: "no-referrer" },
		],
	}),
	headers: () => ({
		"Cache-Control": "no-store",
		"Referrer-Policy": "no-referrer",
	}),
	component: () => <FormularioConta modo="recuperar" />,
});
