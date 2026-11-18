// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { ResumoEdicao } from "@/client";
import { azulejoDaPosicao, sementeDe } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { estiloDoTeto } from "@/lib/conteudo/regua";
import type { PaginaDaLista } from "@/lib/edicoes";
import {
	classeDaFita,
	dataEmBrasilia,
	diaEMes,
	formatarData,
	formatarPeriodo,
	plural,
	posicaoDaSemana,
} from "@/lib/formatar";
import { AzulejoGrande, Painel } from "./azulejo";
import { BOTAO_CONTINUAR } from "./botao-continuar";
import { FaixaDeInformacoes } from "./faixa-de-informacoes";
import { Palavras } from "./palavras";

/**
 * A lista das edições publicadas, em /edicoes: o cartaz das páginas de dentro,
 * como o de /trilhas, e uma folha por edição, como as da página da trilha, da
 * mais nova para a mais antiga, 20 por página. Sem edição, uma folha diz que a
 * primeira ainda não saiu; sem a API, o cartaz diz que as edições não aparecem
 * neste endereço (o EdicoesIndisponiveis).
 */
export function PaginaDasEdicoes({ lista }: { lista: PaginaDaLista }) {
	if (lista.tipo === "sem-api") {
		return <EdicoesIndisponiveis />;
	}
	const { edicoes, total, pagina, paginas } = lista;
	return (
		<>
			<CartazDasEdicoes
				faixa={
					<FaixaDeInformacoes>
						{total > 0 && <span>{plural(total, "edição", "edições")}</span>}
						<span>Todo domingo</span>
						<span>Fonte oficial em cada item</span>
					</FaixaDeInformacoes>
				}
			>
				<p className="abertura">
					O que o Congresso votou em cada semana, explicado em linguagem
					simples. Cada item traz a fonte oficial.
				</p>
				<p className="para-quem">
					A edição nova sai todo domingo e também chega por e-mail.
				</p>
				{/* Sem edição, a inscrição é a ação da folha de baixo, e não se repete
				    aqui. */}
				{total > 0 && (
					<div className="cartaz-acao">
						<Link to="/" hash="newsletter" className="acao-de-texto">
							<span>Receber por e-mail</span>
						</Link>
					</div>
				)}
			</CartazDasEdicoes>
			<div className="artigos">
				{total === 0 ? (
					<SemEdicoes />
				) : (
					<>
						<section aria-label="Edições publicadas">
							<ol role="list" className="linhas">
								{edicoes.map((edicao) => (
									<EdicaoNaLista key={edicao.id} edicao={edicao} />
								))}
							</ol>
						</section>
						{paginas > 1 && (
							<PaginasDasEdicoes pagina={pagina} paginas={paginas} />
						)}
					</>
				)}
			</div>
		</>
	);
}

/**
 * As páginas das edições sem a API, como na Vercel até ela ter casa: o cartaz
 * diz que as edições não aparecem neste endereço e leva às trilhas. A lista e a
 * página de cada edição mostram o mesmo cartaz.
 */
export function EdicoesIndisponiveis() {
	return (
		<CartazDasEdicoes>
			<p className="abertura">
				As edições ainda não aparecem neste endereço do site.
			</p>
			<p className="para-quem">
				Enquanto isso, as trilhas explicam passo a passo como o Congresso
				funciona.
			</p>
			<div className="cartaz-acao">
				<ul className="acoes-da-pagina">
					<li>
						<Link to="/trilhas" className={BOTAO_CONTINUAR}>
							Ver as trilhas
						</Link>
					</li>
					<li>
						<Link to="/" className="acao-de-texto">
							<span>Ir para o início</span>
						</Link>
					</li>
				</ul>
			</div>
		</CartazDasEdicoes>
	);
}

/** O cartaz das páginas das edições: o painel, o título e o pé de cada estado. */
function CartazDasEdicoes({
	children,
	faixa,
}: {
	/** O que vai no pé do cartaz, embaixo do fio. */
	children: ReactNode;
	faixa?: ReactNode;
}) {
	return (
		<section className="cartaz cartaz-medio">
			<Painel
				semente={sementeDe("edicoes")}
				colunas={4}
				quantas={64}
				className="mural"
				sozinho
			/>
			{/* A palavra tomba no lugar: o leitor de tela lê o título pelo aria-label.
			    Com a letra grande, ela cresce até encostar nas margens (o
			    letra-com-teto do index.css). */}
			<h1
				aria-label="Edições"
				className="titulo-condensado letra-com-teto [--palavra:3.25]"
			>
				<span aria-hidden="true" className="caixa">
					<Palavras texto="Edições" />
				</span>
			</h1>
			<div className="cartaz-pe">{children}</div>
			{faixa}
		</section>
	);
}

/**
 * Uma edição na lista: a folha da página da trilha, com o último dia da semana no
 * lugar do número, como na folhinha, e o mês embaixo. A cor é a da semana no
 * calendário (o posicaoDaSemana), igual na página da edição: muda de uma semana
 * para a outra, e ninguém escolhe. O título vem da API e leva o teto calculado.
 *
 * O período não se repete na folha: o título padrão já traz ele, e o dia grande
 * mostra o fim da semana. Para o leitor de tela, o dia grande diz a semana inteira,
 * com o ano, antes do título, mesmo quando o revisor troca o título.
 */
function EdicaoNaLista({ edicao }: { edicao: ResumoEdicao }) {
	const semana = posicaoDaSemana(edicao.fim);
	const { dia, mes } = diaEMes(edicao.fim);
	return (
		<li className={classes("linha revelar", classeDaFita(semana))}>
			<p className="numeral dia-da-edicao">
				<span aria-hidden="true">
					{dia}
					<span className="mes-da-edicao rotulo">{mes}</span>
				</span>
				<span className="sr-only">
					Semana de {formatarPeriodo(edicao.inicio, edicao.fim)}
				</span>
			</p>
			{/* O texto da folha é a caixa do teto do título, que vem da API: a letra
			    se mede pela largura dele (o teto-pela-caixa). */}
			<div className="linha-texto caixa-do-teto">
				{/* A folha inteira leva à edição: a área do link cobre a folha. */}
				<h2
					className="titulo-de-folha letra-com-teto teto-pela-caixa"
					style={estiloDoTeto(edicao.titulo, "titulo-condensado")}
				>
					<Link to="/edicoes/$id" params={{ id: String(edicao.id) }}>
						{edicao.titulo}
					</Link>
				</h2>
				<p className="rotulo">
					Publicada em {formatarData(dataEmBrasilia(edicao.publicada_em))}
				</p>
			</div>
			<AzulejoGrande pecas={azulejoDaPosicao(semana)} className="da-linha" />
		</li>
	);
}

/**
 * A lista sem edição publicada: uma folha diz que a primeira ainda não saiu e
 * leva à inscrição, na página inicial.
 */
function SemEdicoes() {
	return (
		<div className="sem-edicoes">
			<h2 className="titulo-condensado letra-com-teto [--palavra:3.75]">
				A primeira edição ainda não saiu
			</h2>
			<p>
				Ela sai num domingo, com o que o Congresso votou na semana. Inscreva-se
				e ela chega no seu e-mail assim que for publicada.
			</p>
			<Link to="/" hash="newsletter" className={BOTAO_CONTINUAR}>
				Receber por e-mail
			</Link>
		</div>
	);
}

/**
 * Os links para as páginas vizinhas da lista, que funcionam sem o JavaScript. A
 * primeira página fica sem o ?pagina, como o endereço da lista. A página atual
 * vem antes no HTML; na tela larga, fica no meio, e os links ficam nos lados.
 */
function PaginasDasEdicoes({
	pagina,
	paginas,
}: {
	pagina: number;
	paginas: number;
}) {
	const anterior = pagina - 1;
	return (
		<nav aria-label="Páginas das edições" className="paginas-das-edicoes">
			<p className="pagina-atual rotulo">
				Página {pagina} de {paginas}
			</p>
			{pagina > 1 && (
				<Link
					to="/edicoes"
					search={anterior > 1 ? { pagina: anterior } : {}}
					className="mais-novas acao-de-texto"
				>
					<span>Edições mais novas</span>
				</Link>
			)}
			{pagina < paginas && (
				<Link
					to="/edicoes"
					search={{ pagina: pagina + 1 }}
					className="mais-antigas acao-de-texto"
				>
					<span>Edições mais antigas</span>
				</Link>
			)}
		</nav>
	);
}
