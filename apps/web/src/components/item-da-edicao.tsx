// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import type { FontePublica, ItemPublico, VotacaoPublica } from "@/client";
import { classes } from "@/lib/classes";
import { estiloDoTeto } from "@/lib/conteudo/regua";
import {
	caminhoDaTrilha,
	enderecoSeguro,
	fontesPorEndereco,
	paragrafos,
} from "@/lib/edicoes/conteudo-da-edicao";
import { classeDaFita, dataEmBrasilia, formatarData } from "@/lib/formatar";
import { SiteDaFonte } from "./fontes";

/** O resultado de cada votação, em palavras: o `outro` não vira aprovação. */
const RESULTADOS: Record<VotacaoPublica["resultado"], string> = {
	aprovada: "Aprovada",
	rejeitada: "Rejeitada",
	outro: "Não classificado nos dados usados",
};

/**
 * Um item da edição, na ordem dela: o número na fita da posição, o título, o
 * texto, o quadro de cada votação, as fontes e, quando há, o artigo da trilha que
 * explica o assunto. O número segue a posição na página, e o `id` usa a ordem
 * gravada para os links do índice e da busca. O texto vem da API e vai sempre
 * como texto.
 *
 * O item não sobe com a rolagem (o revelar), como o texto do artigo: o índice
 * leva até ele, e o navegador calcularia o lugar com o item ainda deslocado.
 */
export function ItemDaEdicao({
	item,
	posicao,
	comSecao = false,
}: {
	item: ItemPublico;
	posicao: number;
	comSecao?: boolean;
}) {
	const id = `item-${item.ordem}`;
	const artigo = caminhoDaTrilha(item.artigo);
	const Titulo = comSecao ? "h3" : "h2";
	const Subtitulo = comSecao ? "h4" : "h3";
	return (
		<section
			id={id}
			aria-labelledby={`${id}-titulo`}
			className={classes("item-da-edicao", classeDaFita(posicao))}
		>
			<span aria-hidden="true" className="numeral">
				{posicao}
			</span>
			<Titulo
				id={`${id}-titulo`}
				className="subtitulo-condensado letra-com-teto teto-pela-caixa"
				style={estiloDoTeto(item.titulo, "subtitulo-condensado")}
			>
				{item.titulo}
			</Titulo>
			<div className="texto">
				{paragrafos(item.texto).map((paragrafo, posicao) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: os parágrafos ficam fixos, na ordem do texto da edição publicada.
					<p key={posicao}>{paragrafo}</p>
				))}
			</div>
			{item.fatos?.votacoes.map((votacao, posicao) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: as votações ficam fixas, na ordem da edição publicada.
				<QuadroDaVotacao key={posicao} votacao={votacao} Titulo={Subtitulo} />
			))}
			<FontesDoItem posicao={posicao} fontes={item.fontes} Titulo={Subtitulo} />
			{artigo && item.artigo && (
				<p className="na-trilha">
					<Link
						to="/trilhas/$trilha/$artigo"
						params={artigo}
						className="acao-de-texto"
					>
						<span>Entenda na trilha: {item.artigo.titulo}</span>
					</Link>
				</p>
			)}
		</section>
	);
}

/**
 * Uma votação do item: a data, o resultado registrado e o placar, contado por
 * votação, todo em tinta (o Sim não é verde, e o Não não é vermelho). A
 * Presidência fica à parte e não entra no placar. Sem placar, como nas votações
 * secretas do Senado, o quadro diz que ele não está disponível, sem zero. É uma
 * lista de termos só: o leitor de tela lê "Sim, 312", e a tela põe o número em
 * cima do nome. O painel de revisão (components/painel/) põe embaixo da data a
 * casa e a descrição oficial da votação, que a edição publicada não mostra.
 */
export function QuadroDaVotacao({
	votacao,
	Titulo,
	descricao,
}: {
	votacao: Pick<VotacaoPublica, "data" | "resultado" | "placar">;
	Titulo: "h3" | "h4";
	descricao?: string;
}) {
	const { placar } = votacao;
	return (
		<div className="votacao">
			<Titulo className="rotulo">
				Votação de {formatarData(votacao.data.slice(0, 10))}
			</Titulo>
			{descricao && <p className="descricao-da-votacao">{descricao}</p>}
			<dl>
				<div className="resultado">
					<dt>Resultado registrado</dt>
					<dd>{RESULTADOS[votacao.resultado]}</dd>
				</div>
				{placar && (
					<>
						<div className="contagem">
							<dt>Sim</dt>
							<dd>{placar.sim}</dd>
						</div>
						<div className="contagem">
							<dt>Não</dt>
							<dd>{placar.nao}</dd>
						</div>
						<div className="contagem">
							<dt>Abstenções</dt>
							<dd>{placar.abstencao}</dd>
						</div>
						<div className="contagem">
							<dt>Obstruções</dt>
							<dd>{placar.obstrucao}</dd>
						</div>
						<div className="presidencia">
							<dt>Presidência</dt>
							<dd>{placar.presidente}, contada à parte</dd>
						</div>
					</>
				)}
			</dl>
			{!placar && (
				<p className="sem-placar">
					O placar não está disponível nos dados usados.
				</p>
			)}
		</div>
	);
}

/**
 * As fontes do item, agrupadas pelo endereço, como no e-mail: o primeiro é a
 * fonte oficial, os outros são outras referências, e cada um traz o site e o dia
 * da coleta, em Brasília. A mesma página coletada de novo aparece embaixo da
 * primeira coleta, e o trecho de cada coleta vem entre aspas, como texto.
 *
 * Cada link tem um nome só dele, para o leitor de tela: o nome diz o item, para
 * a lista de links não ter oito "Fonte oficial" iguais, e, nas outras
 * referências, o número na lista, o mesmo que a tela mostra ao lado ("Outra
 * referência oficial 3 do item 1"). Sem o número, um item com três endereços
 * teria duas "Outra referência oficial" para lugares diferentes. O espaço antes
 * do trecho escondido fica fora dele: dentro, o nome do link perderia o espaço
 * em parte dos leitores.
 */
export function FontesDoItem({
	posicao,
	fontes,
	Titulo,
}: {
	posicao: number;
	fontes: FontePublica[];
	Titulo: "h3" | "h4";
}) {
	return (
		<div className="fontes-do-item">
			<Titulo className="rotulo">
				Fontes <span className="sr-only">do item {posicao}</span>
			</Titulo>
			<ol role="list" className="lista-de-fontes">
				{fontesPorEndereco(fontes).map(({ url, coletas }, indice) => {
					const nome =
						indice === 0 ? "Fonte oficial" : "Outra referência oficial";
					const soParaOLeitor =
						indice === 0
							? `do item ${posicao}`
							: `${indice + 1} do item ${posicao}`;
					const endereco = enderecoSeguro(url);
					const [primeira, ...outras] = coletas;
					return (
						<li key={url}>
							<span aria-hidden="true" className="numero">
								{indice + 1}
							</span>
							<div>
								<p>
									{endereco ? (
										<a href={endereco}>
											{nome} <span className="sr-only">{soParaOLeitor}</span>
										</a>
									) : (
										<strong>{nome}</strong>
									)}
									<span className="endereco">
										{endereco ? (
											<>
												<SiteDaFonte url={endereco} />, coletada em{" "}
											</>
										) : (
											"Coletada em "
										)}
										{formatarData(dataEmBrasilia(primeira.coletado_em))}
									</span>
								</p>
								<Trecho fonte={primeira} cite={endereco} />
								{outras.map((coleta) => (
									<div key={coleta.coletado_em} className="outra-coleta">
										<p>
											Outra coleta da mesma referência, em{" "}
											{formatarData(dataEmBrasilia(coleta.coletado_em))}.
										</p>
										<Trecho fonte={coleta} cite={endereco} />
									</div>
								))}
							</div>
						</li>
					);
				})}
			</ol>
		</div>
	);
}

/** O trecho literal de uma coleta, entre aspas, como texto. */
function Trecho({ fonte, cite }: { fonte: FontePublica; cite: string | null }) {
	if (!fonte.trecho) {
		return null;
	}
	return (
		<blockquote cite={cite ?? undefined} className="trecho-da-fonte">
			<p>
				<span className="sr-only">Trecho da fonte: </span>“{fonte.trecho}”
			</p>
		</blockquote>
	);
}
