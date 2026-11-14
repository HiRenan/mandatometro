import { useEffect, useRef, useState } from "react";

export const CARREGANDO = "Carregando a página…";

/**
 * Os tempos do carregando, que o router.tsx passa ao router. Numa navegação, ele
 * só aparece se a página demorar mais de 1 s; no "Tentar de novo" da página de
 * erro, aparece na hora, porque o router não espera numa página que pediu de
 * novo. Quando aparece, fica pelo menos 0,5 s, para não piscar. São os tempos
 * padrão do TanStack Router, escritos aqui porque o DESIGN.md os cita (o Renan,
 * em 13/11/2026: "1 s, e fica 0,5 s").
 */
export const TEMPOS_DO_CARREGANDO = {
	defaultPendingMs: 1000,
	defaultPendingMinMs: 500,
} as const;

/**
 * O carregando: quando uma página demora, esta frase fica no lugar dela, no alto
 * do conteúdo, até ela chegar. É texto, sem ícone e sem giro, e não se mexe, com
 * ou sem o movimento reduzido (index.css).
 *
 * A região role="status" entra vazia e recebe a frase logo depois: o leitor de
 * tela só anuncia o que muda numa região que já estava na página. Se o foco
 * estava na página que saiu da tela (o "Tentar de novo" da página de erro, ou o
 * link que a pessoa tocou), ele vem para a frase, sem o anel; quando a página
 * chega, vai para o título dela (__root.tsx e pagina-de-erro.tsx). Um foco que
 * continua na tela, como o de um link do cabeçalho, fica onde está.
 *
 * O foco vem sem o preventScroll: com a letra grande, quem rolou até o "Tentar
 * de novo" ficava, sem a página, com o rodapé na tela e a frase acima dela.
 * Assim, o navegador rola até a frase; se ela já está na tela, nada rola.
 */
export function Carregando() {
	const [frase, setFrase] = useState("");
	const regiao = useRef<HTMLParagraphElement>(null);

	useEffect(() => {
		const focado = document.activeElement;
		const conteudo = document.getElementById("conteudo");
		if (!focado || focado === document.body || conteudo?.contains(focado)) {
			regiao.current?.focus();
		}
		setFrase(CARREGANDO);
	}, []);

	return (
		<p ref={regiao} role="status" tabIndex={-1} className="carregando rotulo">
			{frase}
		</p>
	);
}
