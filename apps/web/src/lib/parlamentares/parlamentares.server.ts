import { notFound } from "@tanstack/react-router";
import {
	type CorrecaoIpca,
	type DetalheParlamentar,
	type DetalheVotacao,
	type EleicaoPatrimonio,
	type FotoParlamentar,
	type ListaParlamentares,
	type ListaVotosParlamentar,
	listarParlamentares,
	listarVotosParlamentar,
	obterParlamentar,
	obterPatrimonioParlamentar,
	obterVotacao,
	type ParlamentarPublico,
	type PatrimonioParlamentar,
	type VotoParlamentar,
} from "@/client";
import { ENV } from "@/env";
import { TEMPO_DE_ESPERA } from "@/lib/edicoes/edicoes.server";
import { idDaVotacao, idDoParlamentar } from "./endereco";
import { ESTADOS, estadoDaSigla } from "./estados";
import { VALORES } from "./votos";

// A leitura dos parlamentares e das votações na API, pelo servidor do site, no
// modelo das edições (lib/edicoes/edicoes.server.ts): as páginas chamam estas
// funções pelo parlamentares.functions.ts, e o conteúdo já vem no HTML. O
// navegador nunca recebe a mensagem de uma falha, que pode trazer um endereço
// interno ou SQL. O servidor registra só uma linha fixa, com o motivo curto, e a
// página recebe o erro genérico, que o roteador mostra na página de erro.

/**
 * A única mensagem que vai ao navegador quando a leitura falha. O roteador
 * serializa só o `message` do erro, no HTML e na resposta da função do servidor.
 */
export const ERRO_DOS_PARLAMENTARES = "Os parlamentares não carregaram.";

/** Quantos votos cabem numa página da pessoa. */
export const VOTOS_POR_PAGINA = 20;

/** Quantos deputados e senadores um estado tem em exercício nos dados. */
export type ContagemDoEstado = {
	sigla: string;
	deputados: number;
	senadores: number;
};

export type ListaDosParlamentares =
	| { tipo: "sem-api" }
	| {
			tipo: "lista";
			/** Os 27 estados, na ordem do mapa (lib/parlamentares/estados.ts). */
			estados: ContagemDoEstado[];
			/** O estado do endereço, com os nomes em ordem alfabética; sem ?uf, nulo. */
			escolhido: {
				sigla: string;
				camara: ParlamentarPublico[];
				senado: ParlamentarPublico[];
			} | null;
	  };

/**
 * O patrimônio declarado ao TSE, que complementa a página: quando a leitura dele
 * falha, a página abre do mesmo jeito, e o bloco diz que não carregou.
 */
export type Patrimonio =
	| {
			tipo: "patrimonio";
			/** Da eleição mais antiga para a mais nova, como a API manda. */
			eleicoes: EleicaoPatrimonio[];
			/** A correção pelo IPCA; sem a série nos dados, nula. */
			correcao: CorrecaoIpca | null;
	  }
	| { tipo: "indisponivel" };

/**
 * A pessoa como a página a recebe: a foto da API não vai junto, porque só chega
 * à página depois de conferida, no `foto` da página.
 */
export type ParlamentarDaPagina = Omit<DetalheParlamentar, "foto">;

export type PaginaDoParlamentar =
	| { tipo: "sem-api" }
	| {
			tipo: "parlamentar";
			parlamentar: ParlamentarDaPagina;
			/**
			 * A foto oficial, só no endereço da Casa da pessoa e com o crédito dela;
			 * fora disso, ou sem a foto nos dados, nula.
			 */
			foto: FotoParlamentar | null;
			/** Do mais novo para o mais velho, como a API manda. */
			votos: VotoParlamentar[];
			total: number;
			/** A página aberta, a partir de 1. */
			pagina: number;
			/** Quantas páginas os votos têm; sem voto, uma. */
			paginas: number;
			patrimonio: Patrimonio;
	  };

export type PaginaDaVotacao =
	| { tipo: "sem-api" }
	| { tipo: "votacao"; votacao: DetalheVotacao };

/**
 * A lista dos parlamentares em exercício, numa chamada só: o servidor conta os
 * deputados e os senadores de cada estado, para o mapa, e manda ao navegador só
 * as 27 contagens e os nomes do estado escolhido, e não os 594 nomes.
 */
export async function lerParlamentares(
	uf: string | undefined,
): Promise<ListaDosParlamentares> {
	if (!ENV.API_URL) {
		return { tipo: "sem-api" };
	}
	const { data, response } = await pedir((signal) =>
		listarParlamentares({ signal }),
	);
	if (!response.ok) {
		falhou(`http-${response.status}`);
	}
	if (!pareceListaDeParlamentares(data)) {
		falhou("resposta-invalida");
	}
	const estados = ESTADOS.map(({ sigla }) => ({
		sigla,
		deputados: 0,
		senadores: 0,
	}));
	const porSigla = new Map(estados.map((estado) => [estado.sigla, estado]));
	for (const parlamentar of data.parlamentares) {
		const estado = parlamentar.uf ? porSigla.get(parlamentar.uf) : undefined;
		if (estado) {
			estado[parlamentar.casa === "camara" ? "deputados" : "senadores"] += 1;
		}
	}
	const sigla = estadoDaSigla(uf)?.sigla;
	const doEstado = data.parlamentares.filter((item) => item.uf === sigla);
	return {
		tipo: "lista",
		estados,
		escolhido: sigla
			? {
					sigla,
					camara: doEstado.filter((item) => item.casa === "camara"),
					senado: doEstado.filter((item) => item.casa === "senado"),
				}
			: null,
	};
}

/**
 * Um parlamentar, pelo fim do endereço ("81" ou "81-nome"), uma página dos votos
 * dele e o patrimônio declarado, ao mesmo tempo. O id que não pode ser de um
 * parlamentar nem chega à API; a pessoa que não existe e a página depois da
 * última dão a página não encontrada. A rota confere o nome do endereço e leva ao
 * endereço certo.
 */
export async function lerParlamentar(
	valor: unknown,
	pagina: number,
): Promise<PaginaDoParlamentar> {
	if (!ENV.API_URL) {
		return { tipo: "sem-api" };
	}
	const id = idDoParlamentar(valor);
	if (id === null) {
		throw notFound();
	}
	const deslocamento = (pagina - 1) * VOTOS_POR_PAGINA;
	const [detalhe, lista, patrimonio] = await Promise.all([
		pedir((signal) => obterParlamentar({ path: { id }, signal })),
		pedir((signal) =>
			listarVotosParlamentar({
				path: { id },
				query: { limite: VOTOS_POR_PAGINA, deslocamento },
				signal,
			}),
		),
		lerPatrimonio(id),
	]);
	for (const { response } of [detalhe, lista]) {
		if (response.status === 404 || response.status === 422) {
			throw notFound();
		}
		if (!response.ok) {
			falhou(`http-${response.status}`);
		}
	}
	if (
		!pareceDetalheDoParlamentar(detalhe.data) ||
		!pareceListaDeVotos(lista.data)
	) {
		falhou("resposta-invalida");
	}
	if (pagina > 1 && deslocamento >= lista.data.total) {
		throw notFound();
	}
	const { foto, ...parlamentar } = detalhe.data;
	return {
		tipo: "parlamentar",
		parlamentar,
		foto: fotoDaPagina(parlamentar.casa, foto),
		votos: lista.data.votos,
		total: lista.data.total,
		pagina,
		paginas: Math.max(1, Math.ceil(lista.data.total / VOTOS_POR_PAGINA)),
		patrimonio: patrimonioDaPagina(patrimonio),
	};
}

/** A leitura do patrimônio desistiu, com o motivo curto (como `http-503`). */
class FalhaDoPatrimonio extends Error {}

function desistirDoPatrimonio(motivo: string): never {
	throw new FalhaDoPatrimonio(motivo);
}

/**
 * O patrimônio declarado da pessoa. A leitura nunca derruba a página: a falha
 * volta como valor, só com o motivo curto, e não como exceção.
 */
async function lerPatrimonio(
	id: number,
): Promise<Patrimonio | { tipo: "falhou"; motivo: string }> {
	try {
		const { data, response } = await pedir(
			(signal) => obterPatrimonioParlamentar({ path: { id }, signal }),
			desistirDoPatrimonio,
		);
		if (!response.ok) {
			desistirDoPatrimonio(`http-${response.status}`);
		}
		if (!parecePatrimonio(data)) {
			desistirDoPatrimonio("resposta-invalida");
		}
		return {
			tipo: "patrimonio",
			eleicoes: data.eleicoes.map(comOsCamposNovos),
			correcao: data.correcao_ipca,
		};
	} catch (erro) {
		return {
			tipo: "falhou",
			motivo:
				erro instanceof FalhaDoPatrimonio ? erro.message : "erro-inesperado",
		};
	}
}

/**
 * O patrimônio que vai à página. A falha só vai ao log aqui, numa linha fixa com
 * o motivo curto, depois de a página dar certo: a pessoa que não existe e a
 * página que falha inteira não deixam uma linha do patrimônio.
 */
function patrimonioDaPagina(
	leitura: Patrimonio | { tipo: "falhou"; motivo: string },
): Patrimonio {
	if (leitura.tipo !== "falhou") {
		return leitura;
	}
	console.error(
		`[parlamentares] O patrimônio não carregou: ${leitura.motivo}.`,
	);
	return { tipo: "indisponivel" };
}

/**
 * Os campos que a #291 trouxe a cada eleição. O campo que falta vale nulo, para
 * a janela em que o site e a API sobem em horas diferentes; o malformado já
 * deixou o bloco sem o patrimônio, no parecePatrimonio.
 */
function comOsCamposNovos(eleicao: EleicaoPatrimonio): EleicaoPatrimonio {
	return {
		...eleicao,
		resultado: eleicao.resultado ?? null,
		fator_ipca: eleicao.fator_ipca ?? null,
		alta_ipca_percentual: eleicao.alta_ipca_percentual ?? null,
		variacao: eleicao.variacao ?? null,
	};
}

/**
 * O endereço da foto oficial de cada Casa e o crédito que vai junto, como a API
 * monta (a #291): a Câmara com o número e o .jpg, o Senado só com o número.
 */
const FOTO_DA_CASA = {
	camara: {
		site: "www.camara.leg.br",
		caminho: /^\/internet\/deputado\/bandep\/\d+\.jpg$/,
		credito: "Câmara dos Deputados",
	},
	senado: {
		site: "legis.senado.leg.br",
		caminho: /^\/senadores\/fotos-oficiais\/\d+$/,
		credito: "Senado Federal",
	},
} as const;

/**
 * A foto que vai à página. Ela só passa em https, no endereço e com o crédito da
 * Casa da pessoa: a imagem sai direto do site oficial para o navegador, e uma
 * foto de outro lugar ou com o crédito trocado não aparece. A foto fora do
 * formato fica de fora, com uma linha fixa no log, sem o endereço; a que falta
 * nos dados fica de fora sem a linha. Ela nunca derruba a página.
 */
function fotoDaPagina(
	casa: DetalheParlamentar["casa"],
	foto: unknown,
): FotoParlamentar | null {
	if (foto === undefined || foto === null) {
		return null;
	}
	const esperada = FOTO_DA_CASA[casa];
	if (
		ehObjeto(foto) &&
		typeof foto.url === "string" &&
		foto.credito === esperada.credito &&
		enderecoDaFoto(foto.url, esperada)
	) {
		return { url: foto.url, credito: esperada.credito };
	}
	console.error("[parlamentares] A foto não veio no formato esperado.");
	return null;
}

/**
 * O endereço exato da foto: https, o site da Casa, o caminho da foto e nada além
 * (sem porta, usuário, busca nem âncora, mesmo que vazias).
 */
function enderecoDaFoto(
	url: string,
	esperada: (typeof FOTO_DA_CASA)[keyof typeof FOTO_DA_CASA],
): boolean {
	try {
		const caminho = new URL(url).pathname;
		return (
			url === `https://${esperada.site}${caminho}` &&
			esperada.caminho.test(caminho)
		);
	} catch {
		return false;
	}
}

/**
 * Uma votação, com o placar contado dos votos gravados, o placar por partido e
 * a lista nominal inteira. A votação que não existe e o id que não pode ser de
 * uma votação dão a página não encontrada.
 */
export async function lerVotacao(valor: unknown): Promise<PaginaDaVotacao> {
	if (!ENV.API_URL) {
		return { tipo: "sem-api" };
	}
	const id = idDaVotacao(valor);
	if (id === null) {
		throw notFound();
	}
	const { data, response } = await pedir((signal) =>
		obterVotacao({ path: { id }, signal }),
	);
	if (response.status === 404 || response.status === 422) {
		throw notFound();
	}
	if (!response.ok) {
		falhou(`http-${response.status}`);
	}
	if (!pareceVotacao(data)) {
		falhou("resposta-invalida");
	}
	return { tipo: "votacao", votacao: data };
}

/**
 * Um pedido à API com o tempo de espera, como o das edições: o relógio é daqui,
 * com o AbortController. Sem resposta, o cliente gerado não lança: devolve a
 * resposta vazia e a falha do fetch no `error`, com o endereço da API, que não
 * sai daqui. Sem resposta, chama o `falhar`: por padrão, o erro da página.
 */
async function pedir<T>(
	chamar: (signal: AbortSignal) => Promise<{
		data?: T;
		error?: unknown;
		response?: Response | undefined;
	}>,
	falhar: (motivo: string) => never = falhou,
): Promise<{ data: T | undefined; response: Response }> {
	const desistir = new AbortController();
	const relogio = setTimeout(() => desistir.abort(), TEMPO_DE_ESPERA);
	let resultado: Awaited<ReturnType<typeof chamar>>;
	try {
		resultado = await chamar(desistir.signal);
	} catch {
		falhar("sem-resposta");
	} finally {
		clearTimeout(relogio);
	}
	const resposta: Response | undefined = resultado.response;
	if (!resposta) {
		falhar(desistir.signal.aborted ? "tempo-esgotado" : "sem-resposta");
	}
	return { data: resultado.data, response: resposta };
}

/**
 * Registra a falha no servidor numa linha fixa, só com o motivo curto (como
 * `http-503` ou `tempo-esgotado`), e lança o erro genérico. Nunca vai ao log a
 * exceção, o corpo da resposta nem o endereço da API.
 */
function falhou(motivo: string): never {
	console.error(`[parlamentares] A leitura na API falhou: ${motivo}.`);
	throw new Error(ERRO_DOS_PARLAMENTARES);
}

const CASAS = ["camara", "senado"];
const RESULTADOS = ["aprovada", "rejeitada", "outro"];

function pareceListaDeParlamentares(
	dados: unknown,
): dados is ListaParlamentares {
	return (
		ehObjeto(dados) &&
		Array.isArray(dados.parlamentares) &&
		dados.parlamentares.every(pareceParlamentar)
	);
}

function pareceParlamentar(dados: unknown): dados is ParlamentarPublico {
	return (
		ehObjeto(dados) &&
		idDaVotacao(dados.id) !== null &&
		typeof dados.nome === "string" &&
		dados.nome.trim() !== "" &&
		CASAS.includes(dados.casa as string) &&
		textoOuNulo(dados.uf) &&
		textoOuNulo(dados.partido)
	);
}

function pareceDetalheDoParlamentar(
	dados: unknown,
): dados is DetalheParlamentar {
	return (
		pareceParlamentar(dados) &&
		"mandatos" in dados &&
		Array.isArray(dados.mandatos) &&
		dados.mandatos.every(pareceMandato) &&
		"contagem_votos" in dados &&
		pareceContagem(dados.contagem_votos)
	);
}

function pareceMandato(dados: unknown): boolean {
	return (
		ehObjeto(dados) &&
		inteiroPositivo(dados.legislatura) &&
		typeof dados.uf === "string" &&
		textoOuNulo(dados.condicao) &&
		typeof dados.em_exercicio === "boolean"
	);
}

function pareceContagem(dados: unknown): boolean {
	return (
		ehObjeto(dados) &&
		VALORES.every(
			(valor) =>
				Number.isSafeInteger(dados[valor]) && (dados[valor] as number) >= 0,
		)
	);
}

function pareceListaDeVotos(dados: unknown): dados is ListaVotosParlamentar {
	return (
		ehObjeto(dados) &&
		Number.isSafeInteger(dados.total) &&
		(dados.total as number) >= 0 &&
		Array.isArray(dados.votos) &&
		dados.votos.every(pareceVotoDoParlamentar)
	);
}

/** O que a votação tem em comum na lista de votos da pessoa e na página dela. */
function pareceFatosDaVotacao(dados: Record<string, unknown>): boolean {
	return (
		pareceDia(dados.data) &&
		typeof dados.descricao === "string" &&
		RESULTADOS.includes(dados.resultado as string) &&
		Array.isArray(dados.proposicoes) &&
		dados.proposicoes.every(pareceProposicao) &&
		textoOuNulo(dados.url_oficial) &&
		typeof dados.coletado_em === "string"
	);
}

function pareceVotoDoParlamentar(dados: unknown): boolean {
	return (
		ehObjeto(dados) &&
		pareceFatosDaVotacao(dados) &&
		idDaVotacao(dados.votacao_id) !== null &&
		VALORES.includes(dados.valor as (typeof VALORES)[number])
	);
}

function pareceProposicao(dados: unknown): boolean {
	return (
		ehObjeto(dados) &&
		typeof dados.sigla === "string" &&
		inteiroPositivo(dados.numero) &&
		inteiroPositivo(dados.ano) &&
		textoOuNulo(dados.ementa)
	);
}

function pareceVotacao(dados: unknown): dados is DetalheVotacao {
	return (
		ehObjeto(dados) &&
		pareceFatosDaVotacao(dados) &&
		idDaVotacao(dados.id) !== null &&
		CASAS.includes(dados.casa as string) &&
		pareceContagem(dados.placar) &&
		Array.isArray(dados.placar_por_partido) &&
		dados.placar_por_partido.every(
			(grupo) =>
				ehObjeto(grupo) &&
				textoOuNulo(grupo.partido) &&
				pareceContagem(grupo.placar),
		) &&
		Array.isArray(dados.votos) &&
		dados.votos.every(pareceVotoNominal)
	);
}

function pareceVotoNominal(dados: unknown): boolean {
	return (
		ehObjeto(dados) &&
		idDaVotacao(dados.parlamentar_id) !== null &&
		typeof dados.nome === "string" &&
		textoOuNulo(dados.partido) &&
		textoOuNulo(dados.uf) &&
		VALORES.includes(dados.valor as (typeof VALORES)[number])
	);
}

function parecePatrimonio(dados: unknown): dados is PatrimonioParlamentar {
	return (
		ehObjeto(dados) &&
		Array.isArray(dados.eleicoes) &&
		dados.eleicoes.every(pareceEleicao) &&
		(dados.correcao_ipca === null || pareceCorrecao(dados.correcao_ipca))
	);
}

function pareceEleicao(dados: unknown): boolean {
	return (
		ehObjeto(dados) &&
		inteiroPositivo(dados.ano) &&
		ehObjeto(dados.cargo) &&
		inteiroPositivo(dados.cargo.codigo) &&
		typeof dados.cargo.nome === "string" &&
		dados.cargo.nome.trim() !== "" &&
		(dados.uf === "BR" || estadoDaSigla(dados.uf) !== null) &&
		centavosOuNulo(dados.total_centavos) &&
		centavosOuNulo(dados.total_corrigido_centavos) &&
		pareceMes(dados.mes_inicio) &&
		pareceFonte(dados.fonte) &&
		ausenteOu(dados.resultado, pareceResultado) &&
		ausenteOu(dados.fator_ipca, pareceFator) &&
		ausenteOu(dados.alta_ipca_percentual, parecePercentual) &&
		ausenteOu(dados.variacao, (variacao) =>
			pareceVariacao(variacao, dados.ano as number),
		)
	);
}

/** Os resultados de uma eleição que a API manda (a #291). */
const RESULTADOS_DA_ELEICAO = [
	"eleito",
	"eleito_por_qp",
	"eleito_por_media",
	"suplente",
	"nao_eleito",
	"sem_resultado",
	"outro",
];

/** O campo novo que falta ou vem nulo passa; o que vem confere com o formato. */
function ausenteOu(valor: unknown, parece: (valor: unknown) => boolean) {
	return valor === undefined || valor === null || parece(valor);
}

function pareceResultado(valor: unknown): boolean {
	return RESULTADOS_DA_ELEICAO.includes(valor as string);
}

/**
 * O fator do IPCA, com quatro casas ("2.9812"). Sem o ponto, ele é um inteiro
 * exato do JavaScript, porque a frase do cálculo faz a conta nele.
 */
function pareceFator(valor: unknown): boolean {
	return (
		typeof valor === "string" &&
		/^\d+\.\d{4}$/.test(valor) &&
		Number.isSafeInteger(Number(valor.replace(".", "")))
	);
}

/** Um percentual com uma casa e o sinal, se for negativo ("-22.4"). */
function parecePercentual(valor: unknown): boolean {
	return typeof valor === "string" && /^-?\d+\.\d$/.test(valor);
}

/**
 * A diferença para uma eleição de antes desta: a diferença em centavos é um
 * inteiro exato (com o sinal), e o percentual vem nulo ou com uma casa.
 */
function pareceVariacao(dados: unknown, ano: number): boolean {
	return (
		ehObjeto(dados) &&
		inteiroPositivo(dados.ano_anterior) &&
		(dados.ano_anterior as number) < ano &&
		Number.isSafeInteger(dados.diferenca_centavos) &&
		(dados.percentual === null || parecePercentual(dados.percentual))
	);
}

function pareceCorrecao(dados: unknown): boolean {
	return (
		ehObjeto(dados) &&
		dados.indice === "IPCA" &&
		pareceMes(dados.mes_fim) &&
		pareceFonte(dados.fonte)
	);
}

function pareceFonte(dados: unknown): boolean {
	return (
		ehObjeto(dados) &&
		typeof dados.url === "string" &&
		pareceDataEHora(dados.coletado_em)
	);
}

/** O instante de coleta tem dia de calendário, horário e fuso. */
function pareceDataEHora(valor: unknown): boolean {
	return (
		typeof valor === "string" &&
		/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/i.test(
			valor,
		) &&
		pareceDia(valor) &&
		Number.isFinite(Date.parse(valor))
	);
}

/** Um valor em centavos: um inteiro exato, sem sinal, ou nulo quando falta. */
function centavosOuNulo(valor: unknown): boolean {
	return (
		valor === null || (Number.isSafeInteger(valor) && (valor as number) >= 0)
	);
}

/** O mês da correção, "AAAA-MM", de janeiro a dezembro. */
function pareceMes(valor: unknown): boolean {
	return typeof valor === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
}

/** O dia da votação: a data no começo do texto, que tem de existir no calendário. */
function pareceDia(valor: unknown): boolean {
	if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(valor)) {
		return false;
	}
	const dia = valor.slice(0, 10);
	const data = new Date(dia);
	return (
		Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === dia
	);
}

function textoOuNulo(valor: unknown): boolean {
	return valor === null || typeof valor === "string";
}

function inteiroPositivo(valor: unknown): boolean {
	return Number.isSafeInteger(valor) && (valor as number) > 0;
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}
