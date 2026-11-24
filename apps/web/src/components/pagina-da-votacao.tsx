import { AcaoDeTexto } from "@/components/acao-de-texto";
import { sementeDe } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { estiloDoTeto } from "@/lib/conteudo/regua";
import { enderecoSeguro } from "@/lib/edicoes/conteudo-da-edicao";
import { dataEmBrasilia, formatarData } from "@/lib/formatar";
import type { PaginaDaVotacao as Pagina } from "@/lib/parlamentares";
import { idDoVideo } from "@/lib/parlamentares/video";
import {
	type Filtro,
	NOME_DA_CASA,
	nomeDaProposicao,
	RESULTADO,
	tituloDaVotacao,
	totalDaContagem,
} from "@/lib/parlamentares/votos";
import { Painel } from "./azulejo";
import { FaixaDeInformacoes } from "./faixa-de-informacoes";
import { QuadroDaVotacao } from "./item-da-edicao";
import { ParlamentaresIndisponiveis } from "./pagina-dos-parlamentares";
import { PlacarPorPartido } from "./parlamentares/placar-por-partido";
import { Plenario } from "./parlamentares/plenario";
import { QuemVotouComo } from "./parlamentares/quem-votou-como";
import { VideoDaSessao } from "./parlamentares/video-da-sessao";

/**
 * A página de uma votação, em /votacoes/139 (o Renan, em 21/11/2026: quem votou
 * como). O cartaz das páginas de dentro traz a proposição votada; no pé, a Casa,
 * o dia e o resultado, como a faixa da edição, a ementa, a descrição oficial e a
 * página oficial; no painel, o plenário, com um azulejo por voto (o Plenario).
 * Embaixo, o placar, no mesmo quadro da edição, o vídeo da sessão, quando há,
 * o placar por partido e quem votou como, cada um com o seu título.
 *
 * Sem o voto de cada um, como na votação simbólica, o painel volta a ser de
 * enfeite, o quadro diz que o placar não está disponível, e quem votou como
 * explica por quê.
 *
 * Na tela larga, o corpo fica lado a lado (o Renan, em 23/11/2026, na #306): o
 * corpo-com-video e o corpo-sem-votos dizem ao CSS qual dos quatro casos
 * arrumar, e a ordem do HTML não muda. Os nomes levam o corpo- na frente: o
 * sem-votos sozinho já é a folha da página do parlamentar. O vídeo conta pelo
 * mesmo idDoVideo do VideoDaSessao: o endereço fora do contrato não abre a
 * coluna do vídeo.
 */
export function PaginaDaVotacao({
	pagina,
	filtro,
}: {
	pagina: Pagina;
	filtro: Filtro;
}) {
	if (pagina.tipo === "sem-api") {
		return <ParlamentaresIndisponiveis />;
	}
	const { votacao } = pagina;
	const titulo = tituloDaVotacao(votacao);
	const comVotos = votacao.votos.length > 0;
	const comVideo = idDoVideo(votacao.url_video) !== null;
	const oficial = votacao.url_oficial && enderecoSeguro(votacao.url_oficial);
	const ementas = votacao.proposicoes.filter((proposicao) => proposicao.ementa);
	return (
		<>
			<section
				className={
					comVotos
						? "cartaz cartaz-medio cartaz-da-votacao"
						: "cartaz cartaz-medio"
				}
			>
				{comVotos ? (
					<Plenario votos={votacao.votos} />
				) : (
					<Painel
						semente={sementeDe(`votacao-${votacao.id}`)}
						colunas={4}
						quantas={64}
						className="mural"
						sozinho
					/>
				)}
				{/* O título sai dos dados: o teto da letra grande vem da régua, com a
				    palavra mais larga dele (lib/conteudo/regua.ts). A entrelinha é a
				    da leitura (o titulo-de-folha), que aceita qualquer texto. */}
				<h1
					className="titulo-de-folha letra-com-teto"
					style={estiloDoTeto(titulo, "titulo-condensado")}
				>
					{titulo}
				</h1>
				<div className="cartaz-pe pe-da-votacao">
					<div className="faixa-da-votacao">
						<FaixaDeInformacoes>
							<span>{NOME_DA_CASA[votacao.casa]}</span>
							<span>{formatarData(votacao.data.slice(0, 10))}</span>
							<span>{RESULTADO[votacao.resultado]}</span>
						</FaixaDeInformacoes>
					</div>
					{ementas.length > 0 && (
						<div className="abertura ementas">
							{ementas.map((proposicao) => (
								<p key={nomeDaProposicao(proposicao)}>
									{votacao.proposicoes.length > 1 && (
										<strong>{nomeDaProposicao(proposicao)}: </strong>
									)}
									{proposicao.ementa}
								</p>
							))}
						</div>
					)}
					<dl className="para-quem descricao-oficial">
						<dt className="rotulo">Descrição oficial</dt>
						<dd>{votacao.descricao}</dd>
					</dl>
					<div className="cartaz-acao">
						{oficial && (
							<AcaoDeTexto
								href={oficial}
								texto="Página oficial"
								complemento="da votação"
							/>
						)}
						<p className="rotulo coletado-em">
							Coletado em {formatarData(dataEmBrasilia(votacao.coletado_em))}
						</p>
					</div>
				</div>
			</section>
			<div
				className={classes(
					"artigos corpo-dos-parlamentares corpo-da-votacao",
					comVideo && "corpo-com-video",
					!comVotos && "corpo-sem-votos",
				)}
			>
				<section
					aria-labelledby="placar"
					className="secao-dos-parlamentares placar-da-votacao"
				>
					<h2
						id="placar"
						className="subtitulo-condensado letra-com-teto [--palavra:3.26]"
					>
						Placar
					</h2>
					<QuadroDaVotacao
						votacao={{
							data: votacao.data,
							resultado: votacao.resultado,
							// O placar da página é contado dos votos gravados: sem voto
							// nenhum, ele não está disponível, e não é zero.
							placar:
								totalDaContagem(votacao.placar) > 0 ? votacao.placar : null,
						}}
						Titulo="h3"
					/>
				</section>
				<VideoDaSessao votacao={votacao} />
				{comVotos && <PlacarPorPartido grupos={votacao.placar_por_partido} />}
				<QuemVotouComo votacao={votacao} filtro={filtro} />
			</div>
		</>
	);
}
