import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { sairConta } from "@/client";
import { encerrarProgressoNaConta } from "@/lib/progresso";
import { usePerfil } from "@/lib/use-perfil";

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
	const sessao = usePerfil("perfil");
	const [saida, setSaida] = useState<"pronta" | "enviando" | "falhou">(
		"pronta",
	);
	async function sair() {
		setSaida("enviando");
		try {
			const { response } = await sairConta({
				credentials: "include",
				signal: AbortSignal.timeout(15000),
			});
			if (response?.ok) {
				encerrarProgressoNaConta();
				window.location.replace("/login");
				return;
			}
			setSaida("falhou");
		} catch {
			setSaida("falhou");
		}
	}

	return (
		<section className="px-margem-celular text-tinta mx-auto grid max-w-xl gap-6 py-12">
			<h1 className="titulo-condensado letra-com-teto [--palavra:5]">
				Meu perfil
			</h1>
			{sessao.estado === "autenticada" ? (
				<>
					<p>{sessao.nome}</p>
					<button
						type="button"
						className="acao-de-texto"
						disabled={saida === "enviando"}
						onClick={sair}
					>
						Sair
					</button>
					{saida === "falhou" && (
						<p role="alert">Não foi possível sair. Tente novamente.</p>
					)}
					<a href="/cadastro/excluir" className="acao-de-texto">
						Excluir conta
					</a>
				</>
			) : sessao.estado === "indisponivel" ? (
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
