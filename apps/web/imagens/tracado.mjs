// Desenha o traçado dos 27 estados, o do mapa da lista dos parlamentares e o do
// enfeite da página inicial, a partir das malhas do IBGE. O arquivo de origem é
// o dos estados do luizpedone/municipal-brazilian-geodata (licença MIT), num
// commit fixo: o mesmo roteiro dá sempre o mesmo desenho. Sem dependência: só o
// fetch do Node.
//
// Uso: pnpm --filter web tracado
// Grava src/lib/parlamentares/tracado.ts. Para mudar o traçado, mude este
// roteiro e gere de novo, sem editar o arquivo gravado.
import { writeFileSync } from "node:fs";

const COMMIT = "8a2e7476faf34899c26d74bea03373a2fbb800fb";
const REPOSITORIO = "luizpedone/municipal-brazilian-geodata";
const FONTE = `https://github.com/${REPOSITORIO}/blob/${COMMIT}/data/Brasil.json`;
const BRUTO = `https://raw.githubusercontent.com/${REPOSITORIO}/${COMMIT}`;

/** A largura do desenho, em unidades do viewBox. A altura sai da projeção. */
const LARGURA = 1000;
/** A folga em volta, para o fio do contorno não ser cortado na beirada. */
const MARGEM = 4;
/** Até quanto um ponto pode sair da linha simplificada, em unidades. */
const TOLERANCIA = 1.2;
/**
 * A menor ilha que fica, em km². No tamanho do mapa, uma ilha menor vira um
 * ponto perto do litoral, e Fernando de Noronha e Trindade alargariam a caixa.
 */
const MENOR_ILHA = 1000;
/** O raio médio da Terra, em km, para a área das ilhas. */
const RAIO_DA_TERRA = 6371;

/** A região de cada estado, como vem no arquivo de origem. */
const REGIOES = {
	NO: "Norte",
	NE: "Nordeste",
	SE: "Sudeste",
	SU: "Sul",
	CO: "Centro-Oeste",
};

/**
 * A projeção cônica equivalente de Albers, com os parâmetros da Grade
 * Estatística do IBGE: meridiano central de -54°, latitude de origem de -12° e
 * paralelos-padrão de -2° e -22°. Devolve x para o leste e y para o sul, como
 * no SVG.
 */
function projecao() {
	const grau = Math.PI / 180;
	const [p1, p2, origem, meridiano] = [-2, -22, -12, -54].map((v) => v * grau);
	const n = (Math.sin(p1) + Math.sin(p2)) / 2;
	const c = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
	const raio = (lat) => Math.sqrt(c - 2 * n * Math.sin(lat)) / n;
	const raio0 = raio(origem);
	return ([lon, lat]) => {
		const r = raio(lat * grau);
		const t = n * (lon * grau - meridiano);
		return [r * Math.sin(t), r * Math.cos(t) - raio0];
	};
}

/** A área de um anel, pela fórmula do laço. */
function area(anel) {
	let soma = 0;
	for (let i = 0; i < anel.length; i++) {
		const [x1, y1] = anel[i];
		const [x2, y2] = anel[(i + 1) % anel.length];
		soma += x1 * y2 - x2 * y1;
	}
	return Math.abs(soma) / 2;
}

/** Douglas-Peucker numa linha aberta: as pontas ficam. */
function simplificarAberta(pontos, tolerancia) {
	const fica = new Uint8Array(pontos.length);
	fica[0] = 1;
	fica[pontos.length - 1] = 1;
	const pilha = [[0, pontos.length - 1]];
	while (pilha.length > 0) {
		const [a, b] = pilha.pop();
		if (b - a < 2) continue;
		const [ax, ay] = pontos[a];
		const [bx, by] = pontos[b];
		const dx = bx - ax;
		const dy = by - ay;
		const comprimento = Math.hypot(dx, dy);
		let maior = 0;
		let onde = -1;
		for (let i = a + 1; i < b; i++) {
			const [px, py] = pontos[i];
			const distancia =
				comprimento > 0
					? Math.abs((px - ax) * dy - (py - ay) * dx) / comprimento
					: Math.hypot(px - ax, py - ay);
			if (distancia > maior) {
				maior = distancia;
				onde = i;
			}
		}
		if (maior > tolerancia) {
			fica[onde] = 1;
			pilha.push([a, onde], [onde, b]);
		}
	}
	return pontos.filter((_, i) => fica[i]);
}

/** Os pontos em inteiros, sem dois iguais em seguida. */
function inteiros(pontos) {
	const saida = [];
	for (const [x, y] of pontos) {
		const ponto = [Math.round(x), Math.round(y)];
		const ultimo = saida[saida.length - 1];
		if (!ultimo || ultimo[0] !== ponto[0] || ultimo[1] !== ponto[1]) {
			saida.push(ponto);
		}
	}
	return saida;
}

/** Números inteiros sem espaço antes do sinal de menos, que já separa. */
function numeros(lista) {
	return lista
		.map((numero, indice) => (indice > 0 && numero >= 0 ? " " : "") + numero)
		.join("");
}

/** Uma linha no `d` do SVG: o primeiro ponto absoluto e os outros relativos. */
function linha(pontos, fechada) {
	const [inicio, ...resto] = pontos;
	const relativos = [];
	let anterior = inicio;
	for (const ponto of resto) {
		relativos.push(ponto[0] - anterior[0], ponto[1] - anterior[1]);
		anterior = ponto;
	}
	return `M${numeros(inicio)}l${numeros(relativos)}${fechada ? "z" : ""}`;
}

async function baixar(caminho) {
	const resposta = await fetch(`${BRUTO}/${caminho}`);
	if (!resposta.ok) {
		throw new Error(`${caminho}: ${resposta.status} ${resposta.statusText}`);
	}
	return resposta;
}

const malha = await (await baixar("data/Brasil.json")).json();
const licenca = (await (await baixar("LICENSE")).text()).trim();
const projetar = projecao();

// Os pedaços de cada estado que ficam, sem o ponto que fecha o anel. A chave de
// cada ponto é a coordenada em milionésimos de grau: dois vizinhos têm os
// mesmos pontos na fronteira.
const chave = ([lon, lat]) =>
	`${Math.round(lon * 1e6)},${Math.round(lat * 1e6)}`;
const ficam = [];
let ilhas = 0;
for (const estado of malha.features) {
	const { UF: sigla, REGIAO: regiao } = estado.properties;
	const { type, coordinates } = estado.geometry;
	const poligonos = type === "Polygon" ? [coordinates] : coordinates;
	for (const [anel, ...buracos] of poligonos) {
		if (buracos.length > 0) {
			throw new Error(
				`${sigla} tem um buraco, e este roteiro não desenha buraco`,
			);
		}
		// A projeção é numa esfera de raio 1 e guarda a área: vezes o raio da
		// Terra ao quadrado, dá a área em km².
		if (area(anel.map(projetar)) * RAIO_DA_TERRA ** 2 < MENOR_ILHA) {
			ilhas++;
			continue;
		}
		const pontos = [];
		for (const ponto of anel) {
			if (pontos.length === 0 || chave(pontos.at(-1)) !== chave(ponto)) {
				pontos.push(ponto);
			}
		}
		if (chave(pontos[0]) === chave(pontos.at(-1))) pontos.pop();
		ficam.push({ sigla, regiao: REGIOES[regiao], pontos });
	}
}

// A caixa do desenho, pela projeção dos pedaços que ficam.
let [minX, minY, maxX, maxY] = [
	Number.POSITIVE_INFINITY,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
];
for (const { pontos } of ficam) {
	for (const [x, y] of pontos.map(projetar)) {
		[minX, minY] = [Math.min(minX, x), Math.min(minY, y)];
		[maxX, maxY] = [Math.max(maxX, x), Math.max(maxY, y)];
	}
}
const escala = (LARGURA - 2 * MARGEM) / (maxX - minX);
const ALTURA = Math.ceil((maxY - minY) * escala + 2 * MARGEM);
const naCaixa = (ponto) => {
	const [x, y] = projetar(ponto);
	return [MARGEM + (x - minX) * escala, MARGEM + (y - minY) * escala];
};

// De quem é cada lado: um anel só (o litoral ou a fronteira com outro país) ou
// os dois vizinhos.
const donos = new Map();
const lado = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
ficam.forEach(({ pontos }, indice) => {
	for (let i = 0; i < pontos.length; i++) {
		const k = lado(chave(pontos[i]), chave(pontos[(i + 1) % pontos.length]));
		const lista = donos.get(k) ?? [];
		if (!lista.includes(indice)) lista.push(indice);
		donos.set(k, lista);
	}
});

/**
 * Os trechos de um anel: cada trecho é uma fronteira inteira com o mesmo dono,
 * de uma junção à outra. Os dois vizinhos de uma fronteira acham o mesmo trecho,
 * e ele é simplificado uma vez só, para não abrir fresta entre os dois.
 */
const trechos = new Map();
function trechosDoAnel({ sigla, pontos }) {
	const n = pontos.length;
	const chaves = pontos.map(chave);
	const dono = (i) =>
		[...donos.get(lado(chaves[i], chaves[(i + 1) % n]))]
			.sort((a, b) => a - b)
			.join(",");
	const cortes = [];
	for (let i = 0; i < n; i++) {
		if (dono((i - 1 + n) % n) !== dono(i)) cortes.push(i);
	}
	if (cortes.length === 0) {
		throw new Error(
			`${sigla} tem um pedaço sem vizinho (uma ilha grande), que este roteiro não desenha`,
		);
	}
	return cortes.map((corte, j) => {
		const fim = cortes[(j + 1) % cortes.length];
		const indices = [];
		for (let i = corte; ; i = (i + 1) % n) {
			indices.push(i);
			if (indices.length > 1 && i === fim) break;
		}
		// Os dois vizinhos andam o trecho em sentidos opostos: o trecho é guardado
		// num sentido só, o da chave menor.
		const ida = indices.map((i) => chaves[i]);
		const invertido = [...ida].reverse().join(";") < ida.join(";");
		const k = (invertido ? [...ida].reverse() : ida).join(";");
		if (!trechos.has(k)) {
			const naOrdem = invertido ? [...indices].reverse() : indices;
			trechos.set(k, {
				pontos: inteiros(
					simplificarAberta(
						naOrdem.map((i) => naCaixa(pontos[i])),
						TOLERANCIA,
					),
				),
				donos: dono(indices[0]).split(",").map(Number),
			});
		}
		return { k, invertido };
	});
}

// Cada anel de volta, emendando os trechos já simplificados.
const caminhos = new Map();
for (const anel of ficam) {
	const pontos = [];
	for (const { k, invertido } of trechosDoAnel(anel)) {
		const trecho = trechos.get(k).pontos;
		const naOrdem = invertido ? [...trecho].reverse() : trecho;
		pontos.push(...(pontos.length > 0 ? naOrdem.slice(1) : naOrdem));
	}
	const semFim =
		pontos.length > 1 &&
		pontos[0][0] === pontos.at(-1)[0] &&
		pontos[0][1] === pontos.at(-1)[1]
			? pontos.slice(0, -1)
			: pontos;
	if (semFim.length < 3) continue;
	caminhos.set(anel.sigla, [
		...(caminhos.get(anel.sigla) ?? []),
		linha(semFim, true),
	]);
}

// As linhas grossas: a fronteira entre duas regiões e o contorno do país.
const fronteiras = [];
const contorno = [];
for (const { pontos, donos: quem } of trechos.values()) {
	if (pontos.length < 2) continue;
	if (quem.length === 1) {
		contorno.push(linha(pontos, false));
	} else if (ficam[quem[0]].regiao !== ficam[quem[1]].regiao) {
		fronteiras.push(linha(pontos, false));
	}
}

const siglas = [...caminhos.keys()].sort();
if (siglas.length !== 27) {
	throw new Error(`o traçado tem ${siglas.length} estados, e não 27`);
}

const comentario = (texto) =>
	texto
		.split("\n")
		.map((linhaDoTexto) => `// ${linhaDoTexto}`.trimEnd())
		.join("\n");

const arquivo = `// Gerado por imagens/tracado.mjs (pnpm --filter web tracado). Para mudar o
// traçado, mude o roteiro e gere de novo, sem editar este arquivo.
//
// O traçado dos 27 estados, na projeção de Albers da Grade Estatística do IBGE,
// numa caixa de ${LARGURA} por ${ALTURA}. Cada fronteira foi simplificada uma vez só
// para os dois vizinhos (tolerância de ${String(TOLERANCIA).replace(".", ",")}), e as ${ilhas} ilhas com menos de
// ${MENOR_ILHA.toLocaleString("pt-BR")} km² saíram: no tamanho do mapa, elas viram um ponto.
//
// Fonte: IBGE, malhas territoriais, pela compilação de Luiz Pedone:
// ${FONTE}
// A licença da compilação, que vale para este traçado:
//
${comentario(licenca)}

/** A largura e a altura do desenho, no viewBox. */
export const LARGURA_DO_TRACADO = ${LARGURA};
export const ALTURA_DO_TRACADO = ${ALTURA};

/** O caminho de cada estado, pela sigla. */
export const CAMINHOS: Readonly<Record<string, string>> = {
${siglas.map((sigla) => `\t${sigla}: "${caminhos.get(sigla).join("")}",`).join("\n")}
};

/** As fronteiras entre duas regiões, num caminho só, para o fio grosso. */
export const FRONTEIRAS_DAS_REGIOES =
\t"${fronteiras.join("")}";

/** O contorno do país, o litoral e as fronteiras com os vizinhos, num caminho só. */
export const CONTORNO =
\t"${contorno.join("")}";
`;

const destino = new URL("../src/lib/parlamentares/tracado.ts", import.meta.url);
writeFileSync(destino, arquivo);
const compartilhados = [...trechos.values()].filter(
	(t) => t.donos.length === 2,
).length;
console.log(
	`src/lib/parlamentares/tracado.ts: ${arquivo.length} bytes, ${trechos.size} trechos (${compartilhados} entre dois estados), ${ficam.length} pedaços, ${ilhas} ilhas fora, caixa ${LARGURA} x ${ALTURA}`,
);
