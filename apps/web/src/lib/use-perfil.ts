import { useEffect, useState } from "react";
import { consultarPerfil, type PerfilConta } from "@/client";
import { ENV } from "@/env";
import {
	contextoDoProgresso,
	reconhecerSessaoDoProgresso,
	useContextoDoProgresso,
} from "./progresso";

type Sessao =
	| { estado: "verificando" | "visitante" | "indisponivel" }
	| {
			estado: "autenticada";
			nome: string;
			papel: PerfilConta["papel"];
			/** A chave da sessão do progresso neste navegador quando a conta respondeu. */
			chave: string | null;
	  };

const VERIFICANDO: Sessao = { estado: "verificando" };

export function usePerfil(pagina: "login" | "perfil") {
	const [sessao, setSessao] = useState<Sessao>(VERIFICANDO);
	// A saída e a exclusão da conta apagam a chave da sessão do progresso em
	// todas as abas deste navegador, como o 401 da sincronização, e uma entrada
	// nova troca a chave (lib/progresso.ts). Se a chave muda depois de a conta
	// responder, a sessão desta página acabou: o perfil sai da tela e vai para o
	// /login, sem pedido novo à API.
	const { sessao: chave } = useContextoDoProgresso();
	const encerrada = sessao.estado === "autenticada" && sessao.chave !== chave;
	useEffect(() => {
		if (encerrada) window.location.replace("/login");
	}, [encerrada]);
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
				else {
					reconhecerSessaoDoProgresso();
					setSessao({
						estado: "autenticada",
						nome: data.nome,
						papel: data.papel,
						chave: contextoDoProgresso().sessao,
					});
				}
			} else setSessao({ estado: "indisponivel" });
		}
		void verificar().catch(() => {
			if (!controle.signal.aborted) setSessao({ estado: "indisponivel" });
		});
		return () => controle.abort();
	}, [pagina]);
	return encerrada ? VERIFICANDO : sessao;
}
