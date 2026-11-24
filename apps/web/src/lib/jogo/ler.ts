import { z } from "zod";
import {
	exigido,
	fontes,
	NOME_DE_ENDERECO,
	semRepetir,
	separar,
	texto,
	validar,
} from "../conteudo/ler.ts";

// O roteiro do Jogo das Comissões, em arquivos de `conteudo/jogo/<jogo>/`. O
// formato está em docs/jogo-das-comissoes.md. A leitura imita a das trilhas
// (lib/conteudo/ler.ts) e reaproveita os ajudantes dela: o cabeçalho em YAML, o
// zod estrito, as fontes oficiais e as mensagens de erro em português.

// Os retratos de cada personagem, pelos arquivos de public/jogo/personagens/.
// Uma expressão que não está aqui não tem desenho, e a cena abriria sem o
// retrato.
const EXPRESSOES = {
	lia: ["confiante", "surpresa", "preocupada", "pensativa", "sorrindo"],
	arnaldo: ["neutro", "explicando", "sorrindo", "serio"],
	caio: ["argumentando", "desafiando", "cumprimentando"],
} as const;

// Os cenários de public/jogo/bg/ e os itens de cena de public/jogo/itens/.
const CENARIOS = [
	"bg-titulo",
	"bg-gabinete",
	"bg-comissao",
	"bg-ccj",
	"bg-senado",
	"bg-planalto",
] as const;

const ITENS = ["item-pasta", "item-caneta", "item-documento"] as const;

// Os carimbos são componentes com o texto escrito no código, em
// components/jogo/carimbos/.
const SELOS = [
	"pedido-de-vista",
	"recurso-ao-plenario",
	"segue-para-o-senado",
	"urgencia",
	"aprovado",
	"sancionado",
] as const;

/** O carimbo que entra na tela, por nome. */
export type Selo = (typeof SELOS)[number];

/**
 * A direção de voz de cada fala, para a narração gravada (`vozes/gerar.mjs`).
 * Ela não muda nada na tela: diz como a frase é dita, e o retrato continua
 * vindo da `expressao`.
 */
const EMOCOES = [
	"solene",
	"neutro",
	"didatico",
	"curioso",
	"surpreso",
	"preocupado",
	"pensativo",
	"confiante",
	"caloroso",
	"serio",
	"firme",
	"respeitoso",
	"aliviado",
] as const;

const PERSONAGENS = ["lia", "arnaldo", "caio"] as const;

// A narração não tem retrato nem placa de nome.
const QUEM = ["narracao", ...PERSONAGENS] as const;

/** Quem fala: a narração ou um dos três personagens. */
export type Quem = (typeof QUEM)[number];

// O id da fala vira o nome do arquivo de narração, e o número é o da cena.
const ID_DE_FALA = /^c([1-9])-(\d{2})$/;

const CENA_MAXIMA = 9;

type Personagem = (typeof PERSONAGENS)[number];

function eDePersonagem(quem: string): quem is Personagem {
	return (PERSONAGENS as readonly string[]).includes(quem);
}

const paragrafos = z
	.array(texto, exigido("precisa ser uma lista de parágrafos"))
	.min(1, "precisa de pelo menos um parágrafo");

const falaSchema = z
	.strictObject(
		{
			tipo: z.literal("fala"),
			id: z.string(exigido("precisa ser um id como c1-03")).regex(ID_DE_FALA, {
				error: "precisa ser um id como c1-03, com o número da cena",
			}),
			quem: z.enum(QUEM, exigido(`precisa ser ${QUEM.join(", ")}`)),
			// Só quem tem retrato leva expressão.
			expressao: texto.optional(),
			// Como a fala é dita, para a narração gravada.
			emocao: z.enum(EMOCOES, exigido(`precisa ser ${EMOCOES.join(", ")}`)),
			texto,
			// O item de cena que aparece junto da fala, com a etiqueta escrita no
			// código: a imagem não tem texto.
			item: z
				.enum(ITENS, exigido(`precisa ser ${ITENS.join(", ")}`))
				.optional(),
			etiqueta: texto.optional(),
		},
		exigido(
			"precisa ser uma fala com os campos tipo, id, quem, emocao e texto",
		),
	)
	.superRefine((fala, ctx) => {
		if (fala.quem === "narracao") {
			if (fala.expressao !== undefined) {
				ctx.addIssue({
					code: "custom",
					message: "a narração não tem retrato, e não leva expressão",
					path: ["expressao"],
				});
			}
			return;
		}
		if (!eDePersonagem(fala.quem)) {
			return;
		}
		const desenhadas: readonly string[] = EXPRESSOES[fala.quem];
		if (fala.expressao === undefined) {
			ctx.addIssue({
				code: "custom",
				message: `falta a expressão, e ${fala.quem} tem ${desenhadas.join(", ")}`,
				path: ["expressao"],
			});
			return;
		}
		if (!desenhadas.includes(fala.expressao)) {
			ctx.addIssue({
				code: "custom",
				message: `${fala.quem} não tem a expressão "${fala.expressao}", e tem ${desenhadas.join(", ")}`,
				path: ["expressao"],
			});
		}
	})
	.superRefine((fala, ctx) => {
		if (fala.etiqueta !== undefined && fala.item === undefined) {
			ctx.addIssue({
				code: "custom",
				message: "a etiqueta é o texto de um item de cena, e falta o item",
				path: ["etiqueta"],
			});
		}
	});

// As três saídas de uma opção de regra. "Funciona, mas perde" é a opção que o
// regimento permite e custa o que o projeto já andou.
const RESULTADOS = ["certa", "funciona-mas-perde", "errada"] as const;

const opcaoDeRegraSchema = z.strictObject(
	{
		texto,
		resultado: z.enum(
			RESULTADOS,
			exigido(`precisa ser ${RESULTADOS.join(", ")}`),
		),
		// O Arnaldo explica por que a opção está certa ou errada, com o artigo.
		explicacao: texto,
	},
	exigido("precisa ser uma opção com os campos texto, resultado e explicacao"),
);

const opcaoDeOpiniaoSchema = z.strictObject(
	{ texto },
	exigido("precisa ser uma opção com o campo texto"),
);

const MAXIMO_DE_OPCOES = 4;

function opcoes<T extends z.ZodType<{ texto: string }>>(schema: T) {
	return z
		.array(schema, exigido("precisa ser uma lista de opções"))
		.min(2, "precisa de pelo menos 2 opções")
		.max(MAXIMO_DE_OPCOES, `pode ter no máximo ${MAXIMO_DE_OPCOES} opções`)
		.superRefine(
			semRepetir<{ texto: string }>(
				(opcao) => opcao.texto,
				(opcao) => `a opção "${opcao}" já está nesta decisão`,
				["texto"],
			),
		);
}

const ID_DE_DECISAO = /^[1-9]\.[1-9]$/;

const idDeDecisao = z
	.string(exigido("precisa ser um id como 1.1"))
	.regex(ID_DE_DECISAO, {
		error: "precisa ser um id como 1.1, com o número da cena",
	});

const selo = z.enum(SELOS, exigido(`precisa ser ${SELOS.join(", ")}`));

// A decisão de regra tem resposta certa e conta no caminho que a tela final
// mostra. A de opinião não tem: depois da escolha, o jogo mostra o que
// aconteceu de verdade, sem julgar (docs/jogo-das-comissoes.md).
const decisaoDeRegraSchema = z.strictObject(
	{
		tipo: z.literal("decisao"),
		natureza: z.literal("regra"),
		id: idDeDecisao,
		pergunta: texto,
		// O que a tela final mostra desta decisão, em poucas palavras.
		resumo: texto,
		// O artigo do regimento ou da Constituição que resolve a situação.
		fundamento: texto,
		opcoes: opcoes(opcaoDeRegraSchema).superRefine((lista, ctx) => {
			const certas = lista.filter(
				(opcao) => opcao.resultado === "certa",
			).length;
			if (certas !== 1) {
				ctx.addIssue({
					code: "custom",
					message: `precisa de exatamente uma opção com "resultado: certa", e tem ${certas}`,
				});
			}
		}),
		// O carimbo que entra depois da escolha, quando a decisão tem um.
		carimbo: selo.optional(),
	},
	exigido(
		"precisa ser uma decisão com os campos tipo, natureza, id, pergunta, resumo, fundamento e opcoes",
	),
);

const decisaoDeOpiniaoSchema = z.strictObject(
	{
		tipo: z.literal("decisao"),
		natureza: z.literal("opiniao"),
		id: idDeDecisao,
		pergunta: texto,
		// Como o jogo repete a escolha da pessoa: "Você votou Sim." ou "Você
		// escolheu vetar parte." O texto sai do código, não do roteiro.
		eco: z.enum(
			["votou", "escolheu"],
			exigido("precisa ser votou ou escolheu"),
		),
		opcoes: opcoes(opcaoDeOpiniaoSchema),
		// O que aconteceu de verdade, igual para qualquer escolha.
		desfecho: paragrafos,
	},
	exigido(
		"precisa ser uma decisão com os campos tipo, natureza, id, pergunta, eco, opcoes e desfecho",
	),
);

// O painel do plenário: na votação nominal, com os votos reais; na simbólica,
// sem número nenhum, como aconteceu no Senado.
const painelNominalSchema = z.strictObject(
	{
		tipo: z.literal("painel"),
		modo: z.literal("nominal"),
		sim: z
			.int(exigido("precisa ser um número inteiro"))
			.min(0, "não pode ser negativo"),
		nao: z
			.int(exigido("precisa ser um número inteiro"))
			.min(0, "não pode ser negativo"),
		data: z.iso.date(exigido("precisa ser uma data AAAA-MM-DD")),
		legenda: texto,
	},
	exigido(
		"precisa ser um painel com os campos tipo, modo, sim, nao, data e legenda",
	),
);

const painelSimbolicoSchema = z.strictObject(
	{
		tipo: z.literal("painel"),
		modo: z.literal("simbolico"),
		selo,
		legenda: texto,
	},
	exigido("precisa ser um painel com os campos tipo, modo, selo e legenda"),
);

// O relógio das sessões de um prazo, como o do recurso ao Plenário.
const relogioSchema = z.strictObject(
	{
		tipo: z.literal("relogio"),
		sessoes: z
			.int(exigido("precisa ser um número inteiro a partir de 1"))
			.min(1, "precisa ser um número inteiro a partir de 1"),
		fundamento: texto,
		legenda: texto,
	},
	exigido(
		"precisa ser um relógio com os campos tipo, sessoes, fundamento e legenda",
	),
);

const carimboSchema = z.strictObject(
	{ tipo: z.literal("carimbo"), selo, legenda: texto },
	exigido("precisa ser um carimbo com os campos tipo, selo e legenda"),
);

// A união é discriminada para o erro apontar o passo certo: pelo `tipo` e,
// dentro da decisão e do painel, pela natureza e pelo modo.
const decisaoSchema = z.discriminatedUnion(
	"natureza",
	[decisaoDeRegraSchema, decisaoDeOpiniaoSchema],
	exigido("precisa ter a natureza regra ou opiniao"),
);

const painelSchema = z.discriminatedUnion(
	"modo",
	[painelNominalSchema, painelSimbolicoSchema],
	exigido("precisa ter o modo nominal ou simbolico"),
);

const passoSchema = z.discriminatedUnion(
	"tipo",
	[falaSchema, decisaoSchema, painelSchema, relogioSchema, carimboSchema],
	exigido(
		"precisa ser um passo com o tipo fala, decisao, painel, relogio ou carimbo",
	),
);

// O cartão "O que aconteceu de verdade", no fim da cena, com a fonte oficial.
const revelacaoSchema = z.strictObject(
	{
		paragrafos,
		fontes: fontes.superRefine(
			semRepetir(
				(fonte) => fonte.url,
				(url) => `a fonte "${url}" já está nesta revelação`,
				["url"],
			),
		),
	},
	exigido("precisa ser uma revelação com os campos paragrafos e fontes"),
);

const pendencias = z
	.array(texto, exigido("precisa ser uma lista de frases"))
	.default([]);

const cenaSchema = z.strictObject({
	cena: z
		.int(exigido("precisa ser um número inteiro a partir de 1"))
		.min(1, "precisa ser um número inteiro a partir de 1")
		.max(CENA_MAXIMA, `pode ir até ${CENA_MAXIMA}`),
	titulo: texto,
	cenario: z.enum(CENARIOS, exigido(`precisa ser ${CENARIOS.join(", ")}`)),
	// A casa do caminho do projeto em que esta cena acontece.
	casa: texto,
	// O artigo da trilha do processo legislativo que explica a cena.
	artigo: z
		.string(exigido("precisa ser o nome do arquivo de um artigo, sem o .md"))
		.trim(),
	passos: z
		.array(passoSchema, exigido("precisa ser uma lista de passos"))
		.min(1, "precisa de pelo menos um passo"),
	revelacao: revelacaoSchema,
	pendencias,
});

const personagemSchema = z.strictObject(
	{ nome: texto, quem: texto },
	exigido("precisa ser um personagem com os campos nome e quem"),
);

const itemDoEpilogoSchema = z.strictObject(
	{ texto, dispositivo: texto },
	exigido("precisa ser um item com os campos texto e dispositivo"),
);

const jogoSchema = z.strictObject({
	titulo: texto,
	resumo: texto,
	cenario: z.enum(CENARIOS, exigido(`precisa ser ${CENARIOS.join(", ")}`)),
	// O aviso da abertura, que diz quem é fictício e o que é real.
	aviso: texto,
	personagens: z.strictObject(
		{
			lia: personagemSchema,
			arnaldo: personagemSchema,
			caio: personagemSchema,
		},
		exigido("precisa ter os personagens lia, arnaldo e caio"),
	),
	// As casas do caminho do projeto, na ordem, como no infográfico da trilha.
	casas: z
		.array(texto, exigido("precisa ser uma lista de casas"))
		.min(1, "precisa de pelo menos uma casa")
		.superRefine(
			semRepetir(
				(casa) => casa,
				(casa) => `a casa "${casa}" já está no caminho`,
			),
		),
	epilogo: z.strictObject(
		{
			titulo: texto,
			itens: z
				.array(itemDoEpilogoSchema, exigido("precisa ser uma lista de itens"))
				.min(1, "precisa de pelo menos um item"),
			fontes: fontes.superRefine(
				semRepetir(
					(fonte) => fonte.url,
					(url) => `a fonte "${url}" já está no epílogo`,
					["url"],
				),
			),
		},
		exigido("precisa ser um epílogo com os campos titulo, itens e fontes"),
	),
	pendencias,
});

type DecisaoDeRegra = z.output<typeof decisaoDeRegraSchema>;

type DecisaoDeOpiniao = z.output<typeof decisaoDeOpiniaoSchema>;

export type Decisao = DecisaoDeRegra | DecisaoDeOpiniao;

export type Painel = z.output<typeof painelSchema>;

export type Relogio = z.output<typeof relogioSchema>;

export type Carimbo = z.output<typeof carimboSchema>;

export type Passo = z.output<typeof passoSchema>;

export type Cena = z.output<typeof cenaSchema> & { slug: string };

export type Jogo = z.output<typeof jogoSchema> & {
	slug: string;
	cenas: Cena[];
};

export class ErroDeRoteiro extends Error {
	constructor(problemas: string[]) {
		super(
			`O roteiro do jogo tem problemas:\n${problemas.map((p) => `- ${p}`).join("\n")}`,
		);
		this.name = "ErroDeRoteiro";
	}
}

/** O número da cena que o id de uma fala declara, como o 1 de `c1-03`. */
function cenaDoId(id: string): number | undefined {
	const partes = ID_DE_FALA.exec(id);
	return partes ? Number(partes[1]) : undefined;
}

function conferirPassos(
	cena: z.output<typeof cenaSchema>,
	local: string,
	idsDasFalas: Map<string, string>,
	idsDasDecisoes: Map<string, string>,
): string[] {
	const problemas: string[] = [];
	cena.passos.forEach((passo, indice) => {
		const campo = `passos.${indice}`;
		if (passo.tipo === "fala") {
			const onde = idsDasFalas.get(passo.id);
			if (onde) {
				problemas.push(
					`${local}: campo "${campo}.id": a fala "${passo.id}" já está em ${onde}`,
				);
			} else {
				idsDasFalas.set(passo.id, local);
			}
			if (cenaDoId(passo.id) !== cena.cena) {
				problemas.push(
					`${local}: campo "${campo}.id": a fala "${passo.id}" não é da cena ${cena.cena}`,
				);
			}
			return;
		}
		if (passo.tipo === "decisao") {
			const onde = idsDasDecisoes.get(passo.id);
			if (onde) {
				problemas.push(
					`${local}: campo "${campo}.id": a decisão "${passo.id}" já está em ${onde}`,
				);
			} else {
				idsDasDecisoes.set(passo.id, local);
			}
			if (Number(passo.id.split(".")[0]) !== cena.cena) {
				problemas.push(
					`${local}: campo "${campo}.id": a decisão "${passo.id}" não é da cena ${cena.cena}`,
				);
			}
		}
	});
	return problemas;
}

/**
 * Lê o roteiro de um jogo a partir dos arquivos Markdown de `conteudo/jogo/`,
 * num mapa de caminho para texto, como o `import.meta.glob` devolve. Junta
 * todos os problemas num `ErroDeRoteiro`, com o nome de cada arquivo. Quando
 * `artigosDaTrilha` vem, confere o artigo que cada cena aponta.
 */
export function lerJogos(
	arquivos: Record<string, string>,
	artigosDaTrilha?: ReadonlySet<string>,
): Jogo[] {
	const problemas: string[] = [];
	const jogos = new Map<string, z.output<typeof jogoSchema>>();
	const cenas = new Map<string, Cena[]>();

	for (const [caminho, bruto] of Object.entries(arquivos)) {
		const partes = /([^/]+)\/([^/]+)\.md$/.exec(caminho);
		if (!partes) {
			problemas.push(`${caminho}: fica fora de conteudo/jogo/<jogo>/`);
			continue;
		}
		const [, pasta, arquivo] = partes;
		const local = `conteudo/jogo/${pasta}/${arquivo}.md`;
		const avisar = (problema: string) =>
			problemas.push(`${local}: ${problema}`);

		if (!NOME_DE_ENDERECO.test(pasta) || !NOME_DE_ENDERECO.test(arquivo)) {
			avisar(
				"o nome da pasta e o do arquivo só podem ter letras minúsculas sem acento, números e hífens",
			);
			continue;
		}

		const lido = separar(bruto);
		if (typeof lido === "string") {
			avisar(lido);
			continue;
		}
		// Como o trilha.md, os arquivos do jogo são só o cabeçalho: o roteiro é
		// todo em campos, para a tela montar cada passo.
		if (lido.corpo !== "") {
			avisar(
				"o arquivo é só o cabeçalho, e o texto embaixo dele não aparece no jogo",
			);
		}

		if (arquivo === "jogo") {
			const jogo = validar(jogoSchema, lido.dados);
			if (jogo.ok) {
				jogos.set(pasta, jogo.valor);
			} else {
				jogo.problemas.forEach(avisar);
			}
			continue;
		}

		const cena = validar(cenaSchema, lido.dados);
		if (cena.ok) {
			cenas.set(pasta, [
				...(cenas.get(pasta) ?? []),
				{ slug: arquivo, ...cena.valor },
			]);
		} else {
			cena.problemas.forEach(avisar);
		}
	}

	const pastas = new Set([...jogos.keys(), ...cenas.keys()]);
	for (const pasta of pastas) {
		const local = `conteudo/jogo/${pasta}`;
		const jogo = jogos.get(pasta);
		if (!jogo && !problemas.some((p) => p.startsWith(`${local}/jogo.md:`))) {
			problemas.push(
				`${local}: falta o jogo.md, com o título, o aviso e o caminho do projeto`,
			);
		}
		const doJogo = (cenas.get(pasta) ?? []).sort((a, b) => a.cena - b.cena);
		if (
			doJogo.length === 0 &&
			!problemas.some((p) => p.startsWith(`${local}/`))
		) {
			problemas.push(`${local}: o jogo não tem nenhuma cena`);
		}

		const idsDasFalas = new Map<string, string>();
		const idsDasDecisoes = new Map<string, string>();
		const numeros = new Map<number, string[]>();
		for (const cena of doJogo) {
			const onde = `${local}/${cena.slug}.md`;
			numeros.set(cena.cena, [...(numeros.get(cena.cena) ?? []), cena.slug]);
			problemas.push(
				...conferirPassos(cena, onde, idsDasFalas, idsDasDecisoes),
			);
			if (jogo && !jogo.casas.includes(cena.casa)) {
				problemas.push(
					`${onde}: campo "casa": a casa "${cena.casa}" não está no caminho do jogo.md`,
				);
			}
			if (artigosDaTrilha && !artigosDaTrilha.has(cena.artigo)) {
				problemas.push(
					`${onde}: campo "artigo": o artigo "${cena.artigo}" não existe na trilha do processo legislativo`,
				);
			}
		}
		for (const [numero, mesmas] of numeros) {
			if (mesmas.length > 1) {
				problemas.push(
					`${local}: ${mesmas
						.map((slug) => `${slug}.md`)
						.sort()
						.join(" e ")} têm a mesma cena ${numero}`,
				);
			}
		}
		doJogo.forEach((cena, indice) => {
			if (numeros.get(cena.cena)?.length === 1 && cena.cena !== indice + 1) {
				problemas.push(
					`${local}/${cena.slug}.md: campo "cena": as cenas vão de 1 em diante, sem pular, e falta a cena ${indice + 1}`,
				);
			}
		});
	}

	if (problemas.length > 0) {
		throw new ErroDeRoteiro(problemas);
	}

	return [...jogos].map(([slug, jogo]) => ({
		slug,
		...jogo,
		cenas: (cenas.get(slug) ?? []).sort((a, b) => a.cena - b.cena),
	}));
}
