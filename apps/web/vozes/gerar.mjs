// Grava a narração do Jogo das Comissões com a ElevenLabs: um arquivo por
// fala, com o id dela no nome, dentro da pasta do jogo (vo/comissoes/c1-03.mp3),
// as vozes do time e a emoção que
// o roteiro marcou em cada fala.
//
// Uso: ELEVENLABS_API_KEY=... pnpm --filter web vozes
//   --refazer            regrava também as falas que estão em dia
//   --so comissoes/c1-01 grava só essas falas; o id sozinho (c1-01) pega a
//                        fala de mesmo id em todos os jogos
//   --modelo <id>        troca o modelo (o eleven_v3 usa as marcas de emoção)
//   --verificar          confere as gravações existentes sem acessar a API
//
// Grava em public/jogo/vo/<jogo>/ e refaz a lista de src/lib/jogo/vozes.ts, que é o
// que a tela lê: fala sem arquivo nessa lista simplesmente não tem voz.
//
// A chave vem do ambiente e nunca aparece no log nem no código. O roteiro e as
// regras estão em docs/jogo-das-comissoes.md.

import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTEUDO = join(RAIZ, "conteudo", "jogo");
const SAIDA = join(RAIZ, "public", "jogo", "vo");
const LISTA = join(RAIZ, "src", "lib", "jogo", "vozes.ts");
const REGISTRO = join(RAIZ, "vozes", "gravacoes.json");

/** As vozes brasileiras do catálogo da ElevenLabs que o time escolheu. */
const VOZ = {
	narracao: "NFmEzNOony1UsEJGXLth",
	lia: "GDzHdQOi6jjf8zaXhCYD",
	arnaldo: "4XmhZ74tBbUVCXIYNMMo",
	caio: "CstacWqMhJQlnfLPxRG4",
	// Os dois do Jogo da 6x1: Yasmin Alves para a Joana e Newton Máximo para o
	// Seu Raimundo. O id da voz é do catálogo e não é segredo; a chave da API
	// é que fica só no .env.
	joana: "lWq4KDY8znfkV0DrK8Vb",
	raimundo: "j3IQ4Mry1qDVTh6BCyC0",
};

/**
 * Cada emoção do roteiro vira a direção da voz: a estabilidade segura ou solta
 * a entonação, o estilo mede o exagero, e a marca entre colchetes é o que o
 * modelo v3 entende. Nos modelos sem marca, ela não entra no texto.
 */
const DIRECAO = {
	solene: { stability: 0.55, style: 0.25, marca: "solemn" },
	neutro: { stability: 0.5, style: 0.1, marca: "neutral" },
	didatico: { stability: 0.45, style: 0.2, marca: "explaining patiently" },
	curioso: { stability: 0.4, style: 0.3, marca: "curious" },
	surpreso: { stability: 0.3, style: 0.45, marca: "surprised" },
	preocupado: { stability: 0.4, style: 0.35, marca: "worried" },
	pensativo: { stability: 0.5, style: 0.25, marca: "thoughtful" },
	confiante: { stability: 0.4, style: 0.35, marca: "confident" },
	caloroso: { stability: 0.4, style: 0.35, marca: "warmly" },
	serio: { stability: 0.55, style: 0.2, marca: "serious" },
	firme: { stability: 0.45, style: 0.35, marca: "firm" },
	respeitoso: { stability: 0.45, style: 0.25, marca: "respectful" },
	aliviado: { stability: 0.4, style: 0.3, marca: "relieved" },
};

const MODELO_PADRAO = "eleven_multilingual_v2";

const argumentos = process.argv.slice(2);

function valorDe(nome) {
	const indice = argumentos.indexOf(nome);
	return indice >= 0 ? argumentos[indice + 1] : undefined;
}

const refazer = argumentos.includes("--refazer");
const modeloPedido = valorDe("--modelo");
const modelo = modeloPedido ?? MODELO_PADRAO;
const so = valorDe("--so")
	?.split(",")
	.map((id) => id.trim());

/** As falas do roteiro, na ordem das cenas. */
function falasDoRoteiro() {
	const falas = [];
	for (const jogo of readdirSync(CONTEUDO)) {
		const pasta = join(CONTEUDO, jogo);
		const arquivos = readdirSync(pasta)
			.filter((nome) => nome.endsWith(".md") && nome !== "jogo.md")
			.sort();
		for (const arquivo of arquivos) {
			const bruto = readFileSync(join(pasta, arquivo), "utf8");
			const cabecalho = /^---\r?\n([\s\S]*?)\r?\n---/.exec(bruto);
			if (!cabecalho) {
				throw new Error(`${arquivo}: falta o cabeçalho`);
			}
			const cena = load(cabecalho[1]);
			for (const passo of cena.passos ?? []) {
				if (passo.tipo !== "fala") {
					continue;
				}
				if (!Object.hasOwn(DIRECAO, passo.emocao)) {
					throw new Error(`${passo.id}: emoção desconhecida (${passo.emocao})`);
				}
				if (!Object.hasOwn(VOZ, passo.quem)) {
					throw new Error(`${jogo}/${passo.id}: falta a voz de ${passo.quem}`);
				}
				falas.push({ ...passo, jogo });
			}
		}
	}
	return falas;
}

function pedidoDaFala(fala, modeloDaFala) {
	const { marca, stability, style } = DIRECAO[fala.emocao];
	const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOZ[fala.quem]}?output_format=mp3_44100_128`;
	const corpo = {
		text: modeloDaFala.startsWith("eleven_v3")
			? `[${marca}] ${fala.texto}`
			: fala.texto,
		model_id: modeloDaFala,
		voice_settings: {
			stability,
			style,
			similarity_boost: 0.75,
			use_speaker_boost: true,
		},
	};
	return { url, corpo };
}

function assinatura(fala, pedido) {
	return createHash("sha256")
		.update(JSON.stringify([fala.quem, fala.emocao, pedido]))
		.digest("hex");
}

async function gravar(fala, chave, pedido) {
	const resposta = await fetch(pedido.url, {
		method: "POST",
		headers: {
			"xi-api-key": chave,
			"content-type": "application/json",
			accept: "audio/mpeg",
		},
		body: JSON.stringify(pedido.corpo),
	});
	if (!resposta.ok) {
		// A mensagem da ElevenLabs não traz a chave; o corpo entra no erro para
		// dizer o que falta (plano, permissão, voz).
		const motivo = await resposta.text();
		throw new Error(`HTTP ${resposta.status}: ${motivo.slice(0, 300)}`);
	}
	const audio = Buffer.from(await resposta.arrayBuffer());
	const destino = join(SAIDA, fala.jogo);
	mkdirSync(destino, { recursive: true });
	writeFileSync(join(destino, `${fala.id}.mp3`), audio);
	return audio.length;
}

/** A lista que a tela lê, com os ids que têm arquivo. */
function escreverLista(ids) {
	const lista = ids.length
		? `[\n${ids.map((id) => `\t"${id}",`).join("\n")}\n]`
		: "[]";
	writeFileSync(
		LISTA,
		`// Gerado por vozes/gerar.mjs: não edite à mão.
//
// As falas que têm narração gravada em public/jogo/vo/<jogo>/. A tela só toca
// o que está aqui, e uma fala de fora segue sem voz
// (docs/jogo-das-comissoes.md). Cada item é "<jogo>/<id da fala>": o id se
// repete entre os jogos, e quem separa é a pasta.

export const VOZES: readonly string[] = ${lista};

export function temVoz(jogo: string, id: string): boolean {
	return VOZES.includes(\`\${jogo}/\${id}\`);
}

export function enderecoDaVoz(jogo: string, id: string): string {
	return \`/jogo/vo/\${jogo}/\${id}.mp3\`;
}
`,
		"utf8",
	);
}

const todas = falasDoRoteiro().map((fala) => ({
	...fala,
	identificador: `${fala.jogo}/${fala.id}`,
	destino: join(SAIDA, fala.jogo, `${fala.id}.mp3`),
}));
const registro = JSON.parse(readFileSync(REGISTRO, "utf8"));
const falas = todas.filter(
	(fala) => !so || so.includes(fala.identificador) || so.includes(fala.id),
);

function estaEmDia(fala) {
	const gravacao = registro[fala.identificador];
	return (
		gravacao &&
		(!modeloPedido || modeloPedido === gravacao.modelo) &&
		gravacao.assinatura ===
			assinatura(fala, pedidoDaFala(fala, gravacao.modelo))
	);
}

if (argumentos.includes("--verificar")) {
	for (const fala of falas) {
		if (existsSync(fala.destino) && !estaEmDia(fala)) {
			console.error(
				`${fala.identificador}: gravação desatualizada. Rode vozes com --so ${fala.identificador}.`,
			);
			process.exitCode = 1;
		}
	}
	process.exit(process.exitCode ?? 0);
}

const chave = process.env.ELEVENLABS_API_KEY?.trim();
if (!chave) {
	console.error(
		"Defina a ELEVENLABS_API_KEY no ambiente. A chave fica no .env local, nunca no código.",
	);
	process.exit(2);
}

const aGravar = falas.filter(
	(fala) => refazer || !existsSync(fala.destino) || !estaEmDia(fala),
);
const caracteres = aGravar.reduce(
	(soma, fala) => soma + pedidoDaFala(fala, modelo).corpo.text.length,
	0,
);
console.log(
	`${aGravar.length} falas, ${caracteres} caracteres, modelo ${modelo}.`,
);

let gravadas = 0;
for (const fala of aGravar) {
	try {
		const pedido = pedidoDaFala(fala, modelo);
		const bytes = await gravar(fala, chave, pedido);
		registro[fala.identificador] = {
			modelo,
			assinatura: assinatura(fala, pedido),
		};
		gravadas += 1;
		console.log(
			`${fala.identificador} (${fala.quem}, ${fala.emocao}): ${bytes} bytes`,
		);
	} catch (erro) {
		console.error(`${fala.identificador}: ${erro.message}`);
		process.exitCode = 1;
		break;
	}
}

const comArquivo = todas
	.filter((fala) => existsSync(fala.destino))
	.map((fala) => fala.identificador);
const gravacoes = Object.fromEntries(
	comArquivo
		.filter((id) => Object.hasOwn(registro, id))
		.map((id) => [id, registro[id]]),
);
writeFileSync(REGISTRO, `${JSON.stringify(gravacoes, null, "\t")}\n`, "utf8");
escreverLista(comArquivo);

console.log(
	`gravadas: ${gravadas}, em dia: ${falas.length - aGravar.length}, com voz no site: ${comArquivo.length}.`,
);
