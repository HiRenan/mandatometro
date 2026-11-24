// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import {
	type FocusEvent,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { classes } from "@/lib/classes";
import { plural } from "@/lib/formatar";
import {
	type ContagemDoEstado,
	classeDaRegiao,
	ESTADOS,
	ESTADOS_PELO_NOME,
	type Estado,
	estadoDaSigla,
	REGIOES,
} from "@/lib/parlamentares";
import {
	ALTURA_DO_TRACADO,
	CAMINHOS,
	CONTORNO,
	FRONTEIRAS_DAS_REGIOES,
	LARGURA_DO_TRACADO,
} from "@/lib/parlamentares/tracado";
import { FaixaDeInformacoes } from "../faixa-de-informacoes";

/** Os azulejos seguem a ordem da legenda e, em cada região, a das siglas. */
const ESTADOS_PARA_OS_AZULEJOS = [...ESTADOS].sort(
	(a, b) =>
		REGIOES.indexOf(a.regiao) - REGIOES.indexOf(b.regiao) ||
		a.sigla.localeCompare(b.sigla, "pt-BR"),
);

// Cada link acende o contorno da mesma UF na camada de cima do SVG.
const REGRAS_DO_FOCO_NATIVO = `${ESTADOS.map(
	({ sigla }) =>
		`.desenho-do-brasil:has(.estado-no-mapa[data-uf="${sigla}"]:focus-visible) .foco-nativo[data-uf="${sigla}"]`,
).join(",\n")} { display: inline; }`;

/**
 * O mapa do Brasil, no painel do cartaz da lista (o Renan, em 22/11/2026, na
 * #289: "Mapa de verdade"). Cada estado é um link para a lista dele (?uf=SC), na
 * fita da região, e o Tab anda pelas cinco regiões, cada uma numa lista com o
 * nome dela. Com o ponteiro ou o foco num estado, ele sobe sobre a sombra de
 * tinta, as outras regiões ficam em papel, e a linha embaixo do mapa diz o nome,
 * a região e os deputados. O estado aberto fica em tinta, com o aria-current.
 *
 * Os 27 estados ganham também um azulejo, que é atalho do ponteiro e fica fora
 * do leitor de tela e do Tab, porque o mapa já tem o link de cada um.
 *
 * Quando o mapa fica com menos de 17,75rem (a 320 px, ou com a letra a 200% no
 * celular), o container query troca o mapa pela lista dos estados em ordem
 * alfabética. Os dois vêm no HTML, e o CSS mostra um de cada vez: o
 * display: none tira o outro do leitor de tela e do Tab.
 */
export function MapaDosEstados({
	estados,
	escolhido,
}: {
	estados: ContagemDoEstado[];
	/** A sigla do estado aberto, que a linha embaixo do mapa diz em repouso. */
	escolhido?: string;
}) {
	const idDoMapa = useId();
	const desenho = useRef<SVGSVGElement>(null);
	const deputados = new Map(
		estados.map((estado) => [estado.sigla, estado.deputados]),
	);
	const quantos = (estado: Estado) => deputados.get(estado.sigla) ?? 0;
	// O estado com o foco do teclado vale mais que o do ponteiro: o anel fica
	// sempre à vista.
	const [apontado, setApontado] = useState<string | null>(null);
	const [focado, setFocado] = useState<string | null>(null);
	const destaque = estadoDaSigla(focado ?? apontado);
	const comFoco = destaque !== null && destaque.sigla === focado;
	const naFicha = destaque ?? estadoDaSigla(escolhido);

	// Um Tab antes da hidratação já deu foco ao link, sem passar pelo onFocus.
	useLayoutEffect(() => {
		const sigla = desenho.current?.querySelector<SVGAElement>(
			".estado-no-mapa:focus-visible",
		)?.dataset.uf;
		if (sigla) setFocado(sigla);
	}, []);

	const apontar = (sigla: string) => ({
		onPointerEnter: () => setApontado(sigla),
		onPointerLeave: () =>
			setApontado((atual) => (atual === sigla ? null : atual)),
	});
	const focar = (sigla: string) => ({
		onFocus: (evento: FocusEvent<Element>) => {
			if (evento.currentTarget.matches(":focus-visible")) setFocado(sigla);
		},
		onBlur: () => setFocado((atual) => (atual === sigla ? null : atual)),
	});

	return (
		<nav aria-label="Estados" className="mapa-dos-estados">
			<div className="mapa">
				<style>{REGRAS_DO_FOCO_NATIVO}</style>
				<svg
					ref={desenho}
					viewBox={`0 0 ${LARGURA_DO_TRACADO} ${ALTURA_DO_TRACADO}`}
					role="presentation"
					className="desenho-do-brasil"
				>
					{REGIOES.map((regiao) => (
						// biome-ignore lint/a11y/useSemanticElements: no SVG não há ul nem li; o g com o papel de lista leva o nome da região, e o leitor de tela diz quantos estados ela tem.
						// biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole: o g do SVG não é interativo; o Biome o toma por um.
						<g
							key={regiao}
							role="list"
							aria-label={regiao}
							className={classes(
								"regiao-do-mapa",
								classeDaRegiao(regiao),
								destaque && destaque.regiao !== regiao && "apagada",
							)}
						>
							{ESTADOS.filter((estado) => estado.regiao === regiao).map(
								(estado) => (
									// biome-ignore lint/a11y/useSemanticElements: idem, o item da lista da região.
									// biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole: idem.
									<g key={estado.sigla} role="listitem">
										<Link
											to="/parlamentares"
											search={{ uf: estado.sigla }}
											activeOptions={{ exact: true }}
											aria-label={nomeDoLink(estado, quantos(estado))}
											className="estado-no-mapa"
											data-uf={estado.sigla}
											{...apontar(estado.sigla)}
											{...focar(estado.sigla)}
										>
											<path
												id={`${idDoMapa}-${estado.sigla}`}
												d={CAMINHOS[estado.sigla]}
												vectorEffect="non-scaling-stroke"
											/>
										</Link>
									</g>
								),
							)}
						</g>
					))}
					<path d={FRONTEIRAS_DAS_REGIOES} className="fronteiras-das-regioes" />
					<path d={CONTORNO} className="contorno-do-brasil" />
					{/* O foco nativo reaproveita cada caminho no alto do SVG: desenhado
					    dentro do link, o anel ficaria embaixo dos vizinhos seguintes. */}
					{/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: o g só tem cópias decorativas de caminhos, sem foco. */}
					<g className="focos-nativos" aria-hidden="true">
						{ESTADOS.map(({ sigla, regiao }) => {
							const href = `#${idDoMapa}-${sigla}`;
							return (
								<g
									key={sigla}
									className={classes(
										"foco-nativo",
										classeDaRegiao(regiao),
										sigla === escolhido && "aberto",
									)}
									data-uf={sigla}
								>
									<use href={href} className="fio-claro" />
									<use href={href} className="anel" />
									<use href={href} className="estado" />
								</g>
							);
						})}
					</g>
					{/* O SVG não tem z-index: o estado em destaque sobe numa cópia, que
					    vem depois de tudo. Os caminhos sem nome ficam fora do leitor de
					    tela. */}
					{destaque && (
						<g
							className={classes(
								"estado-em-destaque",
								classeDaRegiao(destaque.regiao),
								destaque.sigla === escolhido && "aberto",
								comFoco && "com-foco",
							)}
						>
							<path d={CAMINHOS[destaque.sigla]} className="sombra" />
							<g key={destaque.sigla} className="subida">
								{comFoco && (
									<>
										<path d={CAMINHOS[destaque.sigla]} className="fio-claro" />
										<path d={CAMINHOS[destaque.sigla]} className="anel" />
									</>
								)}
								<path d={CAMINHOS[destaque.sigla]} className="estado" />
							</g>
						</g>
					)}
				</svg>
				<div aria-hidden="true" className="ficha-do-mapa">
					{naFicha ? (
						<>
							<p className="nome-na-ficha">{naFicha.nome}</p>
							<FaixaDeInformacoes>
								<span>{naFicha.regiao}</span>
								<span>{plural(quantos(naFicha), "deputado", "deputados")}</span>
							</FaixaDeInformacoes>
						</>
					) : (
						<p className="ficha-vazia">Escolha um estado.</p>
					)}
				</div>
				<div aria-hidden="true" className="atalhos-do-mapa">
					{ESTADOS_PARA_OS_AZULEJOS.map((estado) => (
						<Link
							key={estado.sigla}
							to="/parlamentares"
							search={{ uf: estado.sigla }}
							activeOptions={{ exact: true }}
							tabIndex={-1}
							className={classes(
								"atalho-do-estado",
								classeDaRegiao(estado.regiao),
								destaque?.sigla === estado.sigla && "aceso",
								comFoco && destaque?.sigla === estado.sigla && "com-foco",
							)}
							{...apontar(estado.sigla)}
						>
							<span className="sigla">{estado.sigla}</span>
							<span className="numero">{quantos(estado)}</span>
						</Link>
					))}
				</div>
				<ul aria-hidden="true" className="legenda-do-mapa">
					{REGIOES.map((regiao) => (
						<li key={regiao} className={classeDaRegiao(regiao)}>
							{regiao}
						</li>
					))}
				</ul>
				<p className="credito-do-mapa">
					Traçado dos estados: IBGE ·{" "}
					<a href="/licenca-do-tracado.txt">Licença MIT</a>
				</p>
			</div>
			<ul role="list" className="lista-de-estados">
				{ESTADOS_PELO_NOME.map((estado) => (
					<li key={estado.sigla}>
						<LinkDoEstado estado={estado} deputados={quantos(estado)} />
					</li>
				))}
			</ul>
		</nav>
	);
}

/** "SC Santa Catarina, 16 deputados", e "1 deputado" no singular. */
function nomeDoLink(estado: Estado, deputados: number): string {
	return `${estado.sigla} ${estado.nome}, ${plural(deputados, "deputado", "deputados")}`;
}

/**
 * O link de um estado na lista: a sigla, o nome e o número de deputados. O nome
 * do link traz o que a tela mostra ("Santa Catarina", "16"), para quem comanda
 * pela voz.
 */
function LinkDoEstado({
	estado,
	deputados,
}: {
	estado: Estado;
	deputados: number;
}) {
	return (
		<Link
			to="/parlamentares"
			search={{ uf: estado.sigla }}
			activeOptions={{ exact: true }}
			className="estado-na-lista"
		>
			<span className="sigla">{estado.sigla}</span>{" "}
			<span className="nome">{estado.nome}</span>
			<span className="sr-only">,</span>{" "}
			<span className="numero">
				{deputados}{" "}
				<span className="sr-only">
					{deputados === 1 ? "deputado" : "deputados"}
				</span>
			</span>
		</Link>
	);
}
