import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Um aviso para o leitor de tela, dado no momento em que a coisa acontece, como
 * "Você leu este artigo.". A região já vem vazia no HTML do servidor, porque o
 * leitor de tela só anuncia o que muda numa região que já estava na página. O
 * texto sai depois de alguns segundos, para não ser lido de novo, junto com o
 * aviso que está na tela, quando a pessoa percorre a página.
 */
export function useAviso() {
	const [aviso, setAviso] = useState("");
	const relogio = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => () => clearTimeout(relogio.current), []);

	const avisar = useCallback((texto: string) => {
		clearTimeout(relogio.current);
		setAviso(texto);
		relogio.current = setTimeout(() => setAviso(""), 7000);
	}, []);

	return { aviso, avisar };
}

export function Aviso({ texto }: { texto: string }) {
	return (
		<p role="status" className="sr-only">
			{texto}
		</p>
	);
}
