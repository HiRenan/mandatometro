import { useEffect, useRef } from "react";
import { semCliqueDuplo } from "@/lib/clique";
import { ligarSom, MUSICA, useSom, VOLUME_DA_MUSICA } from "@/lib/jogo/som";

/**
 * Liga e desliga o som do jogo. Ele vem ligado, e quem não quiser desliga aqui
 * (docs/jogo-das-comissoes.md). O navegador só deixa tocar depois de um toque
 * ou de uma tecla: a trilha de fundo não começa ao abrir a página, e sim no
 * primeiro clique da pessoa, como o "Começar pela primeira cena". O que o som
 * marca também está em palavras na tela.
 */
export function BotaoDeSom() {
	const ligado = useSom();
	const musica = useRef<HTMLAudioElement>(null);

	useEffect(() => {
		const toca = musica.current;
		if (!toca) {
			return;
		}
		toca.volume = VOLUME_DA_MUSICA;
		if (!ligado) {
			toca.pause?.();
			return;
		}
		const tentar = () => {
			void toca.play?.()?.catch(() => undefined);
		};
		tentar();
		// A primeira tentativa, ao abrir a página, é recusada pelo navegador: a
		// trilha entra no primeiro toque ou tecla, e a escuta sai depois dele.
		document.addEventListener("pointerdown", tentar, { once: true });
		document.addEventListener("keydown", tentar, { once: true });
		return () => {
			document.removeEventListener("pointerdown", tentar);
			document.removeEventListener("keydown", tentar);
		};
	}, [ligado]);

	return (
		<div className="jogo-som">
			<button
				type="button"
				className="acao-de-texto"
				aria-pressed={ligado}
				onClick={semCliqueDuplo(() => ligarSom(!ligado))}
			>
				{ligado ? "Desligar o som" : "Ligar o som"}
			</button>
			{/* biome-ignore lint/a11y/useMediaCaption: a trilha de fundo não tem fala, e o que o som marca está em palavras na tela. */}
			<audio ref={musica} src={MUSICA} loop preload="none" />
		</div>
	);
}
