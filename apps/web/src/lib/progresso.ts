import { useSyncExternalStore } from "react";
import type { PedidoProgresso } from "@/client";
import { ENV } from "@/env";

const CHAVE = "mandatometro:artigos-lidos";
const CHAVE_CONTA = "mandatometro:artigos-lidos-na-conta";
const CHAVE_SESSAO = "mandatometro:sessao-do-progresso";
const CHAVE_ACOES = "mandatometro:acoes-do-progresso";
const TRAVA = "mandatometro:sincronizar-progresso";
const INTERVALO_DE_RELEITURA = 30_000;

const VAZIO: ReadonlySet<string> = new Set();
const ID_ARTIGO = /^[a-z0-9-]+\/[a-z0-9-]+$/;

type ArtigoComId = { trilha: string; slug: string };
type Contexto = { sessao: string | null };
type Leitura = "documento" | "releitura";
type Acao = { marcado: boolean; versao: string };
type Sincronia = {
	chave: string;
	controle: AbortController;
	pendentes: Map<string, Acao>;
	leitura?: Leitura;
	ultimaReleitura: number;
	agendada: boolean;
	ordemLocal: Promise<void>;
	revisaoDoEspelho: number;
};

// Quando o navegador não deixa gravar no localStorage, o que a página gravou
// vale até a pessoa sair dela.
const emMemoria = new Map<string, string | null>();
let ultimo: { bruto: string | null; lidos: ReadonlySet<string> } = {
	bruto: null,
	lidos: VAZIO,
};
let ultimoComAcoes: ReadonlySet<string> = VAZIO;
const ouvintes = new Set<() => void>();
const reinicios = new WeakMap<readonly string[], Contexto>();
const VISITANTE: Contexto = { sessao: null };
let contextoAtual = VISITANTE;
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

export function contextoDoProgresso(): Contexto {
	const sessao = chaveDaSessao();
	if (contextoAtual.sessao !== sessao) contextoAtual = { sessao };
	return contextoAtual;
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

function lidosNoArmazenamento(chave: string | null): ReadonlySet<string> {
	const daConta = chave ? lerBruto(CHAVE_CONTA) : null;
	const bruto = daConta ?? lerBruto(CHAVE);
	if (bruto !== ultimo.bruto) {
		ultimo = { bruto, lidos: interpretar(bruto) };
	}
	return ultimo.lidos;
}

/** Lê os ids dos artigos lidos. Devolve o mesmo objeto enquanto nada muda. */
export function lerLidos(): ReadonlySet<string> {
	const chave = chaveDaSessao();
	const base = lidosNoArmazenamento(chave);
	if (!sincronia || sincronia.chave !== chave || sincronia.pendentes.size === 0)
		return base;

	// Outra aba pode ter atualizado a cópia compartilhada enquanto este
	// documento ainda tem uma ação pendente de uma falha temporária.
	const lidos = new Set(base);
	if (!aplicarAcoes(lidos, acoesVigentes(sincronia))) return base;
	if (
		lidos.size !== ultimoComAcoes.size ||
		[...lidos].some((id) => !ultimoComAcoes.has(id))
	) {
		ultimoComAcoes = lidos;
	}
	return ultimoComAcoes;
}

function avisarTodos(): void {
	contextoDoProgresso();
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
	// A outra aba recebe um evento por chave, na ordem destas gravações: a chave
	// da sessão sai antes da cópia da conta, e o perfil aberto lá vai para o
	// login sem mostrar, antes, a leitura vazia ao lado do nome.
	gravarBruto(CHAVE_SESSAO, null);
	gravarBruto(CHAVE_CONTA, null);
	gravarBruto(CHAVE_ACOES, null);
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
	gravarBruto(CHAVE_SESSAO, sortearChave());
	avisarTodos();
}

/** Reconhece também uma sessão iniciada antes de o site anotar as entradas. */
export function reconhecerSessaoDoProgresso(): void {
	if (!chaveDaSessao()) anotarEntradaNaConta();
	if (sincronia?.chave !== chaveDaSessao()) sincronizar();
}

function emSessao(estado: Sincronia): boolean {
	return !estado.controle.signal.aborted && chaveDaSessao() === estado.chave;
}

async function pedirProgresso(estado: Sincronia, body?: PedidoProgresso) {
	const signal = AbortSignal.any([
		estado.controle.signal,
		AbortSignal.timeout(10_000),
	]);
	async function fazerPedido() {
		const { alterarProgressoConta, consultarProgressoConta } = await import(
			"@/client"
		);
		signal.throwIfAborted();
		if (!emSessao(estado)) return;
		const opcoes = {
			credentials: "include",
			cache: "no-store",
			signal,
		} as const;
		return body
			? alterarProgressoConta({ ...opcoes, body, keepalive: true })
			: consultarProgressoConta(opcoes);
	}

	// O prazo também solta a trava se o carregamento do cliente ficar pendente.
	let abortar!: () => void;
	const cancelado = new Promise<never>((_, rejeitar) => {
		abortar = () => rejeitar(signal.reason);
		signal.addEventListener("abort", abortar, { once: true });
	});
	try {
		const resultado = await Promise.race([fazerPedido(), cancelado]);
		if (!resultado || !emSessao(estado)) return { retentar: false };
		const status = resultado.response?.status;
		if (status === 401) esquecerSessao(false);
		return {
			dados: resultado.data,
			retentar: status === undefined || status === 429 || status >= 500,
		};
	} catch {
		return { retentar: emSessao(estado) };
	} finally {
		signal.removeEventListener("abort", abortar);
	}
}

function idAceito(id: string): boolean {
	return id.length <= 128 && ID_ARTIGO.test(id);
}

function sortearChave(): string {
	return crypto.getRandomValues(new Uint32Array(4)).join("-");
}

function ultimasAcoes(): Map<string, string> {
	try {
		const valor: unknown = JSON.parse(lerBruto(CHAVE_ACOES) ?? "{}");
		if (valor && typeof valor === "object" && !Array.isArray(valor)) {
			return new Map(
				Object.entries(valor).filter(
					(entrada): entrada is [string, string] =>
						typeof entrada[1] === "string",
				),
			);
		}
	} catch {
		// O armazenamento pode vir de uma versão anterior ou estar corrompido.
	}
	return new Map();
}

function guardarVersoes(versoes: ReadonlyMap<string, string>): void {
	gravarBruto(
		CHAVE_ACOES,
		versoes.size ? JSON.stringify(Object.fromEntries(versoes)) : null,
	);
}

function acoesVigentes(estado: Sincronia): Map<string, Acao> {
	const versoes = ultimasAcoes();
	return new Map(
		[...estado.pendentes].filter(
			([id, acao]) => versoes.get(id) === acao.versao,
		),
	);
}

function dispensarVersoes(acoes: ReadonlyMap<string, Acao>): void {
	if (!acoes.size) return;
	const versoes = ultimasAcoes();
	for (const [id, acao] of acoes) {
		if (versoes.get(id) === acao.versao) versoes.delete(id);
	}
	guardarVersoes(versoes);
}

function aplicarAcoes(
	lidos: Set<string>,
	acoes: ReadonlyMap<string, Acao>,
): boolean {
	let mudou = false;
	for (const [id, { marcado }] of acoes) {
		if (lidos.has(id) === marcado) continue;
		if (marcado) lidos.add(id);
		else lidos.delete(id);
		mudou = true;
	}
	return mudou;
}

function espelharLeitura(
	estado: Sincronia,
	lidosNaConta: readonly string[],
	antes: ReadonlySet<string>,
): void {
	const lidos = new Set(lidosNaConta);
	const atuais = lidosNoArmazenamento(estado.chave);
	// A outra aba também mostra a ação assim que ela entra na fila.
	for (const id of antes) if (!atuais.has(id)) lidos.delete(id);
	for (const id of atuais) if (!antes.has(id)) lidos.add(id);
	aplicarAcoes(lidos, acoesVigentes(estado));
	gravarBruto(CHAVE_CONTA, JSON.stringify([...lidos]));
}

async function enviarPedido(
	estado: Sincronia,
	revisaoDoEspelho: number,
	antesDaEspera: ReadonlySet<string>,
): Promise<void> {
	if (!emSessao(estado)) return;
	const leitura = estado.leitura;
	estado.leitura = undefined;
	if (leitura === "releitura") estado.ultimaReleitura = performance.now();
	// Leia e consuma a chave de visitante com a trava adquirida. O espelho
	// pode conter marcas antigas e nunca entra na união.
	const visitante = lerBruto(CHAVE);
	const importar = [...interpretar(visitante)].filter(idAceito);
	let alteracoes = new Map<string, Acao>();
	if (!leitura || importar.length) {
		alteracoes = acoesVigentes(estado);
		estado.pendentes.clear();
		// Outra aba pode ter consultado o banco desde uma falha temporária.
		const lidos = new Set(lidosNoArmazenamento(estado.chave));
		if (aplicarAcoes(lidos, alteracoes)) {
			gravarBruto(CHAVE_CONTA, JSON.stringify([...lidos]));
			avisarTodos();
		}
	}
	const marcar = new Set(importar);
	const desmarcar: string[] = [];
	for (const [id, { marcado }] of alteracoes) {
		if (marcado) marcar.add(id);
		else {
			marcar.delete(id);
			desmarcar.push(id);
		}
	}
	const body = alteracoes.size
		? { marcar: [...marcar], desmarcar }
		: marcar.size
			? { marcar: [...marcar] }
			: undefined;
	if (!leitura && !body) return;
	// Ao abrir com ações já na fila, a leitura vem antes da escrita. Reserve
	// a vez da escrita antes de esperar a resposta da leitura.
	agendarPedido(estado);

	const { dados, retentar } = await pedirProgresso(estado, body);
	if (!emSessao(estado)) return;
	if (
		dados &&
		(leitura || importar.length) &&
		estado.revisaoDoEspelho === revisaoDoEspelho
	) {
		espelharLeitura(estado, dados.lidos, antesDaEspera);
	}
	if (!retentar || dados) {
		dispensarVersoes(alteracoes);
		if (visitante !== null && lerBruto(CHAVE) === visitante)
			gravarBruto(CHAVE, null);
		if (leitura || importar.length) avisarTodos();
		return;
	}
	// As ações que chegaram durante o pedido já reservaram uma nova vez.
	// Sem novo gatilho, o lote devolvido à fila fica só em memória.
	if (body) estado.pendentes = new Map([...alteracoes, ...estado.pendentes]);
}

function agendarPedido(estado: Sincronia): void {
	if (estado.agendada || (!estado.leitura && estado.pendentes.size === 0))
		return;
	estado.agendada = true;
	const antesDaEspera = lidosNoArmazenamento(estado.chave);
	const revisao = estado.revisaoDoEspelho;
	const trabalho = () => {
		estado.agendada = false;
		return enviarPedido(estado, revisao, antesDaEspera);
	};
	if (navigator.locks) {
		void navigator.locks
			.request(TRAVA, { signal: estado.controle.signal }, trabalho)
			.catch(() => {
				// Uma espera pela trava pode ser cancelada ao trocar de sessão.
				if (emSessao(estado)) estado.agendada = false;
			});
	} else {
		estado.ordemLocal = estado.ordemLocal.then(trabalho).catch(() => {});
	}
}

function sincronizar(
	ids: readonly string[] = [],
	marcado = true,
	leituraPedida?: Leitura,
): void {
	const chave = chaveDaSessao();
	if (!chave) return;
	let leitura = leituraPedida;
	if (sincronia?.chave !== chave) {
		cancelarSincronia();
		sincronia = {
			chave,
			controle: new AbortController(),
			pendentes: new Map(),
			ultimaReleitura: Number.NEGATIVE_INFINITY,
			agendada: false,
			ordemLocal: Promise.resolve(),
			revisaoDoEspelho: 0,
		};
		leitura ??= "documento";
	}
	if (
		leitura === "releitura" &&
		(sincronia.leitura ||
			performance.now() - sincronia.ultimaReleitura < INTERVALO_DE_RELEITURA)
	)
		return;
	if (leitura) sincronia.leitura = leitura;
	if (ids.length) {
		const versoes = ultimasAcoes();
		const acao = { marcado, versao: sortearChave() };
		for (const id of ids) {
			if (!idAceito(id)) continue;
			versoes.set(id, acao.versao);
			sincronia.pendentes.set(id, acao);
		}
		// Só a versão da ação fica compartilhada. O lote a enviar fica em memória.
		guardarVersoes(versoes);
	}
	agendarPedido(sincronia);
}

export function relerProgressoDaConta(): void {
	sincronizar([], true, "releitura");
}

export function acompanharProgressoDaConta(): (() => void) | undefined {
	if (!ENV.API_URL) return;
	sincronizar([], true, "documento");
	const parar = assinar(() => {
		if (sincronia && sincronia.chave !== chaveDaSessao()) cancelarSincronia();
	});
	const aoVoltar = (evento: PageTransitionEvent) => {
		if (evento.persisted) sincronizar([], true, "documento");
	};
	const aoFicarVisivel = () => {
		if (document.visibilityState === "visible") relerProgressoDaConta();
	};
	document.addEventListener("visibilitychange", aoFicarVisivel);
	window.addEventListener("pageshow", aoVoltar);
	return () => {
		parar();
		document.removeEventListener("visibilitychange", aoFicarVisivel);
		window.removeEventListener("pageshow", aoVoltar);
	};
}

function gravar(
	ids: readonly string[],
	alterados: readonly string[],
	marcado: boolean,
): void {
	gravarBruto(chaveDaSessao() ? CHAVE_CONTA : CHAVE, JSON.stringify(ids));
	sincronizar(alterados, marcado);
	avisarTodos();
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
		reinicios.set(apagadas, contextoDoProgresso());
		gravar(
			lidos.filter((id) => !daTrilha(id)),
			apagadas,
			false,
		);
	}
	return apagadas;
}

export function podeRestaurarLidos(
	ids: readonly string[],
	contexto: Contexto,
): boolean {
	return reinicios.get(ids) === contexto;
}

/** Põe de volta as marcas apagadas, sem perder o que foi lido depois. */
export function restaurarLidos(ids: readonly string[]): void {
	if (!podeRestaurarLidos(ids, contextoDoProgresso())) return;
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
		gravarBruto(CHAVE_ACOES, null);
		// Uma resposta que já estava a caminho não desfaz a limpeza do piloto.
		if (sincronia) sincronia.revisaoDoEspelho += 1;
	}
	avisarTodos();
}

function aoMudarEmOutraAba(evento: StorageEvent): void {
	if (ENV.API_URL && (evento.key === CHAVE_SESSAO || evento.key === null)) {
		const { sessao } = contextoDoProgresso();
		// A entrada e a saída podem ter acontecido antes de receber este evento.
		if (!sessao) contextoAtual = { sessao };
	}
	if (
		evento.key === CHAVE ||
		evento.key === null ||
		(ENV.API_URL &&
			(evento.key === CHAVE_CONTA ||
				evento.key === CHAVE_SESSAO ||
				evento.key === CHAVE_ACOES))
	)
		avisarTodos();
}

function assinar(avisar: () => void): () => void {
	if (ouvintes.size === 0)
		window.addEventListener("storage", aoMudarEmOutraAba);
	ouvintes.add(avisar);
	return () => {
		ouvintes.delete(avisar);
		if (ouvintes.size === 0)
			window.removeEventListener("storage", aoMudarEmOutraAba);
	};
}

export function useContextoDoProgresso(): Contexto {
	return useSyncExternalStore(assinar, contextoDoProgresso, () => VISITANTE);
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
