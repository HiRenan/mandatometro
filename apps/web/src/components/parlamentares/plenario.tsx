// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import type { VotoNominal } from "@/client";
import { NOME_DO_VOTO, VALORES, type Valor } from "@/lib/parlamentares/votos";

/** O lado de cada azulejo e o vão entre dois, nas unidades do desenho. */
const LADO = 10;
const PASSO = 12;

/**
 * O desenho de cada voto num azulejo de 10 por 10, todo em tinta, como o placar:
 * o Sim é cheio, o Não é um anel, a Abstenção é a metade, a Obstrução são
 * barras, a Presidência é um ponto e o Outro registro é um traço. O Não votou é
 * o azulejo cru, sem tinta. Ninguém precisa da cor para ler o voto.
 */
const DESENHO: Record<Valor, (x: number, y: number) => string> = {
	sim: (x, y) => `M${x} ${y}h10v10h-10z`,
	nao: (x, y) => `M${x} ${y}h10v10h-10z M${x + 2.5} ${y + 2.5}v5h5v-5z`,
	abstencao: (x, y) => `M${x} ${y}L${x + 10} ${y + 10}H${x}z`,
	obstrucao: (x, y) =>
		`M${x} ${y}h2v10h-2z M${x + 4} ${y}h2v10h-2z M${x + 8} ${y}h2v10h-2z`,
	presidente: (x, y) => `M${x + 2} ${y + 5}a3 3 0 1 0 6 0a3 3 0 1 0 -6 0z`,
	nao_votou: (x, y) => `M${x} ${y}h10v10h-10z`,
	outro: (x, y) => `M${x} ${y + 4}h10v2h-10z`,
};

/**
 * O plenário: um azulejo por voto, agrupados na ordem do placar, no painel do
 * cartaz da votação. São dois desenhos, e o CSS mostra um de cada vez: o alto,
 * para os 30% da direita a partir do lg, e o largo, para a faixa do alto no
 * celular. Cada voto vira um pedaço do caminho do seu valor, e o desenho tem só
 * um caminho por valor, mesmo com os 513 votos da Câmara.
 *
 * É desenho: o placar logo abaixo diz o mesmo em texto, e o painel inteiro fica
 * fora do leitor de tela, com a legenda visível embaixo.
 */
export function Plenario({ votos }: { votos: VotoNominal[] }) {
	const emOrdem = VALORES.flatMap((valor) =>
		votos.filter((voto) => voto.valor === valor),
	);
	const presentes = VALORES.filter((valor) =>
		votos.some((voto) => voto.valor === valor),
	);
	return (
		<div aria-hidden="true" className="painel-da-votacao">
			<Desenho votos={emOrdem} proporcao={0.62} className="plenario-alto" />
			<Desenho votos={emOrdem} proporcao={3.5} className="plenario-largo" />
			<ul role="list" className="legenda-do-plenario rotulo">
				{presentes.map((valor) => (
					<li key={valor}>
						<svg
							aria-hidden="true"
							viewBox="0 0 10 10"
							className="amostra"
							focusable="false"
						>
							<path d={DESENHO[valor](0, 0)} className={`voto-${valor}`} />
						</svg>
						{NOME_DO_VOTO[valor]}
					</li>
				))}
			</ul>
		</div>
	);
}

/**
 * Um desenho do plenário, com as colunas que dão a proporção pedida (largura
 * sobre altura): 18 colunas para os 513 da Câmara no painel alto, 42 na faixa.
 */
function Desenho({
	votos,
	proporcao,
	className,
}: {
	votos: VotoNominal[];
	proporcao: number;
	className: string;
}) {
	const colunas = Math.max(
		1,
		Math.min(votos.length, Math.round(Math.sqrt(votos.length * proporcao))),
	);
	const fileiras = Math.ceil(votos.length / colunas);
	const caminhos = new Map<Valor, string[]>();
	votos.forEach((voto, lugar) => {
		const x = (lugar % colunas) * PASSO;
		const y = Math.floor(lugar / colunas) * PASSO;
		const pedacos = caminhos.get(voto.valor) ?? [];
		pedacos.push(DESENHO[voto.valor](x, y));
		caminhos.set(voto.valor, pedacos);
	});
	return (
		<svg
			aria-hidden="true"
			viewBox={`0 0 ${colunas * PASSO - (PASSO - LADO)} ${fileiras * PASSO - (PASSO - LADO)}`}
			className={`plenario ${className}`}
			focusable="false"
		>
			{[...caminhos].map(([valor, pedacos]) => (
				<path key={valor} d={pedacos.join(" ")} className={`voto-${valor}`} />
			))}
		</svg>
	);
}
