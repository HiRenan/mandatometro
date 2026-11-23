import { useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ENV } from "@/env";
import {
	consultarNumerosPainel,
	type NumerosPainel,
} from "@/lib/contrato-da-297";
import { acessoRecusado, falhaDe, opcoes, pedir } from "./pedido";

// O estado da tela dos números (/painel/numeros). Os números ficam só aqui, na
// memória da página: nada deles vai para o console, a URL, o armazenamento do
// navegador, o router ou o React Query. O pedido leva o cookie da sessão, que é
// da API, e não fica no cache do navegador (pedido.ts).

export type Numeros =
	| { tipo: "carregando" }
	| { tipo: "sem-api" }
	| { tipo: "falhou"; mensagem: string }
	/** Os números e a hora em que chegaram, em ISO. */
	| { tipo: "abertos"; numeros: NumerosPainel; lidosEm: string }
	/** A API respondeu 401 ou 404 e a guarda está conferindo o acesso de novo. */
	| { tipo: "saiu" };

/**
 * Os números do site e do sistema, para a administradora. A página só monta
 * depois da guarda do layout (_autenticado.tsx), e só então os números são
 * pedidos.
 *
 * Um 401 ou 404 tira os números da tela na hora. A guarda roda de novo
 * (router.invalidate) e decide se a página pode voltar; se puder, os números são
 * pedidos de novo.
 */
export function useNumeros() {
	const router = useRouter();
	const [numeros, setNumeros] = useState<Numeros>({ tipo: "carregando" });
	const controle = useRef<AbortController>(null);

	const carregar = useMemo(() => {
		async function carregar(): Promise<void> {
			if (!ENV.API_URL) {
				setNumeros({ tipo: "sem-api" });
				return;
			}
			const sinal = controle.current?.signal ?? AbortSignal.abort();
			setNumeros({ tipo: "carregando" });
			const resposta = await pedir(consultarNumerosPainel(opcoes(sinal)));
			if (sinal.aborted) {
				return;
			}
			if (resposta.tipo === "ok") {
				setNumeros({
					tipo: "abertos",
					numeros: resposta.dados,
					lidosEm: new Date().toISOString(),
				});
			} else if (resposta.tipo === "erro" && acessoRecusado(resposta.status)) {
				setNumeros({ tipo: "saiu" });
				await router.invalidate();
				// Se a guarda deixou passar, ela ainda é administradora, e a página segue
				// montada: os números voltam.
				if (!sinal.aborted) {
					await carregar();
				}
			} else {
				setNumeros({ tipo: "falhou", mensagem: falhaDe(resposta) });
			}
		}
		return carregar;
	}, [router]);

	useEffect(() => {
		const novo = new AbortController();
		controle.current = novo;
		void carregar();
		return () => novo.abort();
	}, [carregar]);

	return { numeros, carregar };
}
