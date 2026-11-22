import type { DetalheVotacao } from "@/client";

/**
 * O endereço do vídeo da sessão que a API entrega (o `url_video`): o watch do
 * YouTube, com o id de 11 caracteres, como a coleta guarda (a #272).
 */
const ENDERECO_DO_VIDEO =
	/^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})$/;

/** O id do bloco do vídeo na página da votação, para o link da edição. */
export const BLOCO_DO_VIDEO = "video-da-sessao";

/** Quem publica o vídeo da sessão, na nota do bloco. */
export const PUBLICADO_POR: Record<DetalheVotacao["casa"], string> = {
	camara: "pela Câmara dos Deputados",
	senado: "pelo Senado Federal",
};

/**
 * O id do vídeo, ou null quando o endereço não é o do contrato: aí, a votação
 * fica sem vídeo, e nenhum outro endereço vira player ou link.
 */
export function idDoVideo(endereco: unknown): string | null {
	if (typeof endereco !== "string") {
		return null;
	}
	return ENDERECO_DO_VIDEO.exec(endereco)?.[1] ?? null;
}

/**
 * O player, no youtube-nocookie.com, que só entra depois do toque e já começa
 * a tocar.
 */
export function enderecoDoPlayer(id: string) {
	return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
}

/** O vídeo no YouTube, para o link da capa, que vale sem o JavaScript. */
export function enderecoNoYoutube(id: string) {
	return `https://www.youtube.com/watch?v=${id}`;
}
