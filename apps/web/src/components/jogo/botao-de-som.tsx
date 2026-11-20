import { useEffect, useRef } from "react";
import { semCliqueDuplo } from "@/lib/clique";
import { ligarSom, MUSICA, useSom, VOLUME_DA_MUSICA } from "@/lib/jogo/som";

/**
 * Liga e desliga o som do jogo. Ele começa desligado e só toca depois do
 * clique: a trilha de fundo nunca começa sozinha, e o `preload="none"` só baixa
 * o arquivo quando a pessoa pede. O que o som marca também está em palavras na
 * tela (docs/jogo-das-comissoes.md).
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
		if (ligado) {
			void toca.play?.()?.catch(() => undefined);
		} else {
			toca.pause?.();
		}
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
