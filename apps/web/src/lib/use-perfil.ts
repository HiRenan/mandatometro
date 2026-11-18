import { useEffect, useState } from "react";
import { consultarPerfil } from "@/client";
import { ENV } from "@/env";

type Sessao =
	| { estado: "verificando" | "visitante" | "indisponivel" }
	| { estado: "autenticada"; nome: string };

export function usePerfil(pagina: "login" | "perfil") {
	const [sessao, setSessao] = useState<Sessao>({ estado: "verificando" });
	useEffect(() => {
		const controle = new AbortController();
		async function verificar() {
			if (!ENV.API_URL) {
				setSessao({ estado: "indisponivel" });
				return;
			}
			const { data, response } = await consultarPerfil({
				credentials: "include",
				cache: "no-store",
				signal: AbortSignal.any([controle.signal, AbortSignal.timeout(15000)]),
			});
			if (controle.signal.aborted) return;
			if (response?.status === 401) {
				if (pagina === "perfil") window.location.replace("/login");
				else setSessao({ estado: "visitante" });
			} else if (data) {
				if (pagina === "login") window.location.replace("/perfil");
				else setSessao({ estado: "autenticada", nome: data.nome });
			} else setSessao({ estado: "indisponivel" });
		}
		void verificar().catch(() => {
			if (!controle.signal.aborted) setSessao({ estado: "indisponivel" });
		});
		return () => controle.abort();
	}, [pagina]);
	return sessao;
}
