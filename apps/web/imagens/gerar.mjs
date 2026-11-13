// Gera o ícone da aba e a prévia do link a partir de icone.html e previa.html,
// no Edge ou no Chrome sem janela, pelo protocolo de depuração do navegador,
// sem dependência nova. As fontes são as do site (a Archivo e a Instrument
// Serif itálica do @mandatometro/ui), embutidas no HTML. Cada PNG leva dentro
// dele de onde veio.
//
// Uso: pnpm --filter web imagens
// Com NAVEGADOR=<caminho do Edge ou do Chrome>, usa esse navegador.
//
// Grava em public/:
// - favicon.ico, com 16, 32 e 48 px;
// - apple-touch-icon.png, com 180 px;
// - previa.png, com 1200 x 630 px.

import { spawn } from "node:child_process";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32 } from "node:zlib";

const pasta = import.meta.dirname;
const publico = join(pasta, "..", "public");

const CANDIDATOS = [
	"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Google/Chrome/Application/chrome.exe",
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
	"/usr/bin/chromium-browser",
	"/usr/bin/microsoft-edge",
];

const ORIGEM_DO_ICONE =
	"Gerado por apps/web/imagens/gerar.mjs a partir de apps/web/imagens/icone.html: o M do nome em Archivo (peso 900, largura 68%), em papel no bloco de tinta, com a tira das cinco fitas do Bonfim embaixo. Desenhado em HTML e CSS, sem gerador de imagem.";
const ORIGEM_DA_PREVIA =
	"Gerado por apps/web/imagens/gerar.mjs a partir de apps/web/imagens/previa.html: o bloco de tinta com o nome e o lema, a tira das cinco fitas do Bonfim, o título da página inicial no papel e uma fileira de azulejos. Desenhado em HTML e CSS, sem gerador de imagem.";

const espera = (ms) => new Promise((pronto) => setTimeout(pronto, ms));

function acharNavegador() {
	if (process.env.NAVEGADOR) {
		if (!existsSync(process.env.NAVEGADOR)) {
			throw new Error(
				`NAVEGADOR aponta para ${process.env.NAVEGADOR}, que não existe`,
			);
		}
		return process.env.NAVEGADOR;
	}
	const achado = CANDIDATOS.find((caminho) => existsSync(caminho));
	if (!achado) {
		throw new Error(
			"Não achei o Edge nem o Chrome. Use NAVEGADOR=<caminho do navegador>.",
		);
	}
	return achado;
}

/** As fontes do site, embutidas: a página não pede nada à rede nem ao disco. */
function fontes() {
	const doUi = createRequire(
		new URL("../../../packages/ui/package.json", import.meta.url),
	);
	const archivo = readFileSync(
		doUi.resolve(
			"@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2",
		),
	).toString("base64");
	const italica = readFileSync(
		doUi.resolve(
			"@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2",
		),
	).toString("base64");
	return `@font-face {
		font-family: "Archivo Variable";
		font-style: normal;
		font-display: block;
		font-weight: 100 900;
		font-stretch: 62% 125%;
		src: url(data:font/woff2;base64,${archivo}) format("woff2-variations");
	}
	@font-face {
		font-family: "Instrument Serif";
		font-style: italic;
		font-display: block;
		font-weight: 400;
		src: url(data:font/woff2;base64,${italica}) format("woff2");
	}`;
}

/** Abre o navegador sem janela e conecta no protocolo de depuração. */
async function abrirNavegador() {
	const perfil = mkdtempSync(join(tmpdir(), "mandatometro-imagens-"));
	const processo = spawn(
		acharNavegador(),
		[
			"--headless=new",
			"--remote-debugging-port=0",
			`--user-data-dir=${perfil}`,
			"--force-color-profile=srgb",
			"--disable-lcd-text",
			"--hide-scrollbars",
			"--no-first-run",
			"--no-default-browser-check",
			"--disable-extensions",
			"about:blank",
		],
		{ stdio: "ignore" },
	);
	// Com a porta 0, o navegador escolhe uma porta livre e a escreve neste arquivo.
	const arquivoDaPorta = join(perfil, "DevToolsActivePort");
	for (let i = 0; i < 100 && !existsSync(arquivoDaPorta); i++) {
		await espera(100);
	}
	if (!existsSync(arquivoDaPorta)) {
		processo.kill();
		throw new Error("O navegador não abriu a porta de depuração.");
	}
	await espera(100);
	const [porta, caminho] = readFileSync(arquivoDaPorta, "utf8").split("\n");
	const ws = new WebSocket(`ws://127.0.0.1:${porta}${caminho}`);
	await new Promise((pronto, falha) => {
		ws.addEventListener("open", pronto, { once: true });
		ws.addEventListener("error", falha, { once: true });
	});

	let ultimo = 0;
	const pendentes = new Map();
	ws.addEventListener("message", (evento) => {
		const mensagem = JSON.parse(evento.data);
		const pendente = pendentes.get(mensagem.id);
		if (!pendente) {
			return;
		}
		pendentes.delete(mensagem.id);
		if (mensagem.error) {
			pendente.falha(new Error(mensagem.error.message));
		} else {
			pendente.pronto(mensagem.result);
		}
	});
	const enviar = (method, params, sessionId) =>
		new Promise((pronto, falha) => {
			const id = ++ultimo;
			pendentes.set(id, { pronto, falha });
			ws.send(JSON.stringify({ id, method, params: params ?? {}, sessionId }));
		});

	return {
		enviar,
		async fechar() {
			await enviar("Browser.close").catch(() => {});
			ws.close();
			await espera(500);
			processo.kill();
			rmSync(perfil, { recursive: true, force: true, maxRetries: 5 });
		},
	};
}

/** Abre o HTML do tamanho pedido, espera as fontes e devolve a foto em PNG. */
async function fotografar(navegador, html, largura, altura) {
	const { targetId } = await navegador.enviar("Target.createTarget", {
		url: "about:blank",
	});
	const { sessionId } = await navegador.enviar("Target.attachToTarget", {
		targetId,
		flatten: true,
	});
	const enviar = (method, params) =>
		navegador.enviar(method, params, sessionId);
	await enviar("Page.enable");
	await enviar("Emulation.setDeviceMetricsOverride", {
		width: largura,
		height: altura,
		deviceScaleFactor: 1,
		mobile: false,
	});
	const { frameTree } = await enviar("Page.getFrameTree");
	await enviar("Page.setDocumentContent", {
		frameId: frameTree.frame.id,
		html,
	});
	const { result } = await enviar("Runtime.evaluate", {
		expression: `Promise.all([
				document.fonts.load('900 16px "Archivo Variable"'),
				document.fonts.load('italic 400 16px "Instrument Serif"'),
			])
			.then(() => document.fonts.ready)
			.then(() => new Promise((pronto) => requestAnimationFrame(() => requestAnimationFrame(pronto))))
			.then(() => document.fonts.check('900 16px "Archivo Variable"')
				&& document.fonts.check('italic 400 16px "Instrument Serif"'))`,
		awaitPromise: true,
		returnByValue: true,
	});
	if (result.value !== true) {
		throw new Error("As fontes do site não carregaram.");
	}
	const { data } = await enviar("Page.captureScreenshot", {
		format: "png",
		clip: { x: 0, y: 0, width: largura, height: altura, scale: 1 },
	});
	await navegador.enviar("Target.closeTarget", { targetId });
	return Buffer.from(data, "base64");
}

/**
 * Põe no PNG um bloco de texto (tEXt) com a origem dele, antes do fim (IEND),
 * na chave e na codificação (UTF-8) que o Impeccable lê e grava
 * (impeccable embed-prompt).
 */
function comOrigem(png, origem) {
	const dados = Buffer.concat([
		Buffer.from("impeccable:prompt\0", "latin1"),
		Buffer.from(origem, "utf8"),
	]);
	const tipoEDados = Buffer.concat([Buffer.from("tEXt", "latin1"), dados]);
	const bloco = Buffer.alloc(12 + dados.length);
	bloco.writeUInt32BE(dados.length, 0);
	tipoEDados.copy(bloco, 4);
	bloco.writeUInt32BE(crc32(tipoEDados), 8 + dados.length);
	const fim = png.length - 12;
	if (png.toString("latin1", fim + 4, fim + 8) !== "IEND") {
		throw new Error("O PNG não termina no bloco IEND.");
	}
	return Buffer.concat([png.subarray(0, fim), bloco, png.subarray(fim)]);
}

/** Junta os PNG num .ico, que aceita PNG dentro desde o Windows Vista. */
function ico(imagens) {
	const cabecalho = Buffer.alloc(6);
	cabecalho.writeUInt16LE(0, 0);
	cabecalho.writeUInt16LE(1, 2);
	cabecalho.writeUInt16LE(imagens.length, 4);
	let posicao = 6 + 16 * imagens.length;
	const entradas = imagens.map(({ tamanho, png }) => {
		const entrada = Buffer.alloc(16);
		entrada.writeUInt8(tamanho, 0);
		entrada.writeUInt8(tamanho, 1);
		entrada.writeUInt16LE(1, 4);
		entrada.writeUInt16LE(32, 6);
		entrada.writeUInt32LE(png.length, 8);
		entrada.writeUInt32LE(posicao, 12);
		posicao += png.length;
		return entrada;
	});
	return Buffer.concat([
		cabecalho,
		...entradas,
		...imagens.map(({ png }) => png),
	]);
}

const comFontes = (arquivo) =>
	readFileSync(join(pasta, arquivo), "utf8").replace("/* FONTES */", fontes());

const navegador = await abrirNavegador();
try {
	const icone = comFontes("icone.html");
	const tamanhos = [16, 32, 48];
	const pequenos = [];
	for (const tamanho of tamanhos) {
		pequenos.push({
			tamanho,
			png: comOrigem(
				await fotografar(navegador, icone, tamanho, tamanho),
				ORIGEM_DO_ICONE,
			),
		});
	}
	const arquivos = {
		"favicon.ico": ico(pequenos),
		"apple-touch-icon.png": comOrigem(
			await fotografar(navegador, icone, 180, 180),
			ORIGEM_DO_ICONE,
		),
		"previa.png": comOrigem(
			await fotografar(navegador, comFontes("previa.html"), 1200, 630),
			ORIGEM_DA_PREVIA,
		),
	};
	for (const [nome, dados] of Object.entries(arquivos)) {
		writeFileSync(join(publico, nome), dados);
		console.log(`public/${nome}: ${dados.length} bytes`);
	}
} finally {
	await navegador.fechar();
}
