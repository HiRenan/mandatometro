import { createFileRoute } from "@tanstack/react-router";
import { FormularioConta } from "@/components/formulario-conta";
import { usePerfil } from "@/lib/use-perfil";

export const Route = createFileRoute("/login")({
	head: () => ({
		meta: [
			{ title: "Entrar na conta | Mandatômetro" },
			{ name: "robots", content: "noindex" },
		],
	}),
	headers: () => ({
		"Cache-Control": "no-store",
		"Referrer-Policy": "no-referrer",
	}),
	component: Login,
});

/**
 * O login confere a sessão antes de mostrar o formulário. Quem já entrou vai
 * para o /perfil (o usePerfil), e a tela fica na espera até lá.
 */
function Login() {
	const { estado } = usePerfil("login");
	return (
		<FormularioConta
			modo="login"
			sessao={
				estado === "visitante" || estado === "indisponivel"
					? estado
					: "verificando"
			}
		/>
	);
}
