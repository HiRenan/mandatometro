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

function Login() {
	const sessao = usePerfil("login");
	if (sessao.estado === "visitante") return <FormularioConta modo="login" />;
	return (
		<section className="px-margem-celular text-tinta mx-auto grid max-w-xl gap-6 py-12">
			<h1 className="titulo-condensado letra-com-teto [--palavra:6]">
				Entrar na conta
			</h1>
			{sessao.estado === "indisponivel" ? (
				<p role="alert">
					Não foi possível consultar sua conta.{" "}
					<a href="/login" className="underline">
						Tentar novamente
					</a>
				</p>
			) : (
				<p role="status">Verificando sua sessão…</p>
			)}
		</section>
	);
}
