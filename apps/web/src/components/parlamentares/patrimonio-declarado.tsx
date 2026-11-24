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
	type CalculoDaEleicao,
	type Diferenca,
	graficoDoPatrimonio,
	type LinhaDoGrafico,
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
 * da mais antiga para a mais nova, com o ano em número grande, o cargo disputado,
 * o estado e o resultado, o total em destaque e o valor exato declarado, com o
 * arquivo do TSE. O total vem primeiro como foi declarado (o Renan, em
 * 23/11/2026), e a chave do alto da lista troca pelos reais de hoje, com a
 * diferença para a eleição anterior e o período da correção. O aviso do valor
 * declarado fica antes da chave; o gráfico dos valores de hoje, entre ela e a
 * lista; o aviso da diferença e o "Como calculamos", depois. As contas são da
 * API: aqui, só se escrevem os números.
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
	const grafico = graficoDoPatrimonio(linhas);
	// Só há chave com uma eleição em reais de hoje: sem ela, os valores aparecem
	// como foram declarados, como antes.
	const comChave = correcaoAplicada !== null;
	const comDiferenca = linhas.some(({ diferenca }) => diferenca !== null);
	const calculos = linhas.flatMap(({ chave, calculo }) =>
		calculo === null ? [] : [{ chave, ...calculo }],
	);
	return (
		<>
			{/* Na tela larga, a abertura fica à esquerda, e a chave e a lista, à
			    direita (estilos/parlamentares.css). */}
			<div className="abertura-do-patrimonio">
				<p className="texto-do-patrimonio">
					Quem se candidata entrega à Justiça Eleitoral uma lista dos próprios
					bens, como casas, carros e dinheiro no banco. Aqui está o total que{" "}
					{nome} declarou nas eleições gerais em que concorreu.
					{correcao === null
						? " Os valores aparecem como foram declarados, sem a correção pela inflação: a série do IPCA não está nos dados usados agora."
						: mes && (
								// A frase fala da chave e some com ela, num navegador sem o :has().
								<span className="so-com-chave">
									{parcial
										? ` Para comparar anos diferentes, você pode ver os totais em reais de hoje, corrigidos pela inflação até ${mes}, quando a série do IPCA cobre a eleição.`
										: ` Para comparar anos diferentes, você pode ver cada total em reais de hoje, corrigido pela inflação até ${mes}.`}
								</span>
							)}
				</p>
				<p className="texto-do-patrimonio aviso-do-patrimonio">
					É o valor que a própria pessoa declarou ao registrar a candidatura, e
					não o patrimônio de hoje. A Justiça Eleitoral dá acesso à declaração
					como ela foi entregue, e cada bem costuma entrar pelo preço de compra,
					como na declaração do Imposto de Renda: uma casa comprada há 20 anos
					pode aparecer pelo valor daquela época.
				</p>
			</div>
			<div className="dados-do-patrimonio">
				{comChave && <ChaveDosValores />}
				{grafico && <GraficoDoPatrimonio linhas={grafico} />}
				<ol role="list" className="eleicoes-do-patrimonio">
					{linhas.map((linha) => (
						<EleicaoDoPatrimonio
							key={linha.chave}
							linha={linha}
							comChave={comChave}
						/>
					))}
				</ol>
				{comDiferenca && (
					<p className="texto-do-patrimonio aviso-do-patrimonio so-de-hoje">
						A diferença pode vir de compra, venda, herança ou doação de bens:
						sozinha, não diz por quê.
					</p>
				)}
				<p className="texto-do-patrimonio nota-do-patrimonio">
					Só aparecem as eleições em que deu para ligar, com segurança, a
					candidatura no TSE a {nome}. O arquivo de cada ano é o do TSE com os
					bens declarados naquela eleição, e não só os desta pessoa.
				</p>
				{correcaoAplicada && (
					<ComoCalculamos
						correcao={correcaoAplicada}
						parcial={parcial}
						calculos={calculos}
					/>
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
			</div>
		</>
	);
}

/**
 * A chave "Mostrar os valores" (o Renan, em 23/11/2026: "Chave no alto da
 * lista"): o valor declarado, marcado ao abrir, e os reais de hoje. Cada eleição
 * vem no HTML com as duas versões, e o CSS mostra a da opção marcada
 * (estilos/parlamentares.css): a chave funciona sem o JavaScript, e o leitor de
 * tela ouve só a versão que aparece. Num navegador sem o :has(), a chave some,
 * e fica o valor declarado.
 */
function ChaveDosValores() {
	return (
		<fieldset className="chave-dos-valores">
			<legend className="rotulo">Mostrar os valores</legend>
			<div className="opcoes-dos-valores">
				<label className="opcao-dos-valores">
					<input
						type="radio"
						name="valores-do-patrimonio"
						value="declarado"
						defaultChecked
					/>
					<span className="marca-da-opcao" aria-hidden="true" />
					<span>Valor declarado</span>
				</label>
				<label className="opcao-dos-valores">
					<input type="radio" name="valores-do-patrimonio" value="de-hoje" />
					<span className="marca-da-opcao" aria-hidden="true" />
					<span>Em reais de hoje</span>
				</label>
			</div>
		</fieldset>
	);
}

/**
 * O gráfico "Em reais de hoje" (o Renan, em 23/11/2026: "Um gráfico só, no
 * alto"): uma linha por eleição, na ordem da lista, com o ano, a barra e o valor
 * arredondado. As barras usam a mesma régua, a do maior valor de hoje da pessoa,
 * e a eleição sem o valor de hoje diz isso no lugar da barra. O gráfico fica
 * fora do leitor de tela: os números estão na lista, logo embaixo. Ele só
 * aparece com a chave nos reais de hoje.
 */
function GraficoDoPatrimonio({ linhas }: { linhas: LinhaDoGrafico[] }) {
	return (
		<div className="grafico-do-patrimonio so-de-hoje" aria-hidden="true">
			<p className="rotulo titulo-do-grafico">Em reais de hoje</p>
			<div className="linhas-do-grafico">
				{linhas.map(({ chave, ano, valor, parte }) => (
					<div key={chave} className="linha-do-grafico">
						<span className="ano-do-grafico">{ano}</span>
						{valor === null ? (
							<span className="sem-valor-do-grafico">sem o valor de hoje</span>
						) : (
							<>
								<span className="trilho-do-grafico">
									{parte !== null && (
										<span
											className="barra-do-patrimonio"
											style={{ "--parte": String(parte) } as CSSProperties}
										/>
									)}
								</span>
								<span className="valor-do-grafico">{valor}</span>
							</>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Uma eleição: o ano, o cargo disputado, o estado e o resultado, o valor em
 * destaque, e embaixo o declarado exato e o arquivo do TSE, com a data da
 * coleta. Com a chave, o valor vem em duas versões: o declarado, arredondado, e
 * o de hoje, com a diferença para a eleição anterior e o período da correção. O
 * link tem um nome só dele para o leitor de tela; fora dos sites oficiais, o
 * arquivo fica escrito, sem link.
 */
function EleicaoDoPatrimonio({
	linha,
	comChave,
}: {
	linha: LinhaDoPatrimonio;
	comChave: boolean;
}) {
	const { ano, cargo, lugar, resultado, valor, diferenca, periodo, fonte } =
		linha;
	const deHoje = (
		<>
			<ValorDestacado valor={valor} />
			{diferenca && <DiferencaDaEleicao diferenca={diferenca} />}
			{periodo && <p className="periodo-da-eleicao">{periodo}</p>}
		</>
	);
	return (
		<li className="eleicao-do-patrimonio">
			<h3 className="ano-da-eleicao">{ano}</h3>
			<div className="cargo-da-eleicao">
				<FaixaDeInformacoes>
					<span>{cargo}</span>
					<span>{lugar}</span>
				</FaixaDeInformacoes>
				{resultado && <p className="resultado-da-eleicao">{resultado}</p>}
			</div>
			{comChave && valor.tipo !== "sem-total" ? (
				<>
					<div className="valor-da-eleicao so-declarado">
						<p className="destaque-do-valor">
							{valor.tipo === "corrigido" ? valor.arredondado : valor.destaque}
						</p>
						<p className="rotulo legenda-do-valor">valor declarado</p>
					</div>
					<div className="valor-da-eleicao so-de-hoje">{deHoje}</div>
				</>
			) : (
				<div className="valor-da-eleicao">{deHoje}</div>
			)}
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
 * O valor em destaque: em reais de hoje ou o declarado, quando falta a correção.
 * Sem o total, a frase diz que os dados não trazem um.
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
		</>
	);
}

/**
 * A diferença para a eleição anterior, em tinta, sem cor de ganho nem de perda:
 * na tela, com o sinal do percentual entre parênteses; no leitor de tela, com "a
 * mais" ou "a menos" em palavras também no percentual.
 */
function DiferencaDaEleicao({ diferenca }: { diferenca: Diferenca }) {
	const { texto, leitor } = diferenca;
	return (
		<p className="diferenca-da-eleicao">
			{texto === leitor ? (
				texto
			) : (
				<>
					<span className="sr-only">{leitor}</span>
					<span aria-hidden="true">{texto}</span>
				</>
			)}
		</p>
	);
}

/**
 * Como calculamos os reais de hoje: o índice e até que mês a correção vai, uma
 * frase por eleição, com a alta dos preços e quanto R$ 100 daquele ano valem
 * hoje, e o link da Calculadora do Cidadão do Banco Central com as datas dela; no
 * fim, a série do IPCA, com a data da coleta. Cada link da calculadora tem um
 * nome só dele para o leitor de tela.
 */
function ComoCalculamos({
	correcao,
	parcial,
	calculos,
}: {
	correcao: CorrecaoIpca;
	parcial: boolean;
	calculos: (CalculoDaEleicao & { chave: string })[];
}) {
	const serie = enderecoSeguro(correcao.fonte.url);
	return (
		<div className="correcao-do-patrimonio so-de-hoje">
			<h3 className="titulo-da-correcao">Como calculamos os reais de hoje</h3>
			<p className="texto-do-patrimonio">
				A correção usa o IPCA, a inflação oficial medida pelo IBGE, de outubro
				do ano {parcial ? "da eleição" : "de cada eleição"} até{" "}
				{formatarMes(correcao.mes_fim)}.
			</p>
			{calculos.length > 0 && (
				<ul role="list" className="calculos-do-patrimonio">
					{calculos.map(({ chave, ano, frase, calculadora }) => (
						<li key={chave} className="calculo-da-eleicao">
							<p className="texto-do-patrimonio">{frase}</p>
							<a href={calculadora} className="acao-de-texto">
								<span>Conferir na Calculadora do Cidadão</span>{" "}
								<span className="sr-only">a correção de {ano}</span>
							</a>
						</li>
					))}
				</ul>
			)}
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
