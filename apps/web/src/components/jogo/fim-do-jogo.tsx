// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.

import { Link } from "@tanstack/react-router";
import { BOTAO_CONTINUAR } from "@/components/botao-continuar";
import { ListaDeFontes } from "@/components/fontes";
import { classes } from "@/lib/classes";
import { semCliqueDuplo } from "@/lib/clique";
import { formatarData } from "@/lib/formatar";
import type { JogoNaPagina } from "@/lib/jogo";
import { caminho, type Partida, regrasDoCaminho } from "@/lib/jogo/partida";
import { CaminhoDoProjeto } from "./caminho-do-projeto";

/**
 * O fim do jogo: o caminho que o projeto fez e cada decisão de regra em
 * palavras, com o artigo e o que a pessoa escolheu. **Sem total e sem nota**: a
 * tela não mostra placar de acertos, e as decisões de opinião não contam
 * (DESIGN.md e docs/jogo-das-comissoes.md).
 */
export function FimDoJogo({
	jogo,
	partida,
	comApi,
	aoJogarDeNovo,
}: {
	jogo: JogoNaPagina;
	partida: Partida;
	/** Se o site tem o endereço da API (o API_URL do build). */
	comApi: boolean;
	aoJogarDeNovo: () => void;
}) {
	const regras = regrasDoCaminho(jogo, partida);

	return (
		<div className="jogo-fim">
			<h2 className="subtitulo-condensado" tabIndex={-1} data-foco="true">
				O caminho que você fez
			</h2>
			<CaminhoDoProjeto casas={caminho(jogo, partida)} />
			<section aria-labelledby="as-regras" className="jogo-regras">
				<h3 id="as-regras" className="rotulo">
					As decisões de regra
				</h3>
				<ol role="list">
					{regras.map((regra) => (
						<li
							key={regra.id}
							data-como-no-regimento={regra.comoNoRegimento ? "true" : "false"}
						>
							<p className="jogo-regra-nome">
								{regra.resumo}
								<span className="jogo-fundamento">{regra.fundamento}</span>
							</p>
							<p className="jogo-regra-escolha">
								{regra.escolhida === undefined
									? "Você não passou por esta decisão."
									: regra.comoNoRegimento
										? `Você escolheu “${regra.escolhida}”, o instrumento do regimento.`
										: `Você escolheu “${regra.escolhida}”. O do regimento era “${regra.doRegimento}”.`}
							</p>
						</li>
					))}
				</ol>
			</section>
			<section aria-labelledby="o-que-mudou" className="jogo-epilogo">
				<h3 id="o-que-mudou" className="subtitulo-condensado">
					{jogo.epilogo.titulo}
				</h3>
				<ul role="list" className="jogo-epilogo-itens">
					{jogo.epilogo.itens.map((item) => (
						<li key={item.dispositivo}>
							<p>
								{item.texto}
								<span className="jogo-dispositivo">{item.dispositivo}</span>
							</p>
						</li>
					))}
				</ul>
				{jogo.epilogo.situacao === undefined ? null : (
					<div className="jogo-situacao">
						<h4 className="rotulo">
							Situação em {formatarData(jogo.epilogo.situacao.data)}
						</h4>
						{jogo.epilogo.situacao.paragrafos.map((paragrafo) => (
							<p key={paragrafo}>{paragrafo}</p>
						))}
					</div>
				)}
				<ListaDeFontes fontes={jogo.epilogo.fontes} />
			</section>
			<div className="jogo-acoes jogo-acoes-do-fim">
				{/*
				 * Só o jogo que declara as lições oferece rever a trilha: mandar
				 * para uma trilha que não ensina o que o jogo mostrou seria mandar
				 * para o assunto errado.
				 */}
				{jogo.trilha === undefined ? null : (
					<Link
						to="/trilhas/$trilha"
						params={{ trilha: jogo.trilha.slug }}
						className={BOTAO_CONTINUAR}
					>
						Rever as lições da trilha
					</Link>
				)}
				{comApi ? (
					<Link to="/" hash="newsletter" className={BOTAO_CONTINUAR}>
						Receber o jornal legislativo todo domingo
					</Link>
				) : null}
				<button
					type="button"
					className={classes(BOTAO_CONTINUAR, "vazado")}
					onClick={semCliqueDuplo(aoJogarDeNovo)}
				>
					Jogar de novo
				</button>
			</div>
		</div>
	);
}
