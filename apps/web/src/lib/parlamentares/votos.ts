import type {
	ContagemVotosParlamentar,
	DetalheVotacao,
	ProposicaoAfetada,
	VotoNominal,
} from "@/client";
import { formatarDia } from "@/lib/formatar";

// O que cada voto quer dizer, em palavras, e como a página da votação agrupa e
// filtra a lista nominal. A API normaliza o voto de cada parlamentar em sete
// valores, iguais na Câmara e no Senado.

export type Valor = VotoNominal["valor"];

export type Casa = DetalheVotacao["casa"];

export const NOME_DA_CASA: Record<Casa, string> = {
	camara: "Câmara dos Deputados",
	senado: "Senado Federal",
};

/** O resultado registrado, em palavras: o `outro` não vira aprovação. */
export const RESULTADO: Record<DetalheVotacao["resultado"], string> = {
	aprovada: "Aprovada",
	rejeitada: "Rejeitada",
	outro: "Resultado não classificado nos dados usados",
};

/** A proposição como o Congresso escreve: "PL 812/2026". */
export function nomeDaProposicao(
	proposicao: Pick<ProposicaoAfetada, "sigla" | "numero" | "ano">,
): string {
	return `${proposicao.sigla} ${proposicao.numero}/${proposicao.ano}`;
}

/**
 * O título de uma votação: a proposição votada ("PL 812/2026"), com quantas
 * mais houver ("PL 812/2026 e mais 2"). Sem proposição, como num requerimento
 * que a fonte não liga a um projeto, o dia da votação.
 */
export function tituloDaVotacao(votacao: {
	data: string;
	proposicoes: ProposicaoAfetada[];
}): string {
	const [primeira, ...outras] = votacao.proposicoes;
	if (!primeira) {
		return `Votação de ${formatarDia(votacao.data.slice(0, 10))}`;
	}
	const nome = nomeDaProposicao(primeira);
	return outras.length > 0 ? `${nome} e mais ${outras.length}` : nome;
}

/** Os sete valores, na ordem do placar: os grupos e as contagens seguem esta ordem. */
export const VALORES = [
	"sim",
	"nao",
	"abstencao",
	"obstrucao",
	"presidente",
	"nao_votou",
	"outro",
] as const satisfies readonly Valor[];

/** O nome de cada voto, como ele aparece no grupo e na lista de votos da pessoa. */
export const NOME_DO_VOTO: Record<Valor, string> = {
	sim: "Sim",
	nao: "Não",
	abstencao: "Abstenção",
	obstrucao: "Obstrução",
	presidente: "Presidência",
	nao_votou: "Não votou",
	outro: "Outro registro",
};

/**
 * O artigo do regimento que diz a regra, para a fonte ao lado da explicação, com
 * o espaço sem quebra depois do "art." e do "§": o número não fica sozinho no
 * começo da linha.
 */
export type Artigo = { casa: "camara" | "senado"; artigo: string };

export type Explicacao = { texto: string; artigos: Artigo[] };

/**
 * O que cada voto quer dizer (o Renan, em 21/11/2026), com a regra conferida
 * no Regimento Interno de cada Casa, só lendo o texto oficial (a Atena, em
 * 22/11/2026: a regra que não estiver lá sai do texto). Na obstrução, o
 * "para atrasar ou impedir a decisão" saiu: nenhum dos dois regimentos diz o
 * motivo, só como a ausência é formalizada. O "Não votou" e o
 * "Outro registro" descrevem os dados, e não uma regra.
 */
export const EXPLICACAO_DO_VOTO: Record<Valor, Explicacao> = {
	sim: {
		texto: "Votou a favor do que estava em votação.",
		artigos: [
			{ casa: "camara", artigo: "art.\u00a0187, §\u00a01º" },
			{ casa: "senado", artigo: "art.\u00a0294" },
		],
	},
	nao: {
		texto: "Votou contra o que estava em votação.",
		artigos: [
			{ casa: "camara", artigo: "art.\u00a0187, §\u00a01º" },
			{ casa: "senado", artigo: "art.\u00a0294" },
		],
	},
	abstencao: {
		texto: "Estava na votação e não votou a favor nem contra.",
		artigos: [
			{ casa: "camara", artigo: "art.\u00a0180, §\u00a02º" },
			{ casa: "senado", artigo: "art.\u00a0294" },
		],
	},
	obstrucao: {
		texto:
			"Deixou de votar numa estratégia do partido ou do bloco, comunicada à Mesa na Câmara e declarada pela liderança no Senado.",
		artigos: [
			{ casa: "camara", artigo: "art.\u00a082, §\u00a06º" },
			{ casa: "senado", artigo: "art.\u00a013, §\u00a02º" },
		],
	},
	presidente: {
		texto:
			"Presidia a sessão. Na votação aberta, quem preside só vota para desempatar; por isso, este registro aparece à parte e não conta como Sim nem como Não.",
		artigos: [
			{ casa: "camara", artigo: "art.\u00a017, §\u00a01º" },
			{ casa: "senado", artigo: "art.\u00a051" },
		],
	},
	nao_votou: {
		texto:
			"Não registrou voto. Pode ter faltado ou estado na sessão sem votar; o site não guarda o motivo.",
		artigos: [],
	},
	outro: {
		texto: "A fonte usou um código que o site ainda não classifica.",
		artigos: [],
	},
};

/**
 * As páginas oficiais dos dois regimentos, as fontes das regras. A citação vai
 * entre parênteses depois da explicação, como nas trilhas.
 */
export const REGIMENTOS: Record<
	Casa,
	{ nome: string; citacao: string; url: string }
> = {
	camara: {
		nome: "Regimento Interno da Câmara dos Deputados",
		citacao: "Regimento Interno da Câmara",
		url: "https://www2.camara.leg.br/atividade-legislativa/legislacao/regimento-interno-da-camara-dos-deputados",
	},
	senado: {
		nome: "Regimento Interno do Senado Federal",
		citacao: "Regimento Interno do Senado",
		url: "https://www25.senado.leg.br/web/atividade/legislacao/regimento-interno",
	},
};

/** O artigo da regra na Casa da pessoa, ou nada, quando o valor descreve os dados. */
export function artigoDaRegra(valor: Valor, casa: Casa): string | undefined {
	return EXPLICACAO_DO_VOTO[valor].artigos.find((item) => item.casa === casa)
		?.artigo;
}

/**
 * Os valores que a contagem mostra: os seis de sempre e o "Outro registro" só
 * quando ele aparece, porque ele só diz que a fonte usou um código novo.
 */
export function valoresDaContagem(contagem: ContagemVotosParlamentar): Valor[] {
	return VALORES.filter((valor) => valor !== "outro" || contagem.outro > 0);
}

/** O total de registros de uma contagem, de todos os valores. */
export function totalDaContagem(contagem: ContagemVotosParlamentar): number {
	return VALORES.reduce((soma, valor) => soma + contagem[valor], 0);
}

/** O filtro da página da votação, como vem do endereço (?uf=SC&partido=PFT). */
export type Filtro = { uf?: string; partido?: string };

/** O valor do filtro de partido para quem votou sem partido registrado. */
export const SEM_PARTIDO = "sem-partido";

/** Até quantos nomes os grupos de quem votou como vêm abertos. */
export const ABERTOS_ATE = 100;

/**
 * Os grupos vêm abertos quando a lista tem até 100 nomes: um estado, um partido
 * ou o Senado inteiro. A Câmara inteira passa disso, e os grupos vêm fechados.
 */
export function gruposAbertos(nomes: number): boolean {
	return nomes <= ABERTOS_ATE;
}

/** Os votos que passam no filtro de estado e de partido. */
export function filtrarVotos(
	votos: readonly VotoNominal[],
	{ uf, partido }: Filtro,
): VotoNominal[] {
	return votos.filter(
		(voto) =>
			(!uf || voto.uf === uf) &&
			(!partido ||
				(partido === SEM_PARTIDO
					? voto.partido === null
					: voto.partido === partido)),
	);
}

export type Grupo = { valor: Valor; votos: VotoNominal[] };

/**
 * Os votos agrupados pelo valor, na ordem do placar. Dentro de cada grupo, a
 * ordem é a da API, alfabética. O grupo vazio fica de fora.
 */
export function agruparPorVoto(votos: readonly VotoNominal[]): Grupo[] {
	return VALORES.map((valor) => ({
		valor,
		votos: votos.filter((voto) => voto.valor === valor),
	})).filter((grupo) => grupo.votos.length > 0);
}

/** As opções do filtro: os estados e os partidos que aparecem na votação. */
export function opcoesDoFiltro(votos: readonly VotoNominal[]): {
	ufs: string[];
	partidos: string[];
	semPartido: boolean;
} {
	const ufs = new Set<string>();
	const partidos = new Set<string>();
	let semPartido = false;
	for (const voto of votos) {
		if (voto.uf) {
			ufs.add(voto.uf);
		}
		if (voto.partido === null) {
			semPartido = true;
		} else if (partidoDaBusca(voto.partido) !== undefined) {
			partidos.add(voto.partido);
		}
	}
	const emOrdem = (lista: Set<string>) =>
		[...lista].sort((a, b) => a.localeCompare(b, "pt-BR"));
	return { ufs: emOrdem(ufs), partidos: emOrdem(partidos), semPartido };
}

/**
 * O partido do endereço (?partido=PFT): o texto original, até 40 caracteres,
 * sem controles. O campo vazio equivale ao endereço sem ?partido.
 */
export function partidoDaBusca(valor: unknown): string | undefined {
	return typeof valor === "string" &&
		valor !== "" &&
		[...valor].length <= 40 &&
		!/\p{Cc}/u.test(valor)
		? valor
		: undefined;
}
