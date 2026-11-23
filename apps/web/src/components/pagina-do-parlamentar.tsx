// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import type { VotoParlamentar } from "@/client";
import { sementeDe } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { estiloDoTeto } from "@/lib/conteudo/regua";
import { enderecoSeguro } from "@/lib/edicoes/conteudo-da-edicao";
import { TRECHO_DOS_VOTOS } from "@/lib/foco";
import { dataEmBrasilia, formatarData, plural } from "@/lib/formatar";
import {
	enderecoDoParlamentar,
	estadoDaSigla,
	type PaginaDoParlamentar as Pagina,
	type ParlamentarDaPagina,
} from "@/lib/parlamentares";
import {
	artigoDaRegra,
	EXPLICACAO_DO_VOTO,
	NOME_DA_CASA,
	NOME_DO_VOTO,
	parteDoVoto,
	REGIMENTOS,
	RESULTADO,
	tituloDaVotacao,
	totalDaContagem,
	valoresDaContagem,
} from "@/lib/parlamentares/votos";
import { Painel } from "./azulejo";
import { FaixaDeInformacoes } from "./faixa-de-informacoes";
import { ParlamentaresIndisponiveis } from "./pagina-dos-parlamentares";
import { FichaDoParlamentar } from "./parlamentares/ficha-do-parlamentar";
import { FotoOficial } from "./parlamentares/foto-oficial";
import { PatrimonioDeclarado } from "./parlamentares/patrimonio-declarado";
import { ARTIGO_DA_VOTACAO } from "./parlamentares/quem-votou-como";

/**
 * A página de um parlamentar, em /parlamentares/81-nome: o cartaz das páginas de
 * dentro, com o nome gigante, a Casa e o estado, a ficha com a fonte de cada
 * dado, o painel de enfeite, com a semente do id, e a foto oficial colada nele,
 * com o crédito; embaixo, o patrimônio declarado ao TSE em cada eleição, como a
 * pessoa votou, com a barra, a regra de cada voto e o artigo do regimento, e os
 * votos, do mais novo para o mais antigo, 20 por página. Sem voto registrado, a
 * página explica por quê, com a votação simbólica e o link da trilha.
 */
export function PaginaDoParlamentar({ pagina }: { pagina: Pagina }) {
	if (pagina.tipo === "sem-api") {
		return <ParlamentaresIndisponiveis />;
	}
	const { parlamentar, foto, votos, total, paginas, patrimonio } = pagina;
	const estado = estadoDaSigla(parlamentar.uf);
	return (
		<>
			<section
				className={classes(
					"cartaz cartaz-medio cartaz-do-parlamentar",
					foto && "com-foto",
				)}
			>
				<Painel
					semente={sementeDe(`parlamentar-${parlamentar.id}`)}
					colunas={4}
					quantas={64}
					className="mural"
					sozinho
				/>
				<nav aria-label="Caminho" className="migalhas rotulo">
					<ol>
						<li>
							<Link to="/parlamentares" activeOptions={{ exact: true }}>
								Parlamentares
							</Link>
						</li>
						{estado && (
							<li>
								<Link
									to="/parlamentares"
									search={{ uf: estado.sigla }}
									activeOptions={{ exact: true }}
								>
									{estado.nome}
								</Link>
							</li>
						)}
					</ol>
				</nav>
				{/* O nome vem da API: o teto da letra grande sai da régua, com a palavra
				    mais larga dele (lib/conteudo/regua.ts). A entrelinha é a da
				    leitura (o titulo-de-folha): com a do cartaz, a cedilha de um nome
				    encostaria no acento da linha de baixo (a #158). */}
				<h1
					className="titulo-de-folha letra-com-teto"
					style={estiloDoTeto(parlamentar.nome, "titulo-condensado")}
				>
					{parlamentar.nome}
				</h1>
				{/* A foto vem depois do nome no HTML, e o leitor de tela ouve o nome
				    antes dela. Na tela, ela fica no painel (estilos/parlamentares.css). */}
				{foto && <FotoOficial foto={foto} nome={parlamentar.nome} />}
				<div className="cartaz-pe">
					<FaixaDeInformacoes>
						<span>{NOME_DA_CASA[parlamentar.casa]}</span>
						{estado && <span>{estado.nome}</span>}
					</FaixaDeInformacoes>
					<FichaDoParlamentar
						parlamentar={parlamentar}
						patrimonio={patrimonio}
						votos={total}
					/>
				</div>
			</section>
			<div className="artigos corpo-dos-parlamentares">
				<PatrimonioDeclarado patrimonio={patrimonio} nome={parlamentar.nome} />
				{total === 0 ? (
					<SemVotos nome={parlamentar.nome} />
				) : (
					<>
						<ComoVotou parlamentar={parlamentar} />
						<section
							aria-labelledby={TRECHO_DOS_VOTOS}
							className="secao-dos-parlamentares"
						>
							<h2
								id={TRECHO_DOS_VOTOS}
								tabIndex={-1}
								className="subtitulo-condensado letra-com-teto [--palavra:2.77]"
							>
								Votos
							</h2>
							<p className="rotulo total-de-votos">
								{plural(total, "voto registrado", "votos registrados")}, do mais
								novo para o mais antigo
							</p>
							<ol role="list" className="votos-do-parlamentar">
								{votos.map((voto) => (
									<VotoDaPessoa key={voto.votacao_id} voto={voto} />
								))}
							</ol>
							{paginas > 1 && (
								<PaginasDosVotos
									endereco={enderecoDoParlamentar(parlamentar)}
									pagina={pagina.pagina}
									paginas={paginas}
								/>
							)}
						</section>
					</>
				)}
			</div>
		</>
	);
}

/**
 * Como a pessoa votou: quantas vezes cada voto aparece, com o número em tinta, a
 * barra da parte dele no total (o Renan, em 23/11/2026: "Barra em cada voto") e
 * o que cada um quer dizer, com o artigo do regimento da Casa dela. O Outro
 * registro só aparece quando passa de zero. As barras ficam fora do leitor de
 * tela, junto com a frase que as explica: os números já estão escritos.
 */
function ComoVotou({ parlamentar }: { parlamentar: ParlamentarDaPagina }) {
	const { casa, contagem_votos: contagem } = parlamentar;
	const regimento = REGIMENTOS[casa];
	const soma = totalDaContagem(contagem);
	return (
		<section aria-labelledby="como-votou" className="secao-dos-parlamentares">
			<h2
				id="como-votou"
				className="subtitulo-condensado letra-com-teto [--palavra:2.82]"
			>
				Como votou
			</h2>
			<p className="rotulo legenda-das-barras" aria-hidden="true">
				A barra mostra a parte de cada voto no total de{" "}
				{plural(soma, "voto registrado", "votos registrados")}
			</p>
			<dl className="tipos-de-voto">
				{valoresDaContagem(contagem).map((valor) => {
					const artigo = artigoDaRegra(valor, casa);
					const parte = parteDoVoto(contagem[valor], soma);
					return (
						<div key={valor} className="tipo-de-voto">
							<dt className="nome-do-tipo">{NOME_DO_VOTO[valor]}</dt>
							<dd className="numero-do-tipo">{contagem[valor]}</dd>
							<dd className="trilho-do-tipo" aria-hidden="true">
								{parte !== null && (
									<span
										className="barra-do-tipo"
										style={{ "--parte": String(parte) } as CSSProperties}
									/>
								)}
							</dd>
							<dd className="regra-do-tipo">
								{EXPLICACAO_DO_VOTO[valor].texto}
								{artigo && (
									<span className="artigo-da-regra">
										{" "}
										({regimento.citacao}, {artigo})
									</span>
								)}
							</dd>
						</div>
					);
				})}
			</dl>
			<p className="fonte-das-regras">
				Fonte das regras: <a href={regimento.url}>{regimento.nome}</a>.
			</p>
		</section>
	);
}

/**
 * Um voto da pessoa: a votação, o dia e o resultado, o voto num carimbo de
 * tinta (o Sim não é verde, e o Não não é vermelho), a ementa da proposição ou,
 * sem ela, a descrição oficial, e os links para quem votou como e para a página
 * oficial. Cada link tem um nome só dele para o leitor de tela.
 */
function VotoDaPessoa({ voto }: { voto: VotoParlamentar }) {
	const titulo = tituloDaVotacao(voto);
	const dia = formatarData(voto.data.slice(0, 10));
	const texto = voto.proposicoes[0]?.ementa ?? voto.descricao;
	const oficial = voto.url_oficial && enderecoSeguro(voto.url_oficial);
	const daVotacao = `da votação de ${dia}: ${titulo}`;
	return (
		<li className="voto-da-pessoa">
			<h3 className="titulo-do-voto">{titulo}</h3>
			<div className="fatos-do-voto">
				<FaixaDeInformacoes>
					<span>{dia}</span>
					<span>{RESULTADO[voto.resultado]}</span>
				</FaixaDeInformacoes>
			</div>
			<p className="carimbo-do-voto">
				<span className="sr-only">Voto: </span>
				{NOME_DO_VOTO[voto.valor]}
			</p>
			{texto && <p className="texto-do-voto">{texto}</p>}
			<ul role="list" className="links-do-voto">
				<li>
					<Link
						to="/votacoes/$id"
						params={{ id: String(voto.votacao_id) }}
						className="acao-de-texto"
					>
						<span>Ver quem votou</span>{" "}
						<span className="sr-only">
							na votação de {dia}: {titulo}
						</span>
					</Link>
				</li>
				{oficial && (
					<li>
						<a href={oficial} className="acao-de-texto">
							<span>Página oficial</span>{" "}
							<span className="sr-only">{daVotacao}</span>
						</a>
					</li>
				)}
			</ul>
			<p className="rotulo coletado-em">
				Coletado em {formatarData(dataEmBrasilia(voto.coletado_em))}
			</p>
		</li>
	);
}

/**
 * Sem voto registrado (o Renan, em 21/11/2026): a folha diz que os dados ainda
 * não têm votos da pessoa e explica por quê, com a votação simbólica, e leva à
 * trilha que conta como o Plenário vota.
 */
function SemVotos({ nome }: { nome: string }) {
	return (
		<section aria-labelledby="sem-votos" className="sem-votos">
			<h2
				id="sem-votos"
				className="titulo-condensado letra-com-teto [--palavra:4.85]"
			>
				Nenhum voto registrado ainda
			</h2>
			<p>
				Os dados usados ainda não têm votos de {nome}. O voto de cada
				parlamentar só fica registrado na votação nominal, feita em geral pelo
				painel eletrônico. Na votação simbólica, a mais comum na Câmara, o
				resultado sai sem a lista de nomes.
			</p>
			<p>
				<Link
					to="/trilhas/$trilha/$artigo"
					params={ARTIGO_DA_VOTACAO}
					className="acao-de-texto"
				>
					<span>Entenda na trilha: O Plenário vota o projeto</span>
				</Link>
			</p>
		</section>
	);
}

/**
 * Os links para as páginas vizinhas dos votos, como os das edições (o mesmo
 * desenho, no edicoes.css). O trecho leva ao título dos votos com e sem o
 * JavaScript. A primeira página fica sem o ?pagina.
 */
function PaginasDosVotos({
	endereco,
	pagina,
	paginas,
}: {
	endereco: string;
	pagina: number;
	paginas: number;
}) {
	const anterior = pagina - 1;
	return (
		<nav aria-label="Páginas dos votos" className="paginas-das-edicoes">
			<p className="pagina-atual rotulo">
				Página {pagina} de {paginas}
			</p>
			{pagina > 1 && (
				<Link
					to="/parlamentares/$id"
					params={{ id: endereco }}
					search={anterior > 1 ? { pagina: anterior } : {}}
					hash={TRECHO_DOS_VOTOS}
					className="mais-novas acao-de-texto"
				>
					<span>Votos mais novos</span>
				</Link>
			)}
			{pagina < paginas && (
				<Link
					to="/parlamentares/$id"
					params={{ id: endereco }}
					search={{ pagina: pagina + 1 }}
					hash={TRECHO_DOS_VOTOS}
					className="mais-antigas acao-de-texto"
				>
					<span>Votos mais antigos</span>
				</Link>
			)}
		</nav>
	);
}
