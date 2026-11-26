import { useSyncExternalStore } from "react";
import { enderecoDaVoz, temVoz } from "./vozes";

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

type Efeito = keyof typeof EFEITOS;

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

// A narração da fala da vez. É uma por vez: a fala nova para a anterior, para
// duas vozes não falarem juntas.
let narrando: HTMLAudioElement | undefined;
const efeitosEmCurso = new Set<HTMLAudioElement>();

const VOLUME_DA_VOZ = 1;

/**
 * Toca a narração de uma fala, se ela foi gravada e o som está ligado. A lista
 * do que tem voz vem de vozes.ts, que o `pnpm --filter web vozes` refaz.
 */
export function tocarVoz(jogo: string, id: string): void {
	pararVoz();
	if (!lerSom() || !temVoz(jogo, id) || typeof Audio !== "function") {
		return;
	}
	try {
		narrando = new Audio(enderecoDaVoz(jogo, id));
		narrando.volume = VOLUME_DA_VOZ;
		void narrando.play()?.catch(() => undefined);
	} catch {
		// Sem a narração, a fala continua escrita na tela.
	}
}

/** Para a narração da fala, quando a pessoa avança ou sai da página. */
export function pararVoz(): void {
	try {
		narrando?.pause();
	} catch {
		// O navegador já pode ter soltado o áudio.
	}
	narrando = undefined;
}

/** Silencia o que já começou a tocar quando a pessoa desliga o som ou sai. */
export function pararSons(): void {
	pararVoz();
	for (const som of efeitosEmCurso) {
		som.pause();
	}
	efeitosEmCurso.clear();
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
		const soltar = () => efeitosEmCurso.delete(som);
		som.onended = soltar;
		som.onerror = soltar;
		const tocando = som.play();
		efeitosEmCurso.add(som);
		void tocando?.catch(soltar);
	} catch {
		// Sem som, o jogo segue: a tela diz tudo em palavras.
	}
}
