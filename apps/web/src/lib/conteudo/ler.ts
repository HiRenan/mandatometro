import { CORE_SCHEMA, load } from "js-yaml";
import { z } from "zod";

// O formato dos arquivos está em docs/conteudo-das-trilhas.md.

const PALAVRAS_POR_MINUTO = 200;

// Só entram fontes oficiais: governo, Congresso, Justiça, Ministério Público
// e Defensoria Pública (AGENTS.md, "Regras de conteúdo").
const SITE_OFICIAL = /(^|\.)(gov|leg|jus|mp|def)\.br$/;

// O nome da pasta e o do arquivo viram o endereço da página.
const NOME_DE_ENDERECO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// O Bloco de Notas do Windows pode gravar o BOM no começo do arquivo.
const BOM = "\uFEFF";

const CABECALHO = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;

function exigido(formato: string) {
	return {
		error: (issue: { input?: unknown }) =>
			issue.input === undefined ? "falta este campo" : formato,
	};
}

const texto = z
	.string(exigido("precisa ser um texto"))
	.trim()
	.min(1, "está vazio");

const ordem = z
	.int(exigido("precisa ser um número inteiro a partir de 1"))
	.min(1, "precisa ser um número inteiro a partir de 1");

// Os itens das listas (fonte, passo, pergunta e opção) levam uma mensagem para
// quando o item é um texto solto, sem os campos: sem ela, o zod avisa em inglês.
const fonteSchema = z.strictObject(
	{
		titulo: texto,
		url: z.url({
			protocol: /^https$/,
			hostname: SITE_OFICIAL,
			...exigido(
				"precisa ser um link https de um site oficial (gov.br, leg.br, jus.br, mp.br ou def.br)",
			),
		}),
		consultadoEm: z.iso.date(exigido("precisa ser uma data AAAA-MM-DD")),
	},
	exigido("precisa ser uma fonte com os campos titulo, url e consultadoEm"),
);

const trilhaSchema = z.strictObject({
	titulo: texto,
	descricao: texto,
	ordem,
});

const fontes = z
	.array(fonteSchema, exigido("precisa ser uma lista de fontes"))
	.min(1, "precisa de pelo menos uma fonte oficial");

const artigoSchema = z.strictObject({
	titulo: texto,
	resumo: texto,
	ordem,
	fontes,
});

// Um artigo da mesma trilha, pelo nome do arquivo, sem o .md.
const nomeDeArtigo = z
	.string(exigido("precisa ser o nome do arquivo de um artigo, sem o .md"))
	.trim();

/**
 * Recusa um item repetido numa lista do infográfico ou do quiz, que sairia duas
 * vezes na página. Compara pela chave e aponta a segunda vez, no campo `campo`
 * do item.
 */
function semRepetir<T>(
	chave: (item: T) => string,
	repetido: (valor: string) => string,
	campo: string[] = [],
) {
	return (itens: T[], ctx: z.RefinementCtx<T[]>) => {
		const vistos = new Set<string>();
		itens.forEach((item, indice) => {
			const valor = chave(item);
			if (vistos.has(valor)) {
				ctx.addIssue({
					code: "custom",
					message: repetido(valor),
					path: [indice, ...campo],
				});
			}
			vistos.add(valor);
		});
	};
}

// O infográfico da trilha: o caminho em passos, cada um com as fontes dele.
const passoSchema = z.strictObject(
	{
		titulo: texto,
		texto,
		// O que pode mudar o caminho neste passo, uma frase por desvio.
		desvios: z
			.array(texto, exigido("precisa ser uma lista de frases"))
			.superRefine(
				semRepetir(
					(desvio) => desvio,
					(desvio) => `o desvio "${desvio}" já está neste passo`,
				),
			)
			.default([]),
		// Os artigos da trilha que explicam o passo.
		artigos: z
			.array(
				nomeDeArtigo,
				exigido("precisa ser uma lista de artigos da trilha"),
			)
			.superRefine(
				semRepetir(
					(artigo) => artigo,
					(artigo) => `o artigo "${artigo}" já está neste passo`,
				),
			)
			.default([]),
		// A mesma fonte é o mesmo link, mesmo com outro título.
		fontes: fontes.superRefine(
			semRepetir(
				(fonte) => fonte.url,
				(url) => `a fonte "${url}" já está neste passo`,
				["url"],
			),
		),
	},
	exigido("precisa ser um passo com os campos titulo, texto e fontes"),
);

const infograficoSchema = z.strictObject({
	titulo: texto,
	resumo: texto,
	passos: z
		.array(passoSchema, exigido("precisa ser uma lista de passos"))
		.min(1, "precisa de pelo menos um passo")
		.superRefine(
			semRepetir(
				(passo) => passo.titulo,
				(titulo) => `o passo "${titulo}" já está no infográfico`,
				["titulo"],
			),
		),
});

// O quiz da trilha: perguntas de múltipla escolha sobre os artigos que a pessoa
// já leu, cada uma com a explicação e as fontes da resposta certa.
const opcaoSchema = z.strictObject(
	{
		texto,
		// Só a opção certa leva "certa: true".
		certa: z.boolean({ error: "precisa ser true ou false" }).default(false),
	},
	exigido("precisa ser uma opção com o campo texto"),
);

const MAXIMO_DE_OPCOES = 5;

const perguntaSchema = z.strictObject(
	{
		// O artigo de onde sai a resposta. Ele vem até o depoisDe do quiz.
		artigo: nomeDeArtigo,
		enunciado: texto,
		// Na ordem do arquivo, sem sorteio: o HTML do servidor e o do navegador
		// ficam iguais.
		opcoes: z
			.array(opcaoSchema, exigido("precisa ser uma lista de opções"))
			.min(2, "precisa de pelo menos 2 opções")
			.max(MAXIMO_DE_OPCOES, `pode ter no máximo ${MAXIMO_DE_OPCOES} opções`)
			.superRefine(
				semRepetir(
					(opcao) => opcao.texto,
					(opcao) => `a opção "${opcao}" já está nesta pergunta`,
					["texto"],
				),
			)
			.superRefine((opcoes, ctx) => {
				const certas = opcoes.filter((opcao) => opcao.certa).length;
				if (certas !== 1) {
					ctx.addIssue({
						code: "custom",
						message: `precisa de exatamente uma opção com "certa: true", e tem ${certas}`,
					});
				}
			}),
		explicacao: texto,
		fontes: fontes.superRefine(
			semRepetir(
				(fonte) => fonte.url,
				(url) => `a fonte "${url}" já está nesta pergunta`,
				["url"],
			),
		),
	},
	exigido(
		"precisa ser uma pergunta com os campos artigo, enunciado, opcoes, explicacao e fontes",
	),
);

const quizSchema = z.strictObject({
	// O artigo depois do qual o quiz aparece.
	depoisDe: nomeDeArtigo,
	// O navegador guarda a resposta pelo enunciado, que não pode se repetir.
	perguntas: z
		.array(perguntaSchema, exigido("precisa ser uma lista de perguntas"))
		.min(1, "precisa de pelo menos uma pergunta")
		.superRefine(
			semRepetir(
				(pergunta) => pergunta.enunciado,
				(enunciado) => `a pergunta "${enunciado}" já está no quiz`,
				["enunciado"],
			),
		),
});

export type Fonte = z.output<typeof fonteSchema>;

export type Passo = z.output<typeof passoSchema>;

export type Infografico = z.output<typeof infograficoSchema>;

export type Opcao = z.output<typeof opcaoSchema>;

export type Pergunta = z.output<typeof perguntaSchema>;

export type Quiz = z.output<typeof quizSchema>;

export type Artigo = {
	trilha: string;
	slug: string;
	titulo: string;
	resumo: string;
	ordem: number;
	fontes: Fonte[];
	corpo: string;
	minutos: number;
};

export type Trilha = {
	slug: string;
	titulo: string;
	descricao: string;
	ordem: number;
	artigos: Artigo[];
	/** O caminho da trilha num infográfico, quando ela tem um infografico.md. */
	infografico?: Infografico;
	/** As perguntas sobre os artigos lidos, quando a trilha tem um quiz.md. */
	quiz?: Quiz;
};

export class ErroDeConteudo extends Error {
	constructor(problemas: string[]) {
		super(
			`O conteúdo das trilhas tem problemas:\n${problemas.map((p) => `- ${p}`).join("\n")}`,
		);
		this.name = "ErroDeConteudo";
	}
}

type Issue = z.ZodError["issues"][number];

function descrever(issue: Issue): string {
	if (issue.code === "unrecognized_keys") {
		return issue.keys
			.map(
				(chave) => `campo desconhecido "${[...issue.path, chave].join(".")}"`,
			)
			.join("; ");
	}
	if (issue.path.length === 0) {
		return `o cabeçalho ${issue.message}`;
	}
	return `campo "${issue.path.join(".")}": ${issue.message}`;
}

function separar(bruto: string): { dados: unknown; corpo: string } | string {
	const partes = CABECALHO.exec(
		bruto.startsWith(BOM) ? bruto.slice(BOM.length) : bruto,
	);
	if (!partes) {
		return "falta o cabeçalho, entre duas linhas com ---";
	}
	try {
		return {
			dados: load(partes[1], { schema: CORE_SCHEMA }),
			corpo: partes[2].replaceAll("\r\n", "\n").trim(),
		};
	} catch (erro) {
		const motivo = erro instanceof Error ? erro.message.split("\n")[0] : "";
		return `o cabeçalho não é YAML válido (${motivo})`;
	}
}

function validar<T>(
	schema: z.ZodType<T>,
	dados: unknown,
): { ok: true; valor: T } | { ok: false; problemas: string[] } {
	const resultado = schema.safeParse(dados);
	if (resultado.success) {
		return { ok: true, valor: resultado.data };
	}
	// O zod confere o protocolo e o domínio da URL em separado, e um link que
	// erra os dois daria a mesma linha duas vezes.
	return {
		ok: false,
		problemas: [...new Set(resultado.error.issues.map(descrever))],
	};
}

function contarMinutos(corpo: string): number {
	const palavras = corpo
		.split(/\s+/)
		.filter((palavra) => /[\p{L}\p{N}]/u.test(palavra)).length;
	return Math.max(1, Math.round(palavras / PALAVRAS_POR_MINUTO));
}

function repetidos<T extends { ordem: number }>(
	itens: T[],
	nome: (item: T) => string,
): string[] {
	const porOrdem = new Map<number, T[]>();
	for (const item of itens) {
		porOrdem.set(item.ordem, [...(porOrdem.get(item.ordem) ?? []), item]);
	}
	return [...porOrdem]
		.filter(([, mesmos]) => mesmos.length > 1)
		.map(
			([numero, mesmos]) =>
				`${mesmos.map(nome).sort().join(" e ")} têm a mesma ordem ${numero}`,
		);
}

/**
 * Lê as trilhas a partir dos arquivos Markdown de `conteudo/trilhas/`, num mapa
 * de caminho para texto, como o `import.meta.glob` devolve. Junta todos os
 * problemas num `ErroDeConteudo`, com o nome de cada arquivo.
 */
export function lerTrilhas(arquivos: Record<string, string>): Trilha[] {
	const problemas: string[] = [];
	const trilhas = new Map<
		string,
		Omit<Trilha, "artigos" | "infografico" | "quiz">
	>();
	const artigos = new Map<string, Artigo[]>();
	const infograficos = new Map<string, Infografico>();
	const quizzes = new Map<string, Quiz>();
	// Os nomes dos arquivos de artigo de cada pasta, mesmo os que têm problema,
	// para conferir os artigos que o infográfico e o quiz apontam.
	const nomesDosArtigos = new Map<string, Set<string>>();

	for (const [caminho, bruto] of Object.entries(arquivos)) {
		const partes = /([^/]+)\/([^/]+)\.md$/.exec(caminho);
		if (!partes) {
			problemas.push(`${caminho}: fica fora de conteudo/trilhas/<trilha>/`);
			continue;
		}
		const [, pasta, arquivo] = partes;
		const local = `conteudo/trilhas/${pasta}/${arquivo}.md`;
		const avisar = (problema: string) =>
			problemas.push(`${local}: ${problema}`);

		if (!NOME_DE_ENDERECO.test(pasta) || !NOME_DE_ENDERECO.test(arquivo)) {
			avisar(
				"o nome da pasta e o do arquivo viram o endereço da página e só podem ter letras minúsculas sem acento, números e hífens",
			);
			continue;
		}

		const lido = separar(bruto);
		if (typeof lido === "string") {
			avisar(lido);
			continue;
		}

		// O trilha.md é só o cabeçalho: um texto embaixo dele não aparece na página.
		if (arquivo === "trilha") {
			if (lido.corpo !== "") {
				avisar(
					"o trilha.md é só o cabeçalho, e o texto embaixo dele não aparece na página",
				);
			}
			const trilha = validar(trilhaSchema, lido.dados);
			if (trilha.ok) {
				trilhas.set(pasta, { slug: pasta, ...trilha.valor });
			} else {
				trilha.problemas.forEach(avisar);
			}
			continue;
		}

		// Como o trilha.md, o infográfico é só o cabeçalho.
		if (arquivo === "infografico") {
			if (lido.corpo !== "") {
				avisar(
					"o infográfico é só o cabeçalho, e o texto embaixo dele não aparece na página",
				);
			}
			const infografico = validar(infograficoSchema, lido.dados);
			if (infografico.ok) {
				infograficos.set(pasta, infografico.valor);
			} else {
				infografico.problemas.forEach(avisar);
			}
			continue;
		}

		// O quiz também é só o cabeçalho.
		if (arquivo === "quiz") {
			if (lido.corpo !== "") {
				avisar(
					"o quiz é só o cabeçalho, e o texto embaixo dele não aparece na página",
				);
			}
			const quiz = validar(quizSchema, lido.dados);
			if (quiz.ok) {
				quizzes.set(pasta, quiz.valor);
			} else {
				quiz.problemas.forEach(avisar);
			}
			continue;
		}

		nomesDosArtigos.set(
			pasta,
			(nomesDosArtigos.get(pasta) ?? new Set<string>()).add(arquivo),
		);
		const artigo = validar(artigoSchema, lido.dados);
		if (!artigo.ok) {
			artigo.problemas.forEach(avisar);
		}
		if (lido.corpo === "") {
			avisar("o texto do artigo está vazio");
		} else if (/^#[ \t]/m.test(lido.corpo)) {
			avisar(
				"o texto usa um título de nível 1 (#); as seções começam com ##, porque o título do artigo vem do cabeçalho",
			);
		} else if (artigo.ok) {
			const lista = artigos.get(pasta) ?? [];
			lista.push({
				trilha: pasta,
				slug: arquivo,
				...artigo.valor,
				corpo: lido.corpo,
				minutos: contarMinutos(lido.corpo),
			});
			artigos.set(pasta, lista);
		}
	}

	const pastas = new Set([
		...trilhas.keys(),
		...artigos.keys(),
		...infograficos.keys(),
		...quizzes.keys(),
	]);
	for (const pasta of pastas) {
		const local = `conteudo/trilhas/${pasta}`;
		if (
			!trilhas.has(pasta) &&
			!problemas.some((p) => p.startsWith(`${local}/trilha.md:`))
		) {
			problemas.push(
				`${local}: falta o trilha.md, com o título e a descrição da trilha`,
			);
		}
		const daTrilha = artigos.get(pasta) ?? [];
		if (
			trilhas.has(pasta) &&
			daTrilha.length === 0 &&
			!problemas.some((p) => p.startsWith(`${local}/`))
		) {
			problemas.push(`${local}: a trilha não tem nenhum artigo`);
		}
		for (const repetido of repetidos(
			daTrilha,
			(artigo) => `${artigo.slug}.md`,
		)) {
			problemas.push(`${local}: ${repetido}`);
		}
		const nomes = nomesDosArtigos.get(pasta) ?? new Set<string>();
		infograficos.get(pasta)?.passos.forEach((passo, indice) => {
			for (const artigo of passo.artigos) {
				if (!nomes.has(artigo)) {
					problemas.push(
						`${local}/infografico.md: campo "passos.${indice}.artigos": o artigo "${artigo}" não existe nesta trilha`,
					);
				}
			}
		});
		const quiz = quizzes.get(pasta);
		if (quiz) {
			problemas.push(...conferirArtigosDoQuiz(quiz, nomes, daTrilha, local));
		}
	}
	for (const repetido of repetidos(
		[...trilhas.values()],
		(trilha) => trilha.slug,
	)) {
		problemas.push(`conteudo/trilhas: ${repetido}`);
	}

	if (problemas.length > 0) {
		throw new ErroDeConteudo(problemas);
	}

	const porOrdem = (a: { ordem: number }, b: { ordem: number }) =>
		a.ordem - b.ordem;
	return [...trilhas.values()].sort(porOrdem).map((trilha) => {
		const infografico = infograficos.get(trilha.slug);
		const quiz = quizzes.get(trilha.slug);
		return {
			...trilha,
			artigos: (artigos.get(trilha.slug) ?? []).sort(porOrdem),
			...(infografico && { infografico }),
			...(quiz && { quiz }),
		};
	});
}

/**
 * Confere os artigos que o quiz aponta: o `depoisDe` e o de cada pergunta
 * existem na trilha, e nenhuma pergunta é de um artigo que vem depois do quiz,
 * que a pessoa ainda não leu. A ordem só é conferida entre artigos sem
 * problema, porque o artigo com problema já tem o aviso dele.
 */
function conferirArtigosDoQuiz(
	quiz: Quiz,
	nomes: ReadonlySet<string>,
	daTrilha: readonly Artigo[],
	local: string,
): string[] {
	const problemas: string[] = [];
	const avisar = (campo: string, problema: string) =>
		problemas.push(`${local}/quiz.md: campo "${campo}": ${problema}`);
	const naoExiste = (artigo: string) =>
		`o artigo "${artigo}" não existe nesta trilha`;
	const ordemDe = new Map(
		daTrilha.map((artigo) => [artigo.slug, artigo.ordem]),
	);

	if (!nomes.has(quiz.depoisDe)) {
		avisar("depoisDe", naoExiste(quiz.depoisDe));
	}
	const ultimaLida = ordemDe.get(quiz.depoisDe);
	quiz.perguntas.forEach((pergunta, indice) => {
		const campo = `perguntas.${indice}.artigo`;
		if (!nomes.has(pergunta.artigo)) {
			avisar(campo, naoExiste(pergunta.artigo));
			return;
		}
		const ordem = ordemDe.get(pergunta.artigo);
		if (ultimaLida !== undefined && ordem !== undefined && ordem > ultimaLida) {
			avisar(
				campo,
				`o artigo "${pergunta.artigo}" vem depois de "${quiz.depoisDe}", e o quiz aparece antes de a pessoa ler esse artigo`,
			);
		}
	});
	return problemas;
}
