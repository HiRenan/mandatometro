import { type RefObject, useEffect, useRef } from "react";
import { semCliqueDuplo } from "@/lib/clique";
import {
	ligarSom,
	MUSICA,
	pararSons,
	useSom,
	VOLUME_DA_MUSICA,
} from "@/lib/jogo/som";

/**
 * Liga e desliga o som do jogo. Ele vem ligado, e quem não quiser desliga aqui
 * (docs/jogo-das-comissoes.md). A trilha de fundo começa no primeiro
 * acionamento dentro do palco, como o "Começar pela primeira cena". O que o
 * som marca também está em palavras na tela.
 */
export function BotaoDeSom({
	palco,
}: {
	palco: RefObject<HTMLDivElement | null>;
}) {
	const ligado = useSom();
	const musica = useRef<HTMLAudioElement>(null);
	const interagiu = useRef(false);

	useEffect(() => {
		const toca = musica.current;
		const areaDoJogo = palco.current;
		if (!toca || !areaDoJogo) {
			return;
		}
		toca.volume = VOLUME_DA_MUSICA;

		const tentar = () => {
			if (ligado && toca.paused) {
				void toca.play()?.catch(() => undefined);
			}
		};

		const aoInteragir = () => {
			interagiu.current = true;
			tentar();
		};

		const silenciar = () => {
			toca.pause();
			pararSons();
		};

		const aoSairDoDocumento = () => {
			interagiu.current = false;
			silenciar();
		};

		// O clique nativo chega depois de o navegador aceitar o toque e é o
		// mesmo evento que Enter e Espaço disparam ao acionar um botão.
		areaDoJogo.addEventListener("click", aoInteragir, true);
		window.addEventListener("pagehide", aoSairDoDocumento);
		if (interagiu.current) {
			tentar();
		}

		return () => {
			areaDoJogo.removeEventListener("click", aoInteragir, true);
			window.removeEventListener("pagehide", aoSairDoDocumento);
			silenciar();
		};
	}, [ligado, palco]);

	return (
		<div className="jogo-som">
			<button
				type="button"
				className="acao-de-texto"
				onClick={semCliqueDuplo(() => ligarSom(!ligado))}
			>
				{ligado ? "Desligar o som" : "Ligar o som"}
			</button>
			{/* biome-ignore lint/a11y/useMediaCaption: a trilha de fundo não tem fala, e o que o som marca está em palavras na tela. */}
			<audio ref={musica} src={MUSICA} loop preload="none" />
		</div>
	);
}
