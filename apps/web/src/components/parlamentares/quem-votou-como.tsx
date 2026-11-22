// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link, useNavigate } from "@tanstack/react-router";
import { type RefObject, useId, useRef } from "react";
import type { DetalheVotacao } from "@/client";
import { estadoDaSigla } from "@/lib/parlamentares";
import { enderecoDoParlamentar } from "@/lib/parlamentares/endereco";
import {
	agruparPorVoto,
	type Filtro,
	filtrarVotos,
	gruposAbertos,
	NOME_DO_VOTO,
	opcoesDoFiltro,
	SEM_PARTIDO,
} from "@/lib/parlamentares/votos";
import { BOTAO_CONTINUAR } from "../botao-continuar";
import { Partido } from "./partido";

/** O artigo da trilha que explica a votação nominal e a simbólica. */
export const ARTIGO_DA_VOTACAO = {
	trilha: "processo-legislativo",
	artigo: "o-plenario-vota-o-projeto",
} as const;

const NENHUM_NOME = "Nenhum nome com esses filtros.";

/**
 * Quem votou como (o Renan, em 21/11/2026: agrupar pelo voto, com filtros que
 * funcionam sem o JavaScript): um grupo por voto, na ordem do placar, com os
 * nomes em ordem alfabética, o partido e o estado do dia do voto. Os grupos vêm
 * abertos com até 100 nomes (um estado, um partido ou o Senado) e fechados na
 * Câmara inteira.
 *
 * O filtro é um formulário GET com o estado e o partido, só com o que aparece na
 * votação. A página filtra a lista que já tem, sem pedir a votação de novo: o
 * loader da rota não depende do ?uf nem do ?partido.
 */
export function QuemVotouComo({
	votacao,
	filtro,
}: {
	votacao: DetalheVotacao;
	filtro: Filtro;
}) {
	const { votos } = votacao;
	return (
		<section aria-labelledby="quem-votou-como" className="quem-votou-como">
			<h2
				id="quem-votou-como"
				className="subtitulo-condensado letra-com-teto [--palavra:2.82]"
			>
				Quem votou como
			</h2>
			{votos.length === 0 ? (
				<>
					<p className="texto-sem-votos">
						Esta votação não tem o voto de cada parlamentar nos dados usados.
						Isso acontece quando o voto de cada um não é registrado, como na
						votação simbólica.
					</p>
					<p className="na-trilha">
						<Link
							to="/trilhas/$trilha/$artigo"
							params={ARTIGO_DA_VOTACAO}
							className="acao-de-texto"
						>
							<span>Entenda na trilha: O Plenário vota o projeto</span>
						</Link>
					</p>
				</>
			) : (
				<NomesPorVoto votacao={votacao} filtro={filtro} />
			)}
		</section>
	);
}

function NomesPorVoto({
	votacao,
	filtro,
}: {
	votacao: DetalheVotacao;
	filtro: Filtro;
}) {
	const opcoes = opcoesDoFiltro(votacao.votos);
	// Um estado que não aparece fica de fora. Um partido ausente deixa a lista vazia.
	const aplicado: Filtro = {
		...filtro,
		uf: filtro.uf && opcoes.ufs.includes(filtro.uf) ? filtro.uf : undefined,
	};
	const filtrados = filtrarVotos(votacao.votos, aplicado);
	const grupos = agruparPorVoto(filtrados);
	const abertos = gruposAbertos(filtrados.length);
	const comFiltro = Boolean(aplicado.uf || aplicado.partido);
	const vazio = filtrados.length === 0;
	const id = String(votacao.id);
	const filtrar = useRef<HTMLButtonElement>(null);
	return (
		<>
			<FiltroDosVotos
				id={id}
				filtro={aplicado}
				opcoes={opcoes}
				filtrar={filtrar}
			/>
			<div className="resumo-do-filtro">
				<p aria-live="polite" aria-atomic="true" className="rotulo mostrando">
					Mostrando {filtrados.length} de {votacao.votos.length}{" "}
					{votacao.votos.length === 1 ? "nome" : "nomes"}
					{vazio && <span className="sr-only">. {NENHUM_NOME}</span>}
				</p>
				{comFiltro && (
					// O link sai da tela com o filtro: o foco vai para o Filtrar, logo
					// acima, e a página fica onde está.
					<Link
						to="/votacoes/$id"
						params={{ id }}
						search={{}}
						resetScroll={false}
						onClick={() => filtrar.current?.focus()}
						className="acao-de-texto"
					>
						<span>Limpar os filtros</span>
					</Link>
				)}
			</div>
			{vazio ? (
				// O leitor recebe a frase na região acima, junto com a contagem.
				<p className="texto-sem-votos" aria-hidden="true">
					{NENHUM_NOME}
				</p>
			) : (
				// Outro filtro é outra lista: os grupos voltam a abrir ou fechar pela
				// regra dos 100 nomes.
				<div key={JSON.stringify(aplicado)} className="grupos-de-voto">
					{grupos.map((grupo) => (
						<details key={grupo.valor} open={abertos} className="grupo-de-voto">
							<summary>
								<span className="nome-do-grupo">
									{NOME_DO_VOTO[grupo.valor]}
								</span>{" "}
								<span className="numero-do-grupo">{grupo.votos.length}</span>
							</summary>
							<ul role="list" className="nomes-do-grupo">
								{grupo.votos.map((voto) => (
									<li key={voto.parlamentar_id}>
										<Link
											to="/parlamentares/$id"
											params={{
												id: enderecoDoParlamentar({
													id: voto.parlamentar_id,
													nome: voto.nome,
												}),
											}}
										>
											{voto.nome}
										</Link>{" "}
										<span className="partido-e-uf">
											<Partido sigla={voto.partido} />
											{voto.uf && <span className="uf"> · {voto.uf}</span>}
										</span>
									</li>
								))}
							</ul>
						</details>
					))}
				</div>
			)}
		</>
	);
}

/**
 * O formulário do filtro. Sem o JavaScript, o navegador manda o ?uf e o ?partido
 * para o mesmo endereço, e o servidor devolve a lista filtrada; com ele, a troca
 * é a do site, e a página fica onde está, com a lista logo abaixo. Os campos
 * voltam ao filtro do endereço quando ele muda; o botão fica, com o foco.
 */
function FiltroDosVotos({
	id,
	filtro,
	opcoes,
	filtrar,
}: {
	id: string;
	filtro: Filtro;
	opcoes: ReturnType<typeof opcoesDoFiltro>;
	filtrar: RefObject<HTMLButtonElement | null>;
}) {
	const navigate = useNavigate();
	const campo = useId();
	const doEndereco = JSON.stringify(filtro);
	return (
		<form
			method="get"
			className="filtro-dos-votos"
			onSubmit={(evento) => {
				evento.preventDefault();
				const dados = new FormData(evento.currentTarget);
				const uf = dados.get("uf");
				const partido = dados.get("partido");
				navigate({
					to: "/votacoes/$id",
					params: { id },
					resetScroll: false,
					search: {
						uf: typeof uf === "string" && uf ? uf : undefined,
						partido:
							typeof partido === "string" && partido ? partido : undefined,
					},
				});
			}}
		>
			<div className="campo-do-filtro">
				<label htmlFor={`${campo}-uf`} className="rotulo">
					Estado
				</label>
				<select
					key={doEndereco}
					id={`${campo}-uf`}
					name="uf"
					defaultValue={filtro.uf ?? ""}
					className="campo"
				>
					<option value="">Todos os estados</option>
					{opcoes.ufs.map((uf) => (
						<option key={uf} value={uf}>
							{estadoDaSigla(uf)?.nome ?? uf}
						</option>
					))}
				</select>
			</div>
			<div className="campo-do-filtro">
				<label htmlFor={`${campo}-partido`} className="rotulo">
					Partido
				</label>
				<select
					key={doEndereco}
					id={`${campo}-partido`}
					name="partido"
					defaultValue={filtro.partido ?? ""}
					className="campo"
				>
					<option value="">Todos os partidos</option>
					{opcoes.partidos.map((partido) => (
						<option key={partido} value={partido}>
							{partido}
						</option>
					))}
					{opcoes.semPartido && (
						<option value={SEM_PARTIDO}>Sem partido registrado</option>
					)}
				</select>
			</div>
			<button ref={filtrar} type="submit" className={BOTAO_CONTINUAR}>
				Filtrar
			</button>
		</form>
	);
}
