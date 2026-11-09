import { useSyncExternalStore } from "react";

// O progresso fica só no navegador, sem conta: a lista dos ids dos artigos lidos.
const CHAVE = "mandatometro:artigos-lidos";

const VAZIO: ReadonlySet<string> = new Set();

type ArtigoComId = { trilha: string; slug: string };

// Quando o navegador bloqueia o localStorage, o lido vale até sair da página.
let emMemoria: string | null = null;
let ultimo: { bruto: string | null; lidos: ReadonlySet<string> } = {
	bruto: null,
	lidos: VAZIO,
};
const ouvintes = new Set<() => void>();

export function idDoArtigo(artigo: ArtigoComId): string {
	return `${artigo.trilha}/${artigo.slug}`;
}

function lerBruto(): string | null {
	try {
		return window.localStorage.getItem(CHAVE) ?? emMemoria;
	} catch {
		return emMemoria;
	}
}

function interpretar(bruto: string | null): ReadonlySet<string> {
	if (bruto === null) {
		return VAZIO;
	}
	try {
		const valor: unknown = JSON.parse(bruto);
		if (!Array.isArray(valor)) {
			return VAZIO;
		}
		return new Set(valor.filter((id) => typeof id === "string"));
	} catch {
		return VAZIO;
	}
}

/** Lê os ids dos artigos lidos. Devolve o mesmo objeto enquanto nada muda. */
export function lerLidos(): ReadonlySet<string> {
	const bruto = lerBruto();
	if (bruto !== ultimo.bruto) {
		ultimo = { bruto, lidos: interpretar(bruto) };
	}
	return ultimo.lidos;
}

export function marcarLido(id: string): void {
	const lidos = lerLidos();
	if (lidos.has(id)) {
		return;
	}
	const bruto = JSON.stringify([...lidos, id]);
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

/**
 * Os artigos lidos neste navegador. No servidor e na hidratação, a lista vem
 * vazia; o progresso aparece logo depois, sem erro de hidratação.
 */
export function useArtigosLidos(): ReadonlySet<string> {
	return useSyncExternalStore(assinar, lerLidos, () => VAZIO);
}

export function primeiroNaoLido<T extends ArtigoComId>(
	artigos: readonly T[],
	lidos: ReadonlySet<string>,
): T | undefined {
	return artigos.find((artigo) => !lidos.has(idDoArtigo(artigo)));
}

export function contarLidos(
	artigos: readonly ArtigoComId[],
	lidos: ReadonlySet<string>,
): number {
	return artigos.filter((artigo) => lidos.has(idDoArtigo(artigo))).length;
}
