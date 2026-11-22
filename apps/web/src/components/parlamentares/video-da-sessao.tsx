import { useEffect, useRef, useState } from "react";
import type { DetalheVotacao } from "@/client";
import { formatarData } from "@/lib/formatar";
import {
	BLOCO_DO_VIDEO,
	enderecoDoPlayer,
	enderecoNoYoutube,
	idDoVideo,
	PUBLICADO_POR,
} from "@/lib/parlamentares/video";
import { NOME_DA_CASA } from "@/lib/parlamentares/votos";

/**
 * O vídeo da sessão, na página da votação, depois do placar (a Atena, pelo
 * Renan, em 22/11/2026: a capa desenhada no código). A capa é um link para o
 * vídeo no YouTube, que vale sem o JavaScript; com ele, o toque põe no lugar o
 * player do youtube-nocookie.com, que já começa a tocar, e o foco vai para ele.
 * Nada do YouTube carrega antes do toque.
 *
 * A caixa guarda a proporção 16:9 desde o servidor. Com a letra grande numa
 * tela estreita, a capa cresce para caber o texto; depois do toque, ela fica na
 * caixa, escondida e fora do teclado, e o player ocupa a mesma altura: nada pula.
 *
 * Sem vídeo, ou com um endereço fora do contrato, o bloco não aparece.
 */
export function VideoDaSessao({ votacao }: { votacao: DetalheVotacao }) {
	const [tocando, setTocando] = useState(false);
	const player = useRef<HTMLIFrameElement>(null);
	const id = idDoVideo(votacao.url_video);

	useEffect(() => {
		if (tocando) {
			player.current?.focus();
		}
	}, [tocando]);

	if (!id) {
		return null;
	}
	const dia = formatarData(votacao.data.slice(0, 10));
	return (
		<section aria-labelledby={BLOCO_DO_VIDEO} className="video-da-sessao">
			<h2
				id={BLOCO_DO_VIDEO}
				className="subtitulo-condensado letra-com-teto [--palavra:3.22]"
			>
				Vídeo da sessão
			</h2>
			<div className="caixa-do-video">
				<a
					href={enderecoNoYoutube(id)}
					inert={tocando}
					className="capa-do-video"
					onClick={(evento) => {
						// O Ctrl, o Shift e o botão do meio abrem o YouTube, como num link.
						if (
							evento.button !== 0 ||
							evento.metaKey ||
							evento.ctrlKey ||
							evento.shiftKey ||
							evento.altKey
						) {
							return;
						}
						evento.preventDefault();
						setTocando(true);
					}}
				>
					<span className="azulejo-do-play">
						<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
							<path d="M8 5.5v13l10.5-6.5z" />
						</svg>
					</span>
					<span className="texto-da-capa">
						<span className="chamada-do-video">
							Assistir ao vídeo da sessão
						</span>{" "}
						<span className="rotulo linha-da-capa">
							Sessão de {dia} · {NOME_DA_CASA[votacao.casa]} · YouTube
						</span>
					</span>
				</a>
				{tocando && (
					<iframe
						ref={player}
						src={enderecoDoPlayer(id)}
						title={`Vídeo da sessão de ${dia}, no YouTube`}
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowFullScreen
						referrerPolicy="strict-origin-when-cross-origin"
						className="player-do-video"
					/>
				)}
			</div>
			<p className="nota-do-video">
				O vídeo é da sessão inteira do Plenário, publicado{" "}
				{PUBLICADO_POR[votacao.casa]} no YouTube, e não começa no momento desta
				votação. O player do YouTube, do Google, só carrega depois do toque.
			</p>
		</section>
	);
}
