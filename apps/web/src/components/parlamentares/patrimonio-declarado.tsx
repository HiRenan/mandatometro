// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { type CSSProperties, Fragment } from "react";
import type { CorrecaoIpca } from "@/client";
import { enderecoSeguro } from "@/lib/edicoes/conteudo-da-edicao";
import {
	dataEmBrasilia,
	formatarData,
	formatarMes,
	semQuebrarCitacao,
} from "@/lib/formatar";
import type { Patrimonio } from "@/lib/parlamentares";
import {
	type LinhaDoPatrimonio,
	linhasDoPatrimonio,
	type ValorDaEleicao,
} from "@/lib/parlamentares/patrimonio";
import { FaixaDeInformacoes } from "../faixa-de-informacoes";

/** A Lei das Eleições: o § 1º, IV, do art. 11 pede a declaração de bens no registro. */
const LEI_DAS_ELEICOES =
	"https://www.planalto.gov.br/ccivil_03/leis/l9504.htm#art11";
const LEI_DO_IMPOSTO_DE_RENDA =
	"https://www.planalto.gov.br/ccivil_03/leis/l9250.htm#art25";

/**
 * O patrimônio declarado ao TSE (o Renan, em 22/11/2026): uma linha por eleição,
 * da mais antiga para a mais nova, com o ano em número grande, o cargo disputado
 * e o estado, o total em reais de hoje em destaque, com a barra, e o valor exato
 * declarado, com o arquivo do TSE. O aviso do valor declarado fica logo antes da
 * lista. As contas são da API: aqui, só se escrevem os números.
 */
export function PatrimonioDeclarado({
	patrimonio,
	nome,
}: {
	patrimonio: Patrimonio;
	nome: string;
}) {
	return (
		<section
			aria-labelledby="patrimonio"
			className="secao-dos-parlamentares patrimonio-declarado"
		>
			<h2
				id="patrimonio"
				className="subtitulo-condensado letra-com-teto [--palavra:5.26]"
			>
				Patrimônio declarado ao TSE
			</h2>
			<ConteudoDoPatrimonio patrimonio={patrimonio} nome={nome} />
		</section>
	);
}

function ConteudoDoPatrimonio({
	patrimonio,
	nome,
}: {
	patrimonio: Patrimonio;
	nome: string;
}) {
	if (patrimonio.tipo === "indisponivel") {
		return (
			<p className="texto-do-patrimonio">
				O patrimônio declarado não carregou agora. Recarregue a página para
				tentar de novo.
			</p>
		);
	}
	const { eleicoes, correcao } = patrimonio;
	if (eleicoes.length === 0) {
		return (
			<p className="texto-do-patrimonio">
				Os dados usados ainda não têm a declaração de bens de {nome}. Uma
				eleição só aparece aqui quando dá para ligar, com segurança, a
				candidatura no TSE a esta pessoa.
			</p>
		);
	}
	const linhas = linhasDoPatrimonio(eleicoes, correcao);
	const correcaoAplicada = linhas.some(
		({ valor }) => valor.tipo === "corrigido",
	)
		? correcao
		: null;
	const parcial = linhas.some(({ valor }) => valor.tipo === "sem-correcao");
	const mes = correcaoAplicada && formatarMes(correcaoAplicada.mes_fim);
	return (
		<>
			<p className="texto-do-patrimonio">
				Quem se candidata entrega à Justiça Eleitoral uma lista dos próprios
				bens, como casas, carros e dinheiro no banco. Aqui está o total que{" "}
				{nome} declarou nas eleições gerais em que concorreu.
				{correcao === null
					? " Os valores aparecem como foram declarados, sem a correção pela inflação: a série do IPCA não está nos dados usados agora."
					: mes &&
						(parcial
							? ` Para comparar anos diferentes, os totais aparecem também em reais de hoje, corrigidos pela inflação até ${mes}, quando a série do IPCA cobre a eleição.`
							: ` Para comparar anos diferentes, cada total aparece também em reais de hoje, corrigido pela inflação até ${mes}.`)}
			</p>
			<p className="texto-do-patrimonio aviso-do-patrimonio">
				É o valor que a própria pessoa declarou ao registrar a candidatura, e
				não o patrimônio de hoje. A Justiça Eleitoral dá acesso à declaração
				como ela foi entregue, e cada bem costuma entrar pelo preço de compra,
				como na declaração do Imposto de Renda: uma casa comprada há 20 anos
				pode aparecer pelo valor daquela época.
			</p>
			<ol role="list" className="eleicoes-do-patrimonio">
				{linhas.map((linha) => (
					<EleicaoDoPatrimonio
						key={`${linha.ano}-${linha.cargo}-${linha.lugar}`}
						linha={linha}
					/>
				))}
			</ol>
			<p className="texto-do-patrimonio nota-do-patrimonio">
				Só aparecem as eleições em que deu para ligar, com segurança, a
				candidatura no TSE a {nome}. O arquivo de cada ano é o do TSE com os
				bens declarados naquela eleição, e não só os desta pessoa.
			</p>
			{correcaoAplicada && (
				<CorrecaoPeloIpca correcao={correcaoAplicada} parcial={parcial} />
			)}
			<p className="fonte-das-regras">
				Fontes das regras:{" "}
				<a href={LEI_DAS_ELEICOES}>
					{semQuebrarCitacao("Lei 9.504/1997, art. 11")}
				</a>{" "}
				e{" "}
				<a href={LEI_DO_IMPOSTO_DE_RENDA}>
					{semQuebrarCitacao("Lei 9.250/1995, art. 25")}
				</a>
				.
			</p>
		</>
	);
}

/**
 * Uma eleição: o ano, o cargo disputado e o estado, o valor em destaque, com a
 * barra, e embaixo o declarado exato e o arquivo do TSE, com a data da coleta. O
 * link tem um nome só dele para o leitor de tela; fora dos sites oficiais, o
 * arquivo fica escrito, sem link.
 */
function EleicaoDoPatrimonio({ linha }: { linha: LinhaDoPatrimonio }) {
	const { ano, cargo, lugar, valor, fonte } = linha;
	return (
		<li className="eleicao-do-patrimonio">
			<h3 className="ano-da-eleicao">{ano}</h3>
			<div className="cargo-da-eleicao">
				<FaixaDeInformacoes>
					<span>{cargo}</span>
					<span>{lugar}</span>
				</FaixaDeInformacoes>
			</div>
			<div className="valor-da-eleicao">
				<ValorDestacado valor={valor} />
			</div>
			<div className="detalhes-da-eleicao">
				{valor.tipo !== "sem-total" && (
					<ValorDeclarado ano={ano} valor={valor.declarado} />
				)}
				{fonte.endereco ? (
					<a href={fonte.endereco} className="acao-de-texto">
						<span>Arquivo do TSE{fonte.zip && " (ZIP)"}</span>{" "}
						<span className="sr-only">com os bens declarados em {ano}</span>
					</a>
				) : (
					<p className="rotulo arquivo-sem-link">Arquivo do TSE</p>
				)}
				<p className="rotulo coletado-em">Coletado em {fonte.coletado}</p>
			</div>
		</li>
	);
}

/** As quebras ficam no texto visual. O leitor de tela recebe o número inteiro. */
function ValorDeclarado({ ano, valor }: { ano: number; valor: string }) {
	const rotulo = `Declarado em\u00a0${ano}: `;
	return (
		<p className="declarado-na-eleicao">
			<span className="sr-only">{rotulo + valor}</span>
			<span aria-hidden="true">
				{rotulo}
				<span className="valor-exato-da-eleicao">
					{Array.from(valor.matchAll(/[^.]+\.?/g), ({ 0: grupo, index }) => (
						<Fragment key={index}>
							{index > 0 && <wbr />}
							{grupo}
						</Fragment>
					))}
				</span>
			</span>
		</p>
	);
}

/**
 * O valor em destaque: em reais de hoje, com a barra, ou o declarado, quando
 * falta a correção. Sem o total, a frase diz que os dados não trazem um. A barra
 * fica fora do leitor de tela: o número já está escrito.
 */
function ValorDestacado({ valor }: { valor: ValorDaEleicao }) {
	if (valor.tipo === "sem-total") {
		return (
			<p className="sem-total-da-eleicao">
				Os dados do TSE desta eleição não trazem um total de bens.
			</p>
		);
	}
	return (
		<>
			<p className="destaque-do-valor">{valor.destaque}</p>
			<p className="rotulo legenda-do-valor">
				{valor.tipo === "corrigido"
					? "em reais de hoje"
					: "sem a correção pela inflação"}
			</p>
			{valor.tipo === "corrigido" && valor.barra !== null && (
				<span
					aria-hidden="true"
					className="barra-do-patrimonio"
					style={{ "--parte": String(valor.barra) } as CSSProperties}
				/>
			)}
		</>
	);
}

/** De onde vem a correção: o índice, até que mês ela vai e a série do Banco Central. */
function CorrecaoPeloIpca({
	correcao,
	parcial,
}: {
	correcao: CorrecaoIpca;
	parcial: boolean;
}) {
	const serie = enderecoSeguro(correcao.fonte.url);
	return (
		<div className="correcao-do-patrimonio">
			<p className="texto-do-patrimonio">
				A correção usa o IPCA, a inflação oficial medida pelo IBGE, de outubro
				do ano {parcial ? "da eleição" : "de cada eleição"} até{" "}
				{formatarMes(correcao.mes_fim)}.
			</p>
			{serie && (
				<a href={serie} className="acao-de-texto">
					<span>Série do IPCA no Banco Central</span>
				</a>
			)}
			<p className="rotulo coletado-em">
				Coletada em {formatarData(dataEmBrasilia(correcao.fonte.coletado_em))}
			</p>
		</div>
	);
}
