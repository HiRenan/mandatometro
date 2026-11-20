import { useSyncExternalStore } from "react";
import type { PedidoProgresso } from "@/client";
import { ENV } from "@/env";

const CHAVE = "mandatometro:artigos-lidos";
const CHAVE_CONTA = "mandatometro:artigos-lidos-na-conta";
const CHAVE_SESSAO = "mandatometro:sessao-do-progresso";

const VAZIO: ReadonlySet<string> = new Set();
const ID_ARTIGO = /^[a-z0-9-]+\/[a-z0-9-]+$/;

type ArtigoComId = { trilha: string; slug: string };
type Sincronia = {
	chave: string;
	controle: AbortController;
	pendentes: Map<string, boolean>;
	inicial: boolean;
	ocupada: boolean;
	espelhar: boolean;
};

// Quando o navegador não deixa gravar no localStorage, o que a página gravou
// vale até a pessoa sair dela.
const emMemoria = new Map<string, string | null>();
let ultimo: { bruto: string | null; lidos: ReadonlySet<string> } = {
	bruto: null,
	lidos: VAZIO,
};
const ouvintes = new Set<() => void>();
const reiniciosDaConta = new WeakMap<readonly string[], string>();
let sincronia: Sincronia | undefined;

export function idDoArtigo(artigo: ArtigoComId): string {
	return `${artigo.trilha}/${artigo.slug}`;
}

function lerBruto(chave: string): string | null {
	const bruto = emMemoria.get(chave);
	if (bruto !== undefined) {
		return bruto;
	}
	try {
		return window.localStorage.getItem(chave);
	} catch {
		return null;
	}
}

function gravarBruto(chave: string, bruto: string | null): void {
	try {
		if (bruto === null) window.localStorage.removeItem(chave);
		else window.localStorage.setItem(chave, bruto);
		emMemoria.delete(chave);
	} catch {
		if (bruto === null && chave === CHAVE) emMemoria.delete(chave);
		else emMemoria.set(chave, bruto);
	}
}

function chaveDaSessao(): string | null {
	return ENV.API_URL ? lerBruto(CHAVE_SESSAO) : null;
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
	const daConta = chaveDaSessao() ? lerBruto(CHAVE_CONTA) : null;
	const bruto = daConta ?? lerBruto(CHAVE);
	if (bruto !== ultimo.bruto) {
		ultimo = { bruto, lidos: interpretar(bruto) };
	}
	return ultimo.lidos;
}

function avisarTodos(): void {
	for (const avisar of ouvintes) {
		avisar();
	}
}

function cancelarSincronia(): void {
	sincronia?.controle.abort();
	sincronia = undefined;
}

function esquecerSessao(apagarDoVisitante: boolean): void {
	cancelarSincronia();
	if (apagarDoVisitante) gravarBruto(CHAVE, null);
	gravarBruto(CHAVE_CONTA, null);
	gravarBruto(CHAVE_SESSAO, null);
	avisarTodos();
}

/** Chamado quando a API confirma a saída ou a exclusão da conta. */
export function encerrarProgressoNaConta(): void {
	if (ENV.API_URL) esquecerSessao(true);
}

/** O login bem-sucedido anota a sessão antes de navegar para o perfil. */
export function anotarEntradaNaConta(): void {
	if (!ENV.API_URL) return;
	if (chaveDaSessao()) esquecerSessao(true);
	// Sorteado no navegador a cada entrada para reconhecer respostas de uma
	// sessão anterior, sem usar dado da conta e sem enviar a chave à API.
	const chave = crypto.getRandomValues(new Uint32Array(4)).join("-");
	gravarBruto(CHAVE_SESSAO, chave);
	avisarTodos();
}

/** Reconhece também uma sessão iniciada antes de o site anotar as entradas. */
export function reconhecerSessaoDoProgresso(): void {
	if (!chaveDaSessao()) anotarEntradaNaConta();
	sincronizar();
}

function emSessao(estado: Sincronia): boolean {
	return !estado.controle.signal.aborted && chaveDaSessao() === estado.chave;
}

async function pedirProgresso(estado: Sincronia, body?: PedidoProgresso) {
	const { alterarProgressoConta, consultarProgressoConta } = await import(
		"@/client"
	);
	if (!emSessao(estado)) return;
	const opcoes = {
		credentials: "include",
		cache: "no-store",
		signal: AbortSignal.any([
			estado.controle.signal,
			AbortSignal.timeout(10000),
		]),
	} as const;
	const { data, response } = body
		? await alterarProgressoConta({ ...opcoes, body, keepalive: true })
		: await consultarProgressoConta(opcoes);
	if (!emSessao(estado)) return;
	if (response?.status === 401) esquecerSessao(false);
	else if (!data) estado.controle.abort();
	return data;
}

function idAceito(id: string): boolean {
	return id.length <= 128 && ID_ARTIGO.test(id);
}

async function enviar(estado: Sincronia): Promise<void> {
	estado.ocupada = true;
	try {
		if (estado.inicial) {
			// Só o progresso de visitante entra na união. O espelho da conta pode
			// estar atrasado e trazer de volta uma marca removida em outro aparelho.
			const visitante = lerBruto(CHAVE);
			const importar = [...interpretar(visitante)].filter(idAceito);
			const dados = await pedirProgresso(
				estado,
				importar.length ? { marcar: importar } : undefined,
			);
			if (!dados || !emSessao(estado)) return;
			estado.inicial = false;
			if (estado.espelhar) {
				const lidos = new Set(dados.lidos);
				for (const [id, marcado] of estado.pendentes) {
					if (marcado) lidos.add(id);
					else lidos.delete(id);
				}
				gravarBruto(CHAVE_CONTA, JSON.stringify([...lidos]));
			}
			if (visitante !== null && lerBruto(CHAVE) === visitante) {
				gravarBruto(CHAVE, null);
			}
			avisarTodos();
		}

		// Cada pedido termina antes de começar o próximo. Entre pedidos, só
		// importa a última ação que a pessoa fez em cada artigo.
		while (emSessao(estado) && estado.pendentes.size > 0) {
			const marcar: string[] = [];
			const desmarcar: string[] = [];
			for (const [id, marcado] of estado.pendentes) {
				(marcado ? marcar : desmarcar).push(id);
			}
			estado.pendentes.clear();
			if (!(await pedirProgresso(estado, { marcar, desmarcar }))) return;
		}
	} catch {
		estado.controle.abort();
	} finally {
		estado.ocupada = false;
	}
}

function sincronizar(ids: readonly string[] = [], marcado = true): void {
	const chave = chaveDaSessao();
	if (!chave) return;
	if (sincronia?.chave !== chave) {
		cancelarSincronia();
		sincronia = {
			chave,
			controle: new AbortController(),
			pendentes: new Map(),
			inicial: true,
			ocupada: false,
			espelhar: true,
		};
	}
	if (!emSessao(sincronia)) return;
	for (const id of ids) {
		if (idAceito(id)) sincronia.pendentes.set(id, marcado);
	}
	if (
		!sincronia.ocupada &&
		(sincronia.inicial || sincronia.pendentes.size > 0)
	) {
		void enviar(sincronia);
	}
}

export function acompanharProgressoDaConta(): (() => void) | undefined {
	if (!ENV.API_URL) return;
	sincronizar();
	const aoMudarSessao = (evento: StorageEvent) => {
		if (
			(evento.key === CHAVE_SESSAO || evento.key === null) &&
			sincronia?.chave !== chaveDaSessao()
		) {
			cancelarSincronia();
		}
	};
	const aoVoltar = (evento: PageTransitionEvent) => {
		if (evento.persisted && !sincronia?.ocupada) {
			cancelarSincronia();
			sincronizar();
		}
	};
	window.addEventListener("storage", aoMudarSessao);
	window.addEventListener("pageshow", aoVoltar);
	return () => {
		window.removeEventListener("storage", aoMudarSessao);
		window.removeEventListener("pageshow", aoVoltar);
	};
}

function gravar(
	ids: readonly string[],
	alterados: readonly string[],
	marcado: boolean,
): void {
	gravarBruto(chaveDaSessao() ? CHAVE_CONTA : CHAVE, JSON.stringify(ids));
	avisarTodos();
	sincronizar(alterados, marcado);
}

export function marcarLido(id: string): void {
	const lidos = lerLidos();
	if (!lidos.has(id)) {
		gravar([...lidos, id], [id], true);
	}
}

export function desmarcarLido(id: string): void {
	const lidos = lerLidos();
	if (lidos.has(id)) {
		gravar(
			[...lidos].filter((lido) => lido !== id),
			[id],
			false,
		);
	}
}

/** Apaga as marcas de lido de uma trilha e devolve as que apagou, para desfazer. */
export function recomecarTrilha(trilha: string): string[] {
	const lidos = [...lerLidos()];
	const daTrilha = (id: string) => id.startsWith(`${trilha}/`);
	const apagadas = lidos.filter(daTrilha);
	if (apagadas.length > 0) {
		const chave = chaveDaSessao();
		if (chave) reiniciosDaConta.set(apagadas, chave);
		gravar(
			lidos.filter((id) => !daTrilha(id)),
			apagadas,
			false,
		);
	}
	return apagadas;
}

/** Põe de volta as marcas apagadas, sem perder o que foi lido depois. */
export function restaurarLidos(ids: readonly string[]): void {
	const chave = reiniciosDaConta.get(ids);
	if (chave && chave !== chaveDaSessao()) return;
	const lidos = lerLidos();
	const faltam = ids.filter((id) => !lidos.has(id));
	if (faltam.length > 0) {
		gravar([...lidos, ...faltam], faltam, true);
	}
}

/**
 * Apaga todas as marcas de lido deste navegador, também as que só estavam na
 * memória, para outra pessoa começar do zero (lib/piloto.ts). Não se desfaz.
 */
export function apagarLidos(): void {
	gravarBruto(CHAVE, null);
	if (chaveDaSessao()) {
		gravarBruto(CHAVE_CONTA, null);
		// Uma resposta que já estava a caminho não desfaz a limpeza do piloto.
		if (sincronia) sincronia.espelhar = false;
	}
	avisarTodos();
}

function assinar(avisar: () => void): () => void {
	const aoMudarEmOutraAba = (evento: StorageEvent) => {
		if (
			evento.key === CHAVE ||
			evento.key === null ||
			(ENV.API_URL &&
				(evento.key === CHAVE_CONTA || evento.key === CHAVE_SESSAO))
		) {
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
