import { useEffect } from "react";
import { cliqueDuranteATroca } from "@/lib/troca-de-pagina";

/**
 * O clique feito enquanto a página troca chega à página nova, em vez de se
 * perder (lib/troca-de-pagina.ts). Fica montado no documento de todas as
 * páginas (routes/__root.tsx) e não desenha nada.
 */
export function CliqueNaTroca() {
	useEffect(() => cliqueDuranteATroca(), []);

	return null;
}
