// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import type { EdicaoPublica, ItemPublico } from "@/client";
import { azulejoDaPosicao } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { estiloDoTeto } from "@/lib/conteudo/regua";
import type { EdicaoDaPagina } from "@/lib/edicoes";
import {
	classeDaFita,
	dataEmBrasilia,
	formatarData,
	formatarDia,
	formatarPeriodo,
	plural,
	posicaoDaSemana,
} from "@/lib/formatar";
import { AzulejoGrande } from "./azulejo";
import { BOTAO_CONTINUAR } from "./botao-continuar";
import { FaixaDeInformacoes } from "./faixa-de-informacoes";
import { ItemDaEdicao } from "./item-da-edicao";
import { EdicoesIndisponiveis } from "./pagina-das-edicoes";

type ItemNaPagina = { item: ItemPublico; posicao: number };

/**
 * A página de uma edição publicada, em /edicoes/7: a folha de leitura da página
 * do artigo, com a cor da semana (a mesma da lista), o título que a API manda, o
 * índice "Nesta edição" e os itens na ordem. Nada fica acima do título além do
 * caminho: a semana, com o ano, vai na faixa embaixo dele, porque o revisor pode
 * trocar o título padrão, que já traz o período. Sem a API, o cartaz diz que as
 * edições não aparecem neste endereço.
 */
export function PaginaDaEdicao({ pagina }: { pagina: EdicaoDaPagina }) {
	if (pagina.tipo === "sem-api") {
		return <EdicoesIndisponiveis />;
	}
	return <FolhaDaEdicao edicao={pagina.edicao} />;
}

function FolhaDaEdicao({ edicao }: { edicao: EdicaoPublica }) {
	const semana = posicaoDaSemana(edicao.fim);
	const emOrdem = [...edicao.itens].sort((um, outro) => um.ordem - outro.ordem);
	const votacoes = emOrdem
		.filter((item) => item.tipo === "votacao")
		.map((item, indice) => ({ item, posicao: indice + 1 }));
	const atos = emOrdem
		.filter((item) => item.tipo === "ato")
		.map((item, indice) => ({ item, posicao: votacoes.length + indice + 1 }));
	const itens = [...votacoes, ...atos];
	const assunto =
		atos.length > 0
			? "Os destaques da semana"
			: "O que o Congresso votou na semana";
	// O período, na faixa, já diz o ano: a publicação só leva o dela quando é outro.
	const publicada = dataEmBrasilia(edicao.publicada_em);
	const publicacao =
		publicada.slice(0, 4) === edicao.fim.slice(0, 4)
			? formatarDia(publicada)
			: formatarData(publicada);
	return (
		<div className="pagina-da-edicao">
			<div className="parede">
				{/* Abaixo de 1200 px, uma coluna da largura da tela, com o índice dentro
				    da folha; a partir daí, o índice fica na coluna ao lado. */}
				<div className="artigo-grade">
					{/* A folha é a caixa do teto dos títulos da API: o do alto e o de
					    cada item medem a letra pela largura dela (o teto-pela-caixa). */}
					<article
						className={classes(
							"folha artigo-folha caixa-do-teto",
							classeDaFita(semana),
						)}
					>
						{/* O azulejo da semana, o mesmo da folha da edição na lista. */}
						<AzulejoGrande
							pecas={azulejoDaPosicao(semana)}
							className="do-artigo"
						/>
						{/* Como na página do artigo, o caminho leva às páginas de cima, e o
						    lugar dele vai até o fim do azulejo do canto: o título começa
						    embaixo do azulejo (estilos/edicoes.css). */}
						<nav aria-label="Caminho" className="migalhas rotulo">
							<ol>
								<li>
									<Link to="/edicoes" activeOptions={{ exact: true }}>
										Edições
									</Link>
								</li>
							</ol>
						</nav>
						{/* O título vem da API: o teto da letra grande sai da régua, com a
						    palavra mais larga dele (lib/conteudo/regua.ts). */}
						<h1
							className="titulo-condensado letra-com-teto teto-pela-caixa"
							style={estiloDoTeto(edicao.titulo, "titulo-condensado")}
						>
							{edicao.titulo}
						</h1>
						{/* A fonte oficial de cada item fica no lide, logo abaixo. */}
						<FaixaDeInformacoes>
							<span>{formatarPeriodo(edicao.inicio, edicao.fim)}</span>
							<span>Publicada em {publicacao}</span>
							<span>{plural(itens.length, "item", "itens")}</span>
						</FaixaDeInformacoes>
						<p className="lide">
							{`${assunto}, em linguagem simples. Cada item traz a fonte oficial e a data em que ela foi coletada.`}
						</p>
						<NestaEdicao itens={itens} onde="na-folha" />
						{atos.length > 0 ? (
							<>
								<SecaoDaEdicao
									id="congresso"
									titulo="O que o Congresso votou"
									itens={votacoes}
								/>
								<SecaoDaEdicao
									id="diario-oficial"
									titulo="O que saiu no Diário Oficial"
									itens={atos}
								/>
							</>
						) : (
							votacoes.map(({ item, posicao }) => (
								<ItemDaEdicao key={item.ordem} item={item} posicao={posicao} />
							))
						)}
						<nav aria-label="Mais edições" className="fim-da-edicao">
							<ul className="acoes-da-pagina">
								<li>
									<Link to="/edicoes" className={BOTAO_CONTINUAR}>
										Ver todas as edições
									</Link>
								</li>
								<li>
									<Link to="/" hash="newsletter" className="acao-de-texto">
										<span>Receber as próximas por e-mail</span>
									</Link>
								</li>
							</ul>
						</nav>
					</article>

					<div className="ao-lado-do-artigo">
						<NestaEdicao itens={itens} onde="ao-lado" />
					</div>
				</div>
			</div>
		</div>
	);
}

function SecaoDaEdicao({
	id,
	titulo,
	itens,
}: {
	id: string;
	titulo: string;
	itens: ItemNaPagina[];
}) {
	if (itens.length === 0) {
		return null;
	}
	return (
		<section aria-labelledby={id} className="secao-da-edicao">
			<h2 id={id} className="rotulo text-tinta-suave">
				{titulo}
			</h2>
			{itens.map(({ item, posicao }) => (
				<ItemDaEdicao key={item.ordem} item={item} posicao={posicao} comSecao />
			))}
		</section>
	);
}

/**
 * O índice "Nesta edição", com o número na fita da posição e o título de cada
 * item, como o "Nesta trilha". Ele aparece em dois lugares, e o CSS mostra um
 * de cada vez: dentro da folha, depois do lide, abaixo de 1200 px; na coluna ao
 * lado, que para na tela durante a rolagem, daí para cima. Cada cópia tem o id
 * dela, e o leitor de tela só encontra a que está na tela.
 */
function NestaEdicao({
	itens,
	onde,
}: {
	itens: ItemNaPagina[];
	onde: "na-folha" | "ao-lado";
}) {
	const id = `nesta-edicao-${onde}`;
	return (
		<nav aria-labelledby={id} className={classes("nesta nesta-edicao", id)}>
			<h2 id={id} className="rotulo">
				Nesta edição
			</h2>
			<ol role="list" className="folhas-da-trilha">
				{itens.map(({ item, posicao }) => (
					<li key={item.ordem} className={classeDaFita(posicao)}>
						<a href={`#item-${item.ordem}`}>
							<span aria-hidden="true" className="numeral letra-grande:mb-4">
								{posicao}
							</span>
							<span className="letra-grande:col-span-full">
								<span className="titulo">{item.titulo}</span>
							</span>
						</a>
					</li>
				))}
			</ol>
		</nav>
	);
}
