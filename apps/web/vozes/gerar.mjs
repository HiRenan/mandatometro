// Grava a narração do Jogo das Comissões com a ElevenLabs: um arquivo por
// fala, com o id dela no nome, dentro da pasta do jogo (vo/comissoes/c1-03.mp3),
// as vozes do time e a emoção que
// o roteiro marcou em cada fala.
//
// Uso: ELEVENLABS_API_KEY=... pnpm --filter web vozes
//   --refazer            regrava também as falas que já têm arquivo
//   --so comissoes/c1-01 grava só essas falas; o id sozinho (c1-01) pega a
//                        fala de mesmo id em todos os jogos
//   --modelo <id>        troca o modelo (o eleven_v3 usa as marcas de emoção)
//
// Grava em public/jogo/vo/<jogo>/ e refaz a lista de src/lib/jogo/vozes.ts, que é o
// que a tela lê: fala sem arquivo nessa lista simplesmente não tem voz.
//
// A chave vem do ambiente e nunca aparece no log nem no código. O roteiro e as
// regras estão em docs/jogo-das-comissoes.md.

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

/** As vozes brasileiras do catálogo da ElevenLabs que o time escolheu. */
const VOZ = {
	narracao: "NFmEzNOony1UsEJGXLth",
	lia: "GDzHdQOi6jjf8zaXhCYD",
	arnaldo: "4XmhZ74tBbUVCXIYNMMo",
	caio: "CstacWqMhJQlnfLPxRG4",
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
const modelo = valorDe("--modelo") ?? MODELO_PADRAO;
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
				if (!passo.emocao || !DIRECAO[passo.emocao]) {
					throw new Error(`${passo.id}: emoção desconhecida (${passo.emocao})`);
				}
				falas.push({ ...passo, jogo });
			}
		}
	}
	return falas;
}

/** O texto que vai ao modelo. O v3 entende a marca de emoção entre colchetes. */
function textoDaFala(fala) {
	const { marca } = DIRECAO[fala.emocao];
	return modelo.startsWith("eleven_v3")
		? `[${marca}] ${fala.texto}`
		: fala.texto;
}

async function gravar(fala, chave) {
	const { stability, style } = DIRECAO[fala.emocao];
	const resposta = await fetch(
		`https://api.elevenlabs.io/v1/text-to-speech/${VOZ[fala.quem]}?output_format=mp3_44100_128`,
		{
			method: "POST",
			headers: {
				"xi-api-key": chave,
				"content-type": "application/json",
				accept: "audio/mpeg",
			},
			body: JSON.stringify({
				text: textoDaFala(fala),
				model_id: modelo,
				voice_settings: {
					stability,
					style,
					similarity_boost: 0.75,
					use_speaker_boost: true,
				},
			}),
		},
	);
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

const chave = process.env.ELEVENLABS_API_KEY?.trim();
if (!chave) {
	console.error(
		"Defina a ELEVENLABS_API_KEY no ambiente. A chave fica no .env local, nunca no código.",
	);
	process.exit(2);
}

mkdirSync(SAIDA, { recursive: true });

const falas = falasDoRoteiro().filter(
	(fala) =>
		!so || so.includes(`${fala.jogo}/${fala.id}`) || so.includes(fala.id),
);
const caracteres = falas.reduce(
	(soma, fala) => soma + textoDaFala(fala).length,
	0,
);
console.log(
	`${falas.length} falas, ${caracteres} caracteres, modelo ${modelo}.`,
);

let gravadas = 0;
let puladas = 0;
for (const fala of falas) {
	const destino = join(SAIDA, fala.jogo, `${fala.id}.mp3`);
	if (!refazer && existsSync(destino)) {
		puladas += 1;
		continue;
	}
	try {
		const bytes = await gravar(fala, chave);
		gravadas += 1;
		console.log(`${fala.id} (${fala.quem}, ${fala.emocao}): ${bytes} bytes`);
	} catch (erro) {
		console.error(`${fala.id}: ${erro.message}`);
		process.exitCode = 1;
		break;
	}
}

const comArquivo = falasDoRoteiro()
	.filter((fala) => existsSync(join(SAIDA, fala.jogo, `${fala.id}.mp3`)))
	.map((fala) => `${fala.jogo}/${fala.id}`);
escreverLista(comArquivo);

console.log(
	`gravadas: ${gravadas}, já existiam: ${puladas}, com voz no site: ${comArquivo.length}.`,
);
