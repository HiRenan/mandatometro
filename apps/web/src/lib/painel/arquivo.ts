import type {
	ArquivoRevisao,
	FontePublica,
	ItemRevisao,
	PlacarPublico,
	VotacaoPublica,
} from "@/client";
import { paragrafos } from "@/lib/edicoes/conteudo-da-edicao";

// O arquivo de revisão do painel (GET /painel/edicoes/rascunho), o mesmo do
// `edicao exportar` do CLI. A tela edita só os campos de texto e as confirmações:
// fatos, fontes, contexto, datas e catálogo voltam à API como vieram, porque ela
// recusa o arquivo que mudou um campo de consulta. Tudo aqui é conta pura, sem
// rede e sem estado: o hook da página (use-revisao.ts) guarda o rascunho na
// memória, e nada dele vai para o console, a URL ou o armazenamento.

export type Pendencia = "redacao" | "revisao" | "cobertura" | "artigo";

const PENDENCIAS: readonly Pendencia[] = [
	"redacao",
	"revisao",
	"cobertura",
	"artigo",
];

/** O que a tela edita em cada item, como os campos mostram. */
export type CamposDoItem = {
	titulo: string;
	/** A explicação no campo: a linha em branco separa os parágrafos. */
	explicacao: string;
	/** O caminho do artigo da trilha, ou "" sem artigo. */
	artigo: string;
	artigoConfirmado: boolean;
	revisado: boolean;
	excluir: boolean;
	motivo: string;
	/** A privacidade conferida: só conta no ato retido. */
	privacidade: boolean;
};

export type CamposDaEdicao = { titulo: string; cobertura: boolean };

export type Campos = { edicao: CamposDaEdicao; itens: CamposDoItem[] };

export type ProposicaoDoItem = { sigla: string; ementa: string };

/** Uma votação do item: o que o quadro mostra e a descrição oficial. */
export type VotacaoDoItem = Pick<
	VotacaoPublica,
	"data" | "resultado" | "placar"
> & { casa: string; descricao: string };

/** O que a tela mostra de um item para conferência, lido dos campos de consulta. */
export type LeituraDoItem = {
	tipo: "votacao" | "ato";
	/** O que identifica o assunto do item entre duas versões do rascunho. */
	chave: string;
	proposicoes: ProposicaoDoItem[];
	votacoes: VotacaoDoItem[];
	/** O dia em que o ato saiu no Diário Oficial (AAAA-MM-DD). */
	publicacao: string | null;
	/** As fontes com o endereço que o leitor vai abrir na edição publicada. */
	fontes: FontePublica[];
	avisos: string[];
	/** As pendências gravadas no último salvar. */
	pendencias: Pendencia[];
	/** O ato que o filtro de pessoal reteve: pede a privacidade conferida. */
	retido: boolean;
	/** Por que o ato foi retido, como a API manda (motivo_retencao), ou null. */
	motivo: string | null;
};

/**
 * O aviso da API sobre o ato retido ("Item 3 (ato_de_pessoal). Confira a
 * privacidade do ato. …"). A ficha do ato retido já pede a mesma conferência,
 * com as palavras da tela, e o aviso repetido sai dela.
 */
export function avisoDeRetencao(aviso: string): boolean {
	return /\bConfira a privacidade do ato\b/.test(aviso);
}

type Objeto = Record<string, unknown>;

function objeto(valor: unknown): Objeto | undefined {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor)
		? Object.fromEntries(Object.entries(valor))
		: undefined;
}

function lista(valor: unknown): unknown[] {
	return Array.isArray(valor) ? valor : [];
}

function texto(valor: unknown): string | undefined {
	return typeof valor === "string" ? valor : undefined;
}

function contagem(valor: unknown): number | undefined {
	return typeof valor === "number" && Number.isFinite(valor)
		? valor
		: undefined;
}

function placarDe(valor: unknown): PlacarPublico | null {
	const dados = objeto(valor);
	if (!dados) {
		return null;
	}
	const [sim, nao, abstencao, obstrucao, presidente] = [
		dados.sim,
		dados.nao,
		dados.abstencao,
		dados.obstrucao,
		dados.presidente,
	].map((numero) => contagem(numero) ?? 0);
	return { sim, nao, abstencao, obstrucao, presidente };
}

const RESULTADOS: readonly VotacaoPublica["resultado"][] = [
	"aprovada",
	"rejeitada",
	"outro",
];

function resultadoDe(valor: unknown): VotacaoPublica["resultado"] {
	return RESULTADOS.find((resultado) => resultado === valor) ?? "outro";
}

/** O ato tem os fatos da versão 2, com o ato_id; a votação, os da versão 1. */
function ehAto(item: ItemRevisao): boolean {
	return item.fatos.versao === 2 || "ato_id" in item.fatos;
}

/**
 * A chave do assunto de um item: as votações dele ou o ato. Ela não muda quando
 * a API grava a revisão e recria os itens com ids novos, e liga um item de uma
 * versão do rascunho ao mesmo item na versão seguinte.
 */
export function chaveDoItem(item: ItemRevisao): string {
	if (ehAto(item)) {
		const ato = contagem(item.fatos.ato_id);
		return ato === undefined ? `item:${item.id}` : `ato:${ato}`;
	}
	const votacoes = lista(item.fatos.votacoes)
		.map((votacao) => contagem(objeto(votacao)?.id))
		.filter((id) => id !== undefined)
		.sort((a, b) => a - b);
	return votacoes.length > 0
		? `votacao:${votacoes.join(",")}`
		: `item:${item.id}`;
}

/**
 * O link da fonte que a edição publicada mostra: a página oficial (url_publica)
 * e, na votação, o endereço coletado quando ela falta. O ato sem página oficial
 * fica sem link, como na edição.
 */
function fontesDe(item: ItemRevisao, doAto: boolean): FontePublica[] {
	return item.fontes.map((fonte) => ({
		url: texto(fonte.url_publica) || (doAto ? "" : (texto(fonte.url) ?? "")),
		coletado_em: texto(fonte.coletado_em) ?? "",
		trecho: texto(fonte.trecho) ?? null,
	}));
}

/** Lê de um item o que a tela mostra para conferência. */
export function lerItem(item: ItemRevisao): LeituraDoItem {
	const doAto = ehAto(item);
	const contexto = item.contexto;
	const descricoes = new Map(
		lista(contexto.votacoes).map((votacao) => {
			const dados = objeto(votacao);
			return [
				contagem(dados?.id),
				{
					casa: texto(dados?.casa) ?? "",
					descricao: texto(dados?.descricao) ?? "",
				},
			] as const;
		}),
	);
	const votacoes = doAto
		? []
		: lista(item.fatos.votacoes).flatMap((votacao): VotacaoDoItem[] => {
				const dados = objeto(votacao);
				const data = texto(dados?.data);
				if (!dados || !data) {
					return [];
				}
				const oficial = descricoes.get(contagem(dados.id));
				return [
					{
						data,
						resultado: resultadoDe(dados.resultado),
						placar: placarDe(dados.placar),
						casa: oficial?.casa ?? "",
						descricao: oficial?.descricao ?? "",
					},
				];
			});
	const proposicoes = doAto
		? []
		: lista(contexto.proposicoes).flatMap((proposicao) => {
				const dados = objeto(proposicao);
				if (!dados) {
					return [];
				}
				const numero = [dados.numero, dados.ano]
					.map((parte) => (parte === undefined ? "" : String(parte)))
					.filter(Boolean)
					.join("/");
				return [
					{
						sigla: [texto(dados.sigla) ?? "", numero].join(" ").trim(),
						ementa: texto(dados.ementa) ?? "",
					},
				];
			});
	return {
		tipo: doAto ? "ato" : "votacao",
		chave: chaveDoItem(item),
		proposicoes,
		votacoes,
		publicacao: doAto ? (texto(item.fatos.data_publicacao) ?? null) : null,
		fontes: fontesDe(item, doAto),
		avisos: lista(contexto.avisos).flatMap((aviso) => {
			const frase = texto(aviso);
			return frase && !avisoDeRetencao(frase) ? [frase] : [];
		}),
		pendencias: PENDENCIAS.filter((pendencia) =>
			lista(item.fatos.pendencias).includes(pendencia),
		),
		retido: doAto && "privacidade_confirmada" in item,
		motivo: doAto ? (texto(contexto.motivo_retencao) ?? null) : null,
	};
}

/** Os campos de um item como o arquivo veio. */
export function camposDoItem(item: ItemRevisao): CamposDoItem {
	return {
		titulo: item.titulo,
		explicacao: item.explicacao.join("\n\n"),
		artigo: item.artigo_caminho ?? "",
		artigoConfirmado: item.artigo_confirmado,
		revisado: item.revisado,
		excluir: item.excluir,
		motivo: item.motivo_exclusao ?? "",
		privacidade: item.privacidade_confirmada === true,
	};
}

/** Os campos de todo o arquivo, como ele veio. */
export function camposDoArquivo(arquivo: ArquivoRevisao): Campos {
	return {
		edicao: {
			titulo: arquivo.titulo,
			cobertura: arquivo.cobertura_confirmada,
		},
		itens: arquivo.itens.map(camposDoItem),
	};
}

function mesmosCampos(a: CamposDoItem, b: CamposDoItem): boolean {
	return (Object.keys(a) as (keyof CamposDoItem)[]).every(
		(campo) => a[campo] === b[campo],
	);
}

/** O item que a pessoa mudou desde que o arquivo chegou. */
export function itemAlterado(item: ItemRevisao, campos: CamposDoItem): boolean {
	return !mesmosCampos(camposDoItem(item), campos);
}

/** A revisão que ainda não foi salva: algum campo mudou desde que o arquivo chegou. */
export function revisaoAlterada(
	arquivo: ArquivoRevisao,
	campos: Campos,
): boolean {
	return (
		campos.edicao.titulo !== arquivo.titulo ||
		campos.edicao.cobertura !== arquivo.cobertura_confirmada ||
		arquivo.itens.some((item, posicao) =>
			itemAlterado(item, campos.itens[posicao]),
		)
	);
}

/**
 * O corpo do salvar: o arquivo que chegou, com os campos editados trocados. O
 * título e a explicação que a pessoa não mudou voltam como vieram, e o item
 * marcado para sair volta com os textos do arquivo, porque a API confere o
 * formato até dele. A `privacidade_confirmada` só vai no item que já tinha o
 * campo: o ato retido.
 */
export function corpoDaRevisao(
	arquivo: ArquivoRevisao,
	campos: Campos,
): ArquivoRevisao {
	return {
		...arquivo,
		titulo: campos.edicao.titulo,
		cobertura_confirmada: campos.edicao.cobertura,
		itens: arquivo.itens.map((item, posicao) => {
			const editado = campos.itens[posicao];
			const original = camposDoItem(item);
			const mantemTexto = editado.excluir;
			const corpo: ItemRevisao = {
				...item,
				titulo:
					mantemTexto || editado.titulo === original.titulo
						? item.titulo
						: editado.titulo,
				explicacao:
					mantemTexto || editado.explicacao === original.explicacao
						? item.explicacao
						: paragrafos(editado.explicacao),
				artigo_caminho: editado.artigo || null,
				artigo_confirmado: editado.artigoConfirmado,
				revisado: editado.revisado,
				excluir: editado.excluir,
				motivo_exclusao: editado.excluir ? editado.motivo.trim() : "",
			};
			if ("privacidade_confirmada" in item) {
				corpo.privacidade_confirmada = editado.privacidade;
			}
			return corpo;
		}),
	};
}

/** O máximo de parágrafos da explicação de um item, o mesmo da API. */
export const MAXIMO_DE_PARAGRAFOS = 12;

/** O campo de um item que a conferência antes de enviar aponta. */
export type CampoComFalta = "motivo" | "titulo" | "explicacao" | "privacidade";

/** O que falta antes de enviar e o campo de que a frase fala. */
export type Falta = { campo: CampoComFalta; mensagem: string };

/** O que falta num item antes de enviar, ou nada. */
export function faltaNoItem(
	campos: CamposDoItem,
	leitura: LeituraDoItem,
): Falta | undefined {
	if (campos.excluir) {
		return campos.motivo.trim()
			? undefined
			: {
					campo: "motivo",
					mensagem: "Escreva o motivo para tirar este item da edição.",
				};
	}
	if (!campos.titulo.trim()) {
		return { campo: "titulo", mensagem: "Escreva o título do item." };
	}
	const quantos = paragrafos(campos.explicacao).length;
	if (quantos === 0) {
		return { campo: "explicacao", mensagem: "Escreva a explicação do item." };
	}
	if (quantos > MAXIMO_DE_PARAGRAFOS) {
		return {
			campo: "explicacao",
			mensagem: `A explicação tem ${quantos} parágrafos. Junte alguns: o limite é ${MAXIMO_DE_PARAGRAFOS}.`,
		};
	}
	if (leitura.retido && !campos.privacidade) {
		return {
			campo: "privacidade",
			mensagem:
				"Confira a privacidade do ato: marque que ele fica na edição ou tire o item.",
		};
	}
	return undefined;
}

/** O que falta no título da edição antes de enviar, ou nada. */
export function faltaNaEdicao(campos: CamposDaEdicao): string | undefined {
	return campos.titulo.trim() ? undefined : "Escreva o título da edição.";
}

/**
 * O estado de um item, em palavras, para a etiqueta da ficha e o índice: o que
 * a pessoa marcou, o que ela mudou e ainda não salvou e, por fim, o que o
 * último salvar gravou como pendente.
 */
export function estadoDoItem(
	item: ItemRevisao,
	campos: CamposDoItem,
	leitura: LeituraDoItem,
): string {
	if (campos.excluir) {
		return "Sai da edição";
	}
	if (itemAlterado(item, campos)) {
		return "Por salvar";
	}
	if (leitura.pendencias.includes("redacao")) {
		return "Falta escrever";
	}
	if (leitura.retido && item.privacidade_confirmada !== true) {
		return "Falta a privacidade";
	}
	if (leitura.pendencias.includes("revisao")) {
		return "Falta revisar";
	}
	if (leitura.pendencias.includes("artigo")) {
		return "Falta o artigo";
	}
	return "Revisado";
}

/** Onde fica uma mensagem da API: num item (pela posição), no alto da edição ou no pé. */
export type Lugar =
	| { onde: "item"; posicao: number }
	| { onde: "edicao" }
	| { onde: "pe" };

/**
 * O lugar de uma mensagem da API. Ela cita o item pela posição no arquivo
 * enviado ("Item 3: …", "Item 3 (pessoal). …" ou "Confira o item 3: …") e a
 * edição por "Edição:" ou "Confira o título da edição". O resto fica no pé.
 */
export function lugarDaMensagem(mensagem: string): Lugar {
	const doItem = /^(?:Item|Confira o item) (\d+)\b/.exec(mensagem);
	if (doItem) {
		return { onde: "item", posicao: Number(doItem[1]) };
	}
	if (/^(?:Edição:|Confira o título da edição)/.test(mensagem)) {
		return { onde: "edicao" };
	}
	return { onde: "pe" };
}

/** Os avisos de um salvar, cada um no lugar dele. As posições são as do rascunho novo. */
export type AvisosNoLugar = {
	edicao: string[];
	itens: Map<number, string[]>;
	pe: string[];
};

/**
 * Leva os avisos de um salvar ao rascunho que a tela carrega depois dele. A API
 * cita o item pela posição no arquivo enviado, e o salvar tira da edição os
 * itens marcados para sair: o item 5 do arquivo enviado pode ser o 4 do novo.
 * A chave do assunto liga os dois. O aviso do ato retido fica de fora, porque a
 * ficha dele já pede a conferência.
 */
export function avisosNoRascunhoNovo(
	avisos: string[],
	enviado: ArquivoRevisao,
	novo: ArquivoRevisao,
): AvisosNoLugar {
	const posicoes = new Map(
		novo.itens.map((item, indice) => [chaveDoItem(item), indice + 1]),
	);
	const noLugar: AvisosNoLugar = { edicao: [], itens: new Map(), pe: [] };
	for (const aviso of avisos.filter((aviso) => !avisoDeRetencao(aviso))) {
		const lugar = lugarDaMensagem(aviso);
		const item =
			lugar.onde === "item" ? enviado.itens[lugar.posicao - 1] : undefined;
		const posicao = item && posicoes.get(chaveDoItem(item));
		if (posicao) {
			noLugar.itens.set(posicao, [
				...(noLugar.itens.get(posicao) ?? []),
				aviso,
			]);
		} else if (lugar.onde === "edicao") {
			noLugar.edicao.push(aviso);
		} else {
			noLugar.pe.push(aviso);
		}
	}
	return noLugar;
}

/**
 * Depois de um 409, junta o que a pessoa mudou ao rascunho atual. Cada item é
 * achado pela chave do assunto, e só os campos que ela mudou passam por cima:
 * o resto fica como está no rascunho atual. O item que não está mais no rascunho
 * leva as mudanças dele junto.
 */
export function juntarAoRascunhoAtual(
	antes: ArquivoRevisao,
	campos: Campos,
	atual: ArquivoRevisao,
): Campos {
	const eram = camposDoArquivo(antes);
	const agora = camposDoArquivo(atual);
	const porChave = new Map(
		antes.itens.map((item, indice) => [chaveDoItem(item), indice]),
	);
	function oQueMudou<T extends object>(meus: T, original: T, deles: T): T {
		const junto = { ...deles };
		for (const campo of Object.keys(meus) as (keyof T)[]) {
			if (meus[campo] !== original[campo]) {
				junto[campo] = meus[campo];
			}
		}
		return junto;
	}
	return {
		edicao: oQueMudou(campos.edicao, eram.edicao, agora.edicao),
		itens: atual.itens.map((item, indice) => {
			const antesDele = porChave.get(chaveDoItem(item));
			return antesDele === undefined
				? agora.itens[indice]
				: oQueMudou(
						campos.itens[antesDele],
						eram.itens[antesDele],
						agora.itens[indice],
					);
		}),
	};
}

/** O que falta para publicar, pelo que está gravado no rascunho. */
export type Pendente = {
	redacao: number;
	revisao: number;
	artigo: number;
	privacidade: number;
	cobertura: boolean;
};

export function oQueFalta(
	arquivo: ArquivoRevisao,
	leituras: LeituraDoItem[],
): Pendente {
	const contar = (pendencia: Pendencia) =>
		leituras.filter((leitura) => leitura.pendencias.includes(pendencia)).length;
	return {
		redacao: contar("redacao"),
		revisao: contar("revisao"),
		artigo: contar("artigo"),
		privacidade: arquivo.itens.filter(
			(item, indice) =>
				leituras[indice]?.retido && item.privacidade_confirmada !== true,
		).length,
		cobertura:
			!arquivo.cobertura_confirmada ||
			leituras.some((leitura) => leitura.pendencias.includes("cobertura")),
	};
}

/** A edição que pode ser publicada: nada por salvar e nada faltando no que foi gravado. */
export function prontaParaPublicar(
	falta: Pendente,
	alterada: boolean,
): boolean {
	return (
		!alterada &&
		!falta.cobertura &&
		falta.redacao + falta.revisao + falta.artigo + falta.privacidade === 0
	);
}

function deItens(quantos: number, deQue = "item", deQuais = "itens"): string {
	return `${quantos} ${quantos === 1 ? deQue : deQuais}`;
}

/** As partes de uma lista em português: "a, b e c". */
export function emLista(partes: string[]): string {
	return partes.length <= 1
		? (partes[0] ?? "")
		: `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}`;
}

/** O que falta, em palavras, na ordem do trabalho: escrever, revisar e confirmar. */
export function frasesDoQueFalta(falta: Pendente): string[] {
	return [
		falta.redacao > 0 && `escrever a explicação de ${deItens(falta.redacao)}`,
		falta.revisao > 0 && `confirmar a revisão de ${deItens(falta.revisao)}`,
		falta.artigo > 0 &&
			`confirmar o artigo da trilha de ${deItens(falta.artigo)}`,
		falta.privacidade > 0 &&
			`conferir a privacidade de ${deItens(falta.privacidade, "ato", "atos")}`,
		falta.cobertura && "confirmar a cobertura da semana",
	].filter((frase): frase is string => Boolean(frase));
}
