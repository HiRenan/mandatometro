import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { consultarPerfil } from "@/client";
import { ENV } from "@/env";

export const Route = createFileRoute("/perfil")({
	head: () => ({
		meta: [
			{ title: "Meu perfil | Mandatômetro" },
			{ name: "robots", content: "noindex" },
		],
	}),
	headers: () => ({ "Cache-Control": "no-store" }),
	component: Perfil,
});

function Perfil() {
	const [nome, setNome] = useState("");
	const [falhou, setFalhou] = useState(false);
	useEffect(() => {
		if (!ENV.API_URL) {
			window.location.replace("/cadastro");
			return;
		}
		const controle = new AbortController();
		consultarPerfil({
			credentials: "include",
			cache: "no-store",
			signal: AbortSignal.any([controle.signal, AbortSignal.timeout(15000)]),
		}).then(({ data, response }) => {
			if (controle.signal.aborted) return;
			if (response?.status === 401) window.location.replace("/cadastro");
			else if (data) setNome(data.nome);
			else setFalhou(true);
		});
		return () => controle.abort();
	}, []);
	return (
		<section className="px-margem-celular text-tinta mx-auto grid max-w-xl gap-6 py-12">
			<h1 className="titulo-condensado letra-com-teto [--palavra:5]">
				Meu perfil
			</h1>
			{nome ? (
				<>
					<p>{nome}</p>
					<a href="/cadastro/excluir" className="acao-de-texto">
						Excluir conta
					</a>
				</>
			) : falhou ? (
				<p role="alert">
					Não foi possível consultar sua conta.{" "}
					<a href="/perfil" className="underline">
						Tentar novamente
					</a>
				</p>
			) : (
				<p role="status">Verificando sua sessão…</p>
			)}
		</section>
	);
}
