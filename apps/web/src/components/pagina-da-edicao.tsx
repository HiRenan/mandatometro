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
	diaEMes,
	formatarData,
	formatarPeriodo,
	plural,
	posicaoDaSemana,
} from "@/lib/formatar";
import { AzulejoGrande } from "./azulejo";
import { BOTAO_CONTINUAR } from "./botao-continuar";
import { ItemDaEdicao } from "./item-da-edicao";
import { EdicoesIndisponiveis } from "./pagina-das-edicoes";

/**
 * A página de uma edição publicada, em /edicoes/7: a folha de leitura da página
 * do artigo, com a cor da semana (a mesma da lista), o título que a API manda, o
 * índice "Nesta edição" e os itens na ordem. Sem a API, o cartaz diz que as
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
	const itens = edicao.itens.toSorted((um, outro) => um.ordem - outro.ordem);
	return (
		<div className="pagina-da-edicao">
			<div className="parede">
				{/* Abaixo de 1200 px, uma coluna da largura da tela, com o índice dentro
				    da folha; a partir daí, o índice fica na coluna ao lado. */}
				<div className="artigo-grade">
					<article
						className={classes("folha artigo-folha", classeDaFita(semana))}
					>
						{/* O azulejo da semana, o mesmo da folha da edição na lista. */}
						<AzulejoGrande
							pecas={azulejoDaPosicao(semana)}
							className="do-artigo"
						/>
						<nav aria-label="Caminho" className="migalhas rotulo">
							<ol>
								<li>
									<Link to="/edicoes" activeOptions={{ exact: true }}>
										Edições
									</Link>
								</li>
								<li aria-hidden="true">/</li>
								<li>
									<span aria-current="page">
										{formatarPeriodo(edicao.inicio, edicao.fim, { ano: false })}
									</span>
								</li>
							</ol>
						</nav>
						<p className="sobretitulo">
							<span aria-hidden="true" className="numeral">
								{diaEMes(edicao.fim).dia}
							</span>
							<span className="rotulo">
								Semana de {formatarPeriodo(edicao.inicio, edicao.fim)}
							</span>
						</p>
						{/* O título vem da API: o teto da letra grande sai da régua, com a
						    palavra mais larga dele (lib/conteudo/regua.ts). */}
						<h1
							className="titulo-condensado letra-com-teto"
							style={estiloDoTeto(edicao.titulo, "titulo-condensado")}
						>
							{edicao.titulo}
						</h1>
						<p className="faixa rotulo">
							<span>
								Publicada em {formatarData(dataEmBrasilia(edicao.publicada_em))}
							</span>
							<span>{plural(itens.length, "item", "itens")}</span>
							<span>Fonte oficial em cada item</span>
						</p>
						<p className="lide">
							O que o Congresso votou na semana, em linguagem simples. Cada item
							traz a fonte oficial e a data em que ela foi coletada.
						</p>
						<NestaEdicao itens={itens} onde="na-folha" />
						{itens.map((item) => (
							<ItemDaEdicao key={item.ordem} item={item} />
						))}
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
	itens: ItemPublico[];
	onde: "na-folha" | "ao-lado";
}) {
	const id = `nesta-edicao-${onde}`;
	return (
		<nav aria-labelledby={id} className={classes("nesta nesta-edicao", id)}>
			<h2 id={id} className="rotulo">
				Nesta edição
			</h2>
			<ol role="list" className="folhas-da-trilha">
				{itens.map((item) => (
					<li key={item.ordem} className={classeDaFita(item.ordem)}>
						<a href={`#item-${item.ordem}`}>
							<span aria-hidden="true" className="numeral letra-grande:mb-4">
								{item.ordem}
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
