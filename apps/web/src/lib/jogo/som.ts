import { useSyncExternalStore } from "react";

/**
 * O som do jogo vem ligado, e quem não quiser desliga no botão do pé do palco.
 * A preferência fica neste navegador, numa chave só dela, e não diz nada sobre
 * quem está jogando. O texto na tela continua funcionando sozinho, sem o som
 * (docs/jogo-das-comissoes.md).
 *
 * O navegador só deixa tocar depois de um toque ou de uma tecla: a trilha de
 * fundo começa no primeiro clique da pessoa, não ao abrir a página
 * (components/jogo/botao-de-som.tsx).
 */
const CHAVE = "mandatometro:jogo-som";

const LIGADO = "ligado";

const DESLIGADO = "desligado";

/** Os efeitos de public/jogo/audio/, pelo que cada um marca na tela. */
const EFEITOS = {
	texto: "sfx-texto",
	carimbo: "sfx-carimbo",
	campainha: "sfx-campainha",
	painel: "sfx-painel",
	revelacao: "sfx-revelacao",
} as const;

export type Efeito = keyof typeof EFEITOS;

/** A trilha de fundo, que a tela toca em loop enquanto o som está ligado. */
export const MUSICA = "/jogo/audio/musica-tema.ogg";

const VOLUME_DO_EFEITO = 0.5;

export const VOLUME_DA_MUSICA = 0.25;

// Quando o navegador não deixa gravar no localStorage, a escolha vale até a
// pessoa sair da página, como nas respostas do quiz (respostas-do-quiz.ts).
let emMemoria: string | null = null;
const ouvintes = new Set<() => void>();

export function enderecoDoEfeito(efeito: Efeito): string {
	return `/jogo/audio/${EFEITOS[efeito]}.ogg`;
}

function lerBruto(): string | null {
	if (emMemoria !== null) {
		return emMemoria;
	}
	try {
		return window.localStorage.getItem(CHAVE);
	} catch {
		return null;
	}
}

/** Se o som está ligado neste navegador. Sem escolha guardada, está ligado. */
export function lerSom(): boolean {
	return lerBruto() !== DESLIGADO;
}

export function ligarSom(ligado: boolean): void {
	const bruto = ligado ? LIGADO : DESLIGADO;
	try {
		window.localStorage.setItem(CHAVE, bruto);
		emMemoria = null;
	} catch {
		emMemoria = bruto;
	}
	for (const avisar of ouvintes) {
		avisar();
	}
}

function assinar(avisar: () => void): () => void {
	const aoMudarEmOutraAba = (evento: StorageEvent) => {
		if (evento.key === CHAVE || evento.key === null) {
			avisar();
		}
	};
	ouvintes.add(avisar);
	window.addEventListener("storage", aoMudarEmOutraAba);
	return () => {
		ouvintes.delete(avisar);
		window.removeEventListener("storage", aoMudarEmOutraAba);
	};
}

function comoNasce(): boolean {
	return true;
}

/**
 * Se o som está ligado. No servidor, vale o padrão; a escolha guardada neste
 * navegador aparece na hidratação, sem erro.
 */
export function useSom(): boolean {
	return useSyncExternalStore(assinar, lerSom, comoNasce);
}

/**
 * Toca um efeito, se a pessoa ligou o som. Com o som desligado, não cria nem
 * baixa nada. A falha do navegador em tocar não interrompe o jogo.
 */
export function tocar(efeito: Efeito): void {
	if (!lerSom() || typeof Audio !== "function") {
		return;
	}
	try {
		const som = new Audio(enderecoDoEfeito(efeito));
		som.volume = VOLUME_DO_EFEITO;
		void som.play()?.catch(() => undefined);
	} catch {
		// Sem som, o jogo segue: a tela diz tudo em palavras.
	}
}
