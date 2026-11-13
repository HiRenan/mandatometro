// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import { azulejoGrande } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import type { ArtigoNaLista, CaminhoNaInicial } from "@/lib/conteudo";
import { classeDaFita, idDoPasso, semQuebrarCitacao } from "@/lib/formatar";
import { Aviso, useAviso } from "./aviso";
import { AzulejoGrande } from "./azulejo";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "./botao-continuar";
import { ArtigosDoPasso, DesviosDoPasso, FontesDoPasso } from "./infografico";

/**
 * O caminho de um projeto de lei na página inicial, passo a passo: cinco
 * azulejos em fila, um por passo, e o texto do passo da vez ao lado do número
 * gigante. Os azulejos dos passos já andados ficam com a cor, e o fio de tinta
 * avança até o passo da vez. Cada passo tem o texto, os desvios, as fontes e os
 * artigos que o explicam; o passo sem artigo leva ao passo dele na trilha.
 *
 * O HTML do servidor traz os cinco passos, cada um com o título e o texto. Sem
 * JavaScript, eles ficam abertos, um embaixo do outro, e os azulejos e os botões
 * saem; com JavaScript, o CSS mostra um de cada vez desde a primeira pintura, e
 * nada pula quando o código carrega (index.css). O caminho não mostra o
 * progresso da leitura, que fica na abertura da página.
 */
export function InfograficoEmLinha({
	caminho,
	trilha,
}: {
	caminho: CaminhoNaInicial;
	trilha: { slug: string; artigos: Pick<ArtigoNaLista, "slug" | "titulo">[] };
}) {
	const { passos } = caminho;
	const total = passos.length;
	// O passo da vez e o de antes, a partir de 1: o de antes diz o sentido da troca.
	const [passo, setPasso] = useState(1);
	const [antes, setAntes] = useState(1);
	const [vivo, setVivo] = useState(false);
	const { aviso, avisar } = useAviso();

	// Para o navegador que não sabe dizer no CSS se tem JavaScript.
	useEffect(() => setVivo(true), []);

	function ir(para: number) {
		if (para === passo) {
			return;
		}
		setAntes(passo);
		setPasso(para);
		avisar(`Passo ${para} de ${total}: ${passos[para - 1].titulo}`);
	}

	const sentido =
		passo > antes ? "avanca" : passo < antes ? "volta" : undefined;

	return (
		<section aria-labelledby="caminho" className="caminho">
			<div className="caminho-cabeca revelar">
				<h2
					id="caminho"
					className="titulo-condensado letra-com-teto [--palavra:3.62]"
				>
					{caminho.titulo}
				</h2>
				<p>{caminho.resumo}</p>
			</div>
			<div
				className="palco-caminho revelar"
				data-vivo={vivo ? "" : undefined}
				data-sentido={sentido}
				style={{ "--passo": passo } as CSSProperties}
			>
				{/* Os azulejos em fila: cada um leva ao passo dele. */}
				<ol role="list" className="passos-abas">
					{passos.map((doPasso, indice) => {
						const numero = indice + 1;
						return (
							<li key={doPasso.titulo} className={classeDaFita(numero)}>
								<button
									type="button"
									aria-current={numero === passo ? "step" : undefined}
									onClick={() => ir(numero)}
								>
									{/* Os azulejos entre o passo de antes e o da vez viram em
									    fila, um depois do outro. */}
									<AzulejoGrande
										pecas={azulejoGrande(indice, indice % 5)}
										cru={numero > passo}
										atraso={Math.max(0, Math.abs(numero - antes) - 1) * 110}
									/>
									<span aria-hidden="true" className="numeral aba-n">
										{numero}
									</span>
									{/* O espaço fica fora do trecho escondido: dentro dele, o leitor de
									    tela juntava "Passo 2:" com o nome do passo. */}
									<span className="aba-nome">
										<span className="sr-only">Passo {numero}:</span>{" "}
										{doPasso.titulo}
									</span>
								</button>
							</li>
						);
					})}
				</ol>
				<div className="passos">
					<ol role="list" className="passos-lista">
						{passos.map((doPasso, indice) => {
							const numero = indice + 1;
							return (
								<li
									key={doPasso.titulo}
									className={classes("passo", classeDaFita(numero))}
									data-ativo={numero === passo ? "" : undefined}
								>
									<span aria-hidden="true" className="numeral">
										{numero}
									</span>
									<div className="passo-texto">
										<p className="rotulo">
											Passo {numero} de {total}
										</p>
										{/* Com a letra grande, o título cresce até "APRESENTAÇÃO", a
										    palavra mais larga dos títulos dos passos, encostar nas
										    margens (o letra-com-teto do index.css). */}
										<h3 className="titulo-condensado letra-com-teto [--palavra:6.07]">
											{doPasso.titulo}
										</h3>
										<p>{semQuebrarCitacao(doPasso.texto)}</p>
										<DesviosDoPasso desvios={doPasso.desvios} />
										<FontesDoPasso fontes={doPasso.fontes} />
										{doPasso.artigos.length > 0 ? (
											<ArtigosDoPasso slugs={doPasso.artigos} trilha={trilha} />
										) : (
											<p>
												<Link
													to="/trilhas/$trilha"
													params={{ trilha: trilha.slug }}
													hash={idDoPasso(doPasso.titulo)}
													className="link-do-caminho link-do-passo"
												>
													<span>
														Ler este passo na trilha
														<span className="sr-only">: {doPasso.titulo}</span>
													</span>
												</Link>
											</p>
										)}
									</div>
								</li>
							);
						})}
					</ol>
					<div className="passos-controles">
						<p>
							<Link
								to="/trilhas/$trilha"
								params={{ trilha: trilha.slug }}
								hash="caminho"
								className="acao-de-texto"
							>
								<span>Ver o caminho na trilha</span>
							</Link>
						</p>
						<div className="passos-botoes">
							<button
								type="button"
								className={classes(BOTAO_CONTINUAR, "vazado")}
								disabled={passo === 1}
								onClick={() => ir(passo - 1)}
							>
								<ArrowLeft
									aria-hidden="true"
									className={SETA_DO_BOTAO}
									strokeWidth={2.5}
								/>{" "}
								Voltar
							</button>
							<button
								type="button"
								className={BOTAO_CONTINUAR}
								onClick={() => ir(passo === total ? 1 : passo + 1)}
							>
								{passo === total ? "Ver do começo" : "Próximo passo"}{" "}
								{passo === total ? (
									<RotateCcw
										aria-hidden="true"
										className={SETA_DO_BOTAO}
										strokeWidth={2.5}
									/>
								) : (
									<ArrowRight
										aria-hidden="true"
										className={SETA_DO_BOTAO}
										strokeWidth={2.5}
									/>
								)}
							</button>
						</div>
					</div>
				</div>
				{/* O leitor de tela ouve o passo que entrou na tela. */}
				<Aviso texto={aviso} />
			</div>
		</section>
	);
}
