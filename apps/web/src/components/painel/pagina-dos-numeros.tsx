// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";
import type {
	MediaEtapa,
	NumerosPainel,
	TotalDiario,
	TotalSemanal,
} from "@/client";
import { classes } from "@/lib/classes";
import { estiloDoTeto } from "@/lib/conteudo/regua";
import { classeDaFita, comMilhares, formatarDia, plural } from "@/lib/formatar";
import {
	diaCurto,
	fraseDaColeta,
	fraseDaLeitura,
	fraseDaSemanaAtual,
	fraseDasConclusoes,
	fraseDasParticipacoes,
	fraseDasSemanas,
	fraseDasTentativas,
	fraseDasTrilhasLidas,
	fraseDasVisitas,
	fraseDaUltimaEdicao,
	fraseDosLidos,
	fraseDosPares,
	fraseDosQueVoltaram,
	linkDoCaminho,
	mediaNaTela,
	nomeDoCaminho,
	oDeMaisTotal,
	partesDoMaior,
	somaDosTotais,
	trilhasDoUso,
} from "@/lib/painel/numeros";
import { type Numeros, useNumeros } from "@/lib/painel/use-numeros";
import { BOTAO_CONTINUAR } from "../botao-continuar";
import { FaixaDeInformacoes } from "../faixa-de-informacoes";
import { CabecaDoPainel } from "./cabeca-do-painel";
import { VerificandoSessao } from "./verificando-sessao";

export type TrilhaDoCatalogo = { slug: string; titulo: string };

/** O tamanho de uma barra ou coluna: a parte do maior valor, de 0 a 1. */
const comParte = (parte: number) =>
	({ "--parte": String(parte) }) as CSSProperties;

/**
 * Os números do site e do sistema, em /painel/numeros, só para a administradora
 * (DESIGN.md, "Números do painel"): a folha, com o resumo de quatro números nas
 * fitas e uma seção por grupo, com os números escritos e as barras em tinta. A
 * conta é da API (a #297); a tela só soma os 30 dias das visitas e as leituras
 * das trilhas. Os números ficam só na memória da página
 * (lib/painel/use-numeros.ts).
 */
export function PaginaDosNumeros({
	catalogo,
}: {
	catalogo: readonly TrilhaDoCatalogo[];
}) {
	const { numeros, carregar } = useNumeros();

	if (numeros.tipo === "saiu") {
		return <VerificandoSessao />;
	}

	return (
		<div className="pagina-do-painel pagina-dos-numeros">
			<div className="parede">
				<div className="artigo-grade">
					<article className="folha artigo-folha caixa-do-teto">
						<CabecaDoPainel atual="numeros" />
						{/* O teto pela folha, como na revisão: a palavra mais larga é
						    "Números" (na régua de lib/conteudo/regua.ts). */}
						<h1 className="titulo-condensado letra-com-teto teto-pela-caixa [--palavra:3.74]">
							Números do site
						</h1>
						<CorpoDosNumeros
							numeros={numeros}
							catalogo={catalogo}
							carregar={carregar}
						/>
					</article>
				</div>
			</div>
		</div>
	);
}

function CorpoDosNumeros({
	numeros,
	catalogo,
	carregar,
}: {
	numeros: Exclude<Numeros, { tipo: "saiu" }>;
	catalogo: readonly TrilhaDoCatalogo[];
	carregar: () => Promise<void>;
}) {
	switch (numeros.tipo) {
		case "carregando":
			return (
				<p role="status" className="carregando-o-rascunho rotulo">
					Carregando os números…
				</p>
			);
		case "sem-api":
			return (
				<p className="lide">Os números não funcionam neste endereço do site.</p>
			);
		case "falhou":
			return (
				<div className="estado-da-revisao">
					<p className="lide">Os números não carregaram.</p>
					<p className="ainda-nao">{numeros.mensagem}</p>
					<button
						type="button"
						className={BOTAO_CONTINUAR}
						onClick={() => void carregar()}
					>
						Tentar de novo
					</button>
				</div>
			);
		case "abertos":
			return (
				<FolhaDosNumeros
					numeros={numeros.numeros}
					lidosEm={numeros.lidosEm}
					catalogo={catalogo}
				/>
			);
	}
}

function FolhaDosNumeros({
	numeros,
	lidosEm,
	catalogo,
}: {
	numeros: NumerosPainel;
	lidosEm: string;
	catalogo: readonly TrilhaDoCatalogo[];
}) {
	const { pessoas, uso, visitas } = numeros;
	return (
		<>
			<FaixaDeInformacoes>
				<span>{fraseDaLeitura(lidosEm)}</span>
				<span>Visitas dos últimos 30 dias</span>
			</FaixaDeInformacoes>
			<dl className="resumo-dos-numeros">
				<Destaque
					posicao={1}
					nome="Contas"
					valor={pessoas.contas.total}
					referencia={fraseDaSemanaAtual(pessoas.contas.novas_por_semana)}
				/>
				<Destaque
					posicao={2}
					nome="Inscritos na newsletter"
					valor={pessoas.inscritos.total}
					referencia={fraseDaSemanaAtual(pessoas.inscritos.novos_por_semana)}
				/>
				<Destaque
					posicao={3}
					nome="Páginas vistas"
					valor={somaDosTotais(visitas.por_dia)}
					referencia="nos últimos 30 dias"
				/>
				<Destaque
					posicao={4}
					nome="Artigos lidos"
					valor={somaDosTotais(uso.artigos_lidos_por_trilha)}
					referencia={fraseDasTrilhasLidas(uso.artigos_lidos_por_trilha)}
				/>
			</dl>
			<Visitas visitas={visitas} />
			<Pessoas pessoas={pessoas} />
			<Uso uso={uso} catalogo={catalogo} />
			<Newsletter newsletter={numeros.newsletter} />
			<Piloto piloto={numeros.piloto} />
			<Sistema sistema={numeros.sistema} />
		</>
	);
}

/**
 * Um número do resumo: o número grande, no desenho do Numeral e na fita da
 * posição, com o nome e a referência em Label. No HTML, o nome vem antes, e o
 * leitor de tela lê "Contas, 48, 6 nesta semana"; o CSS põe o número em cima. O
 * número tem o teto da caixa dele: um número comprido só diminui a letra.
 */
function Destaque({
	posicao,
	nome,
	valor,
	referencia,
}: {
	posicao: number;
	nome: string;
	valor: number;
	referencia: string;
}) {
	const numero = comMilhares(valor);
	return (
		<div className={classes("caixa-do-teto", classeDaFita(posicao))}>
			<dt className="rotulo">{nome}</dt>
			<dd
				className="numeral letra-com-teto teto-pela-caixa"
				style={estiloDoTeto(numero, "titulo-condensado")}
			>
				{numero}
			</dd>
			<dd className="rotulo">{referencia}</dd>
		</div>
	);
}

/**
 * Uma seção da folha, depois de um fio de tinta, com o título em Subtitle. As
 * seis seções têm o teto de NEWSLETTER, a palavra mais larga dos títulos.
 */
function Secao({
	id,
	titulo,
	children,
}: {
	id: string;
	titulo: string;
	children: ReactNode;
}) {
	return (
		<section aria-labelledby={id} className="secao-dos-numeros">
			<h2
				id={id}
				className="subtitulo-condensado letra-com-teto teto-pela-caixa [--palavra:5.44]"
			>
				{titulo}
			</h2>
			{children}
		</section>
	);
}

/** Os números escritos de um grupo: o número grande, em tinta, e o nome embaixo. */
function Cifras({ itens }: { itens: { nome: string; valor: string }[] }) {
	return (
		<dl className="cifras">
			{itens.map(({ nome, valor }) => (
				<div key={nome}>
					<dt className="rotulo">{nome}</dt>
					<dd className="cifra">{valor}</dd>
				</div>
			))}
		</dl>
	);
}

/**
 * Os pares de nome e valor em linhas, no desenho das tabelas, como as do banco
 * e das coletas. O valor fica à direita do nome quando cabe e desce para a linha
 * de baixo quando não cabe (a letra a 200% numa tela de 320 px): a página não
 * rola de lado, e o número não se parte.
 */
function Valores({ itens }: { itens: { nome: string; valor: string }[] }) {
	return (
		<dl className="valores-dos-numeros">
			{itens.map(({ nome, valor }) => (
				<div key={nome}>
					<dt>{nome}</dt>
					<dd>{valor}</dd>
				</div>
			))}
		</dl>
	);
}

type Coluna = {
	chave: string;
	/** O nome na tabela: "12 de novembro". */
	nome: string;
	/** O nome nas pontas do gráfico: "12 nov". */
	curto: string;
	/** O que aparece no alto quando o ponteiro passa pela coluna. */
	leitura: string;
	total: number;
};

/**
 * O gráfico de colunas: a frase que o resume, as colunas de tinta, fora do
 * leitor de tela, e a tabela com todos os números, num <details>. A coluna é a
 * parte do maior valor, e o zero fica sem coluna. No alto, o maior valor; com o
 * ponteiro numa coluna, o valor dela fica no lugar dele.
 */
function GraficoDeColunas({
	frase,
	maximo,
	colunas,
	tabela,
}: {
	frase: string;
	maximo: string;
	colunas: Coluna[];
	tabela: { resumo: string; legenda: string; rotulo: string; total: string };
}) {
	const partes = partesDoMaior(colunas.map(({ total }) => total));
	const primeira = colunas[0];
	const ultima = colunas[colunas.length - 1];
	return (
		<div className="grafico-de-colunas">
			<p className="frase-do-grafico">{frase}</p>
			<div
				aria-hidden="true"
				className="colunas"
				style={{ "--quantas": String(colunas.length) } as CSSProperties}
			>
				<p className="maximo-das-colunas rotulo">{maximo}</p>
				<ol>
					{colunas.map((coluna, indice) => (
						<li key={coluna.chave} style={comParte(partes[indice])}>
							{partes[indice] > 0 && <span className="coluna" />}
							<span className="leitura-da-coluna rotulo">{coluna.leitura}</span>
						</li>
					))}
				</ol>
				<div className="pontas-das-colunas rotulo">
					<span>{primeira.curto}</span>
					{colunas.length > 1 && <span>{ultima.curto}</span>}
				</div>
			</div>
			<details className="tabela-do-grafico">
				<summary>
					<span>{tabela.resumo}</span>
				</summary>
				<table className="tabela-dos-numeros">
					<caption className="sr-only">{tabela.legenda}</caption>
					<thead>
						<tr>
							<th scope="col">{tabela.rotulo}</th>
							<th scope="col">{tabela.total}</th>
						</tr>
					</thead>
					<tbody>
						{colunas.map((coluna) => (
							<tr key={coluna.chave}>
								<th scope="row">{coluna.nome}</th>
								<td>{comMilhares(coluna.total)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</details>
		</div>
	);
}

/** Os 30 dias das visitas, ou só a frase quando nenhum dia teve visita. */
function GraficoDosDias({ dias }: { dias: readonly TotalDiario[] }) {
	const frase = fraseDasVisitas(dias);
	const maior = oDeMaisTotal(dias);
	if (!maior) {
		return <p className="frase-do-grafico">{frase}</p>;
	}
	return (
		<GraficoDeColunas
			frase={frase}
			maximo={`máx. ${comMilhares(maior.total)}, em ${diaCurto(maior.dia)}`}
			colunas={dias.map(({ dia, total }) => ({
				chave: dia,
				nome: formatarDia(dia),
				curto: diaCurto(dia),
				leitura: `${diaCurto(dia)}: ${comMilhares(total)}`,
				total,
			}))}
			tabela={{
				resumo: "Os 30 dias em números",
				legenda: "Páginas vistas por dia",
				rotulo: "Dia",
				total: "Páginas vistas",
			}}
		/>
	);
}

/** As semanas de um número, ou só a frase quando não há semana com registro. */
function GraficoDasSemanas({
	semanas,
	minimo = false,
	legenda,
	total,
}: {
	semanas: readonly TotalSemanal[];
	minimo?: boolean;
	legenda: string;
	total: string;
}) {
	const frase = fraseDasSemanas(semanas, { minimo });
	const maior = oDeMaisTotal(semanas);
	if (!maior) {
		return <p className="frase-do-grafico">{frase}</p>;
	}
	const qualificador = minimo ? "pelo menos " : "";
	return (
		<GraficoDeColunas
			frase={frase}
			maximo={`máx. ${qualificador}${comMilhares(maior.total)}, na semana de ${diaCurto(maior.semana)}`}
			colunas={semanas.map(({ semana, total: quantos }) => ({
				chave: semana,
				nome: formatarDia(semana),
				curto: diaCurto(semana),
				leitura: `semana de ${diaCurto(semana)}: ${qualificador}${comMilhares(quantos)}`,
				total: quantos,
			}))}
			tabela={{
				resumo: "As semanas em números",
				legenda,
				rotulo: "Semana de",
				total,
			}}
		/>
	);
}

function Visitas({ visitas }: { visitas: NumerosPainel["visitas"] }) {
	const paginas = visitas.paginas_mais_vistas;
	const partes = partesDoMaior(paginas.map(({ total }) => total));
	return (
		<Secao id="numeros-visitas" titulo="Visitas">
			<div className="visitas-dos-numeros">
				<div className="grupo-dos-numeros">
					<h3 className="rotulo">Páginas vistas por dia</h3>
					<GraficoDosDias dias={visitas.por_dia} />
				</div>
				<div className="grupo-dos-numeros">
					<h3 id="numeros-paginas" className="rotulo">
						Páginas mais vistas
					</h3>
					{paginas.length === 0 ? (
						<p className="frase-do-grafico">
							Nenhuma página vista nos últimos 30 dias.
						</p>
					) : (
						<ol
							role="list"
							aria-labelledby="numeros-paginas"
							className="lista-de-barras"
						>
							{paginas.map(({ caminho, total }, indice) => {
								const link = linkDoCaminho(caminho);
								const nome = nomeDoCaminho(caminho);
								return (
									<li key={caminho} style={comParte(partes[indice])}>
										<span className="nome-da-barra">
											{link ? (
												<Link to={link} activeOptions={{ exact: true }}>
													{nome}
												</Link>
											) : (
												nome
											)}
										</span>
										<span className="total-da-barra">{comMilhares(total)}</span>
										{partes[indice] > 0 && (
											<span aria-hidden="true" className="barra-dos-numeros" />
										)}
									</li>
								);
							})}
						</ol>
					)}
				</div>
			</div>
		</Secao>
	);
}

function Pessoas({ pessoas }: { pessoas: NumerosPainel["pessoas"] }) {
	const { contas, inscritos } = pessoas;
	return (
		<Secao id="numeros-pessoas" titulo="Pessoas">
			<div className="grupos-dos-numeros">
				<div className="grupo-dos-numeros">
					<h3 className="rotulo">Contas</h3>
					<Cifras
						itens={[
							{ nome: "No total", valor: comMilhares(contas.total) },
							{
								nome: "Com o e-mail confirmado",
								valor: comMilhares(contas.confirmadas),
							},
						]}
					/>
					<h4 className="rotulo">Novas por semana</h4>
					<GraficoDasSemanas
						semanas={contas.novas_por_semana}
						legenda="Contas novas por semana"
						total="Contas novas"
					/>
				</div>
				<div className="grupo-dos-numeros inscritos-por-semana">
					<h3 className="rotulo">Inscritos na newsletter</h3>
					<Cifras
						itens={[{ nome: "No total", valor: comMilhares(inscritos.total) }]}
					/>
					<h4 className="rotulo">Novos por semana</h4>
					<GraficoDasSemanas
						semanas={inscritos.novos_por_semana}
						legenda="Inscritos novos por semana"
						total="Inscritos novos"
					/>
				</div>
			</div>
		</Secao>
	);
}

function Uso({
	uso,
	catalogo,
}: {
	uso: NumerosPainel["uso"];
	catalogo: readonly TrilhaDoCatalogo[];
}) {
	const trilhas = trilhasDoUso(
		uso.artigos_lidos_por_trilha,
		uso.trilhas_concluidas,
		catalogo,
	);
	const partes = partesDoMaior(trilhas.map(({ lidos }) => lidos));
	return (
		<Secao id="numeros-uso" titulo="Uso">
			<div className="grupos-dos-numeros">
				<div className="grupo-dos-numeros">
					<h3 id="numeros-por-trilha" className="rotulo">
						Por trilha
					</h3>
					<p className="nota-dos-numeros">
						As leituras marcadas nas contas. Quem lê sem conta não entra aqui.
					</p>
					{trilhas.length === 0 ? (
						<p className="frase-do-grafico">Nenhuma leitura marcada ainda.</p>
					) : (
						<ol
							role="list"
							aria-labelledby="numeros-por-trilha"
							className="trilhas-dos-numeros"
						>
							{trilhas.map((trilha, indice) => (
								<li
									key={trilha.slug}
									className={classeDaFita(trilha.posicao)}
									style={comParte(partes[indice])}
								>
									<span aria-hidden="true" className="numeral">
										{trilha.posicao}
									</span>
									<div className="texto-da-trilha">
										<span className="nome-da-trilha">{trilha.titulo}</span>
										<span className="lidos-da-trilha">
											{fraseDosLidos(trilha.lidos)}
										</span>
										{partes[indice] > 0 && (
											<span aria-hidden="true" className="barra-dos-numeros" />
										)}
										<span className="conclusoes-da-trilha">
											{fraseDasConclusoes(trilha.concluidas)}
										</span>
									</div>
								</li>
							))}
						</ol>
					)}
				</div>
				<div className="grupo-dos-numeros">
					<h3 className="rotulo">Contas ativas por semana</h3>
					<p className="nota-dos-numeros">
						Ativa é a conta que entrou ou marcou uma leitura na semana. O número
						é um mínimo: as entradas vêm das sessões que ainda estão guardadas.
					</p>
					<GraficoDasSemanas
						semanas={uso.contas_ativas_por_semana}
						minimo
						legenda="Contas ativas por semana, no mínimo"
						total="Contas ativas"
					/>
					<p className="frase-de-destaque">
						{fraseDosQueVoltaram(uso.contas_que_voltaram)}
					</p>
				</div>
			</div>
		</Secao>
	);
}

function Newsletter({
	newsletter,
}: {
	newsletter: NumerosPainel["newsletter"];
}) {
	const receberam = newsletter.inscritos_com_a_ultima_edicao;
	return (
		<Secao id="numeros-newsletter" titulo="Newsletter">
			<Cifras
				itens={[
					{
						nome: "Edições publicadas",
						valor: comMilhares(newsletter.edicoes_publicadas),
					},
					...(receberam === null
						? []
						: [
								{
									nome: "Receberam a última edição",
									valor: comMilhares(receberam),
								},
							]),
				]}
			/>
			<p className="frase-do-grafico">
				{fraseDaUltimaEdicao(newsletter.ultima_publicada_em)}
			</p>
		</Secao>
	);
}

function Piloto({ piloto }: { piloto: NumerosPainel["piloto"] }) {
	const { tentativas, participacoes, medias, total_perguntas } = piloto;
	return (
		<Secao id="numeros-piloto" titulo="Piloto">
			<FaixaDeInformacoes>
				<span>Quiz {piloto.versao_quiz}</span>
				<span>{plural(total_perguntas, "pergunta", "perguntas")}</span>
			</FaixaDeInformacoes>
			<h3 className="rotulo">Tentativas e participações</h3>
			<Valores
				itens={[
					{
						nome: "Antes da trilha",
						valor: fraseDasTentativas(tentativas.antes, participacoes.antes),
					},
					{
						nome: "Depois da trilha",
						valor: fraseDasTentativas(tentativas.depois, participacoes.depois),
					},
					{
						nome: "No total",
						valor: fraseDasTentativas(tentativas.total, participacoes.total),
					},
				]}
			/>
			<p className="frase-do-grafico">{fraseDasParticipacoes(participacoes)}</p>
			<h3 className="rotulo">Média de acertos</h3>
			<div className="medias-do-piloto">
				<MediaDaEtapa
					nome="Antes da trilha"
					media={medias.antes}
					perguntas={total_perguntas}
				/>
				<MediaDaEtapa
					nome="Depois da trilha"
					media={medias.depois}
					perguntas={total_perguntas}
				/>
			</div>
			<h3 className="rotulo">Participações com as duas etapas</h3>
			<p className="frase-do-grafico">{fraseDosPares(piloto.pares)}</p>
		</Secao>
	);
}

/**
 * A média de uma etapa: a porcentagem, a barra de 0 a 100% e os acertos em
 * média, ou a frase da situação quando a API não manda o número. Nunca o zero no
 * lugar do número que não veio.
 */
function MediaDaEtapa({
	nome,
	media,
	perguntas,
}: {
	nome: string;
	media: MediaEtapa;
	perguntas: number;
}) {
	const naTela = mediaNaTela(media, perguntas);
	const participacoes = plural(
		media.quantidade,
		"participação",
		"participações",
	);
	const parte = (media.percentual ?? 0) / 100;
	return (
		<div className="media-do-piloto" style={comParte(parte)}>
			<h4 className="rotulo">{nome}</h4>
			{naTela.tipo === "numero" ? (
				<>
					<p className="cifra">{naTela.porcentagem}</p>
					{parte > 0 && (
						<span aria-hidden="true" className="barra-dos-numeros" />
					)}
					<p className="frase-do-grafico">
						{`Em média, ${naTela.acertos}, com ${participacoes}.`}
					</p>
				</>
			) : (
				<>
					<p className="frase-da-situacao">{naTela.frase}</p>
					{media.quantidade > 0 && (
						<p className="frase-do-grafico">{`${participacoes} nesta etapa.`}</p>
					)}
				</>
			)}
		</div>
	);
}

const NO_BANCO = [
	["parlamentares", "Parlamentares"],
	["mandatos", "Mandatos"],
	["proposicoes", "Proposições"],
	["proposicoes_com_tema", "Proposições com tema"],
	["votacoes", "Votações"],
	["votos", "Votos"],
	["atos", "Atos do Diário Oficial"],
	["videos", "Vídeos das sessões"],
	["bens", "Bens declarados ao TSE"],
	["meses_ipca", "Meses do IPCA"],
] as const;

const COLETAS = [
	["camara", "Câmara dos Deputados"],
	["senado", "Senado Federal"],
	["diario_oficial", "Diário Oficial da União"],
	["tse", "TSE"],
	["banco_central", "Banco Central"],
] as const;

function Sistema({ sistema }: { sistema: NumerosPainel["sistema"] }) {
	return (
		<Secao id="numeros-sistema" titulo="Sistema">
			<div className="grupos-dos-numeros">
				<div className="grupo-dos-numeros">
					<h3 className="rotulo">No banco</h3>
					<Valores
						itens={NO_BANCO.map(([chave, nome]) => ({
							nome,
							valor: comMilhares(sistema[chave]),
						}))}
					/>
				</div>
				<div className="grupo-dos-numeros">
					<h3 className="rotulo">Últimas coletas</h3>
					<Valores
						itens={COLETAS.map(([chave, nome]) => ({
							nome,
							valor: fraseDaColeta(sistema.ultimas_coletas[chave]),
						}))}
					/>
				</div>
			</div>
		</Secao>
	);
}
