// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import type {
	DetalheParlamentar,
	MandatoPublico,
	VotoParlamentar,
} from "@/client";
import { sementeDe } from "@/lib/azulejos";
import { estiloDoTeto } from "@/lib/conteudo/regua";
import { enderecoSeguro } from "@/lib/edicoes/conteudo-da-edicao";
import { dataEmBrasilia, formatarData, plural } from "@/lib/formatar";
import {
	enderecoDoParlamentar,
	estadoDaSigla,
	type PaginaDoParlamentar as Pagina,
} from "@/lib/parlamentares";
import {
	artigoDaRegra,
	EXPLICACAO_DO_VOTO,
	NOME_DA_CASA,
	NOME_DO_VOTO,
	REGIMENTOS,
	RESULTADO,
	tituloDaVotacao,
	valoresDaContagem,
} from "@/lib/parlamentares/votos";
import { Painel } from "./azulejo";
import { FaixaDeInformacoes } from "./faixa-de-informacoes";
import { ParlamentaresIndisponiveis } from "./pagina-dos-parlamentares";
import { ARTIGO_DA_VOTACAO } from "./parlamentares/quem-votou-como";

/**
 * A página de um parlamentar, em /parlamentares/81-nome: o cartaz das páginas de
 * dentro, com o nome gigante, a Casa, o estado e o partido, e o painel de
 * enfeite, com a semente do id; embaixo, os mandatos, como a pessoa votou, com a
 * regra de cada voto e o artigo do regimento, e os votos, do mais novo para o
 * mais antigo, 20 por página. Sem voto registrado, a página explica por quê, com
 * a votação simbólica e o link da trilha.
 */
export function PaginaDoParlamentar({ pagina }: { pagina: Pagina }) {
	if (pagina.tipo === "sem-api") {
		return <ParlamentaresIndisponiveis />;
	}
	const { parlamentar, votos, total, paginas } = pagina;
	const estado = estadoDaSigla(parlamentar.uf);
	return (
		<>
			<section className="cartaz cartaz-medio cartaz-do-parlamentar">
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
				<div className="cartaz-pe">
					<FaixaDeInformacoes>
						<span>{NOME_DA_CASA[parlamentar.casa]}</span>
						{estado && <span>{estado.nome}</span>}
						{parlamentar.partido && <span>{parlamentar.partido}</span>}
					</FaixaDeInformacoes>
					{!parlamentar.partido && (
						<p className="para-quem">
							Sem partido nos dados usados: o partido vem do último voto
							registrado.
						</p>
					)}
				</div>
			</section>
			<div className="artigos corpo-dos-parlamentares">
				{parlamentar.mandatos.length > 0 && (
					<section
						aria-labelledby="mandatos"
						className="secao-dos-parlamentares"
					>
						<h2
							id="mandatos"
							className="subtitulo-condensado letra-com-teto [--palavra:4.65]"
						>
							Mandatos
						</h2>
						<ul role="list" className="mandatos">
							{parlamentar.mandatos.map((mandato) => (
								<li key={`${mandato.legislatura}-${mandato.uf}`}>
									<Mandato mandato={mandato} />
								</li>
							))}
						</ul>
					</section>
				)}
				{total === 0 ? (
					<SemVotos nome={parlamentar.nome} />
				) : (
					<>
						<ComoVotou parlamentar={parlamentar} />
						<section
							aria-labelledby="votos"
							className="secao-dos-parlamentares"
						>
							<h2
								id="votos"
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

/** Um mandato: "57ª legislatura · Santa Catarina · titular · em exercício". */
function Mandato({ mandato }: { mandato: MandatoPublico }) {
	return (
		<FaixaDeInformacoes>
			<span>{mandato.legislatura}ª legislatura</span>
			<span>{estadoDaSigla(mandato.uf)?.nome ?? mandato.uf}</span>
			{mandato.condicao && (
				<span>{mandato.condicao.toLocaleLowerCase("pt-BR")}</span>
			)}
			{mandato.em_exercicio && <span>em exercício</span>}
		</FaixaDeInformacoes>
	);
}

/**
 * Como a pessoa votou: quantas vezes cada voto aparece, com o número em tinta, e
 * o que cada um quer dizer, com o artigo do regimento da Casa dela. O Outro
 * registro só aparece quando passa de zero.
 */
function ComoVotou({ parlamentar }: { parlamentar: DetalheParlamentar }) {
	const { casa, contagem_votos: contagem } = parlamentar;
	const regimento = REGIMENTOS[casa];
	return (
		<section aria-labelledby="como-votou" className="secao-dos-parlamentares">
			<h2
				id="como-votou"
				className="subtitulo-condensado letra-com-teto [--palavra:2.82]"
			>
				Como votou
			</h2>
			<dl className="tipos-de-voto">
				{valoresDaContagem(contagem).map((valor) => {
					const artigo = artigoDaRegra(valor, casa);
					return (
						<div key={valor} className="tipo-de-voto">
							<dt className="nome-do-tipo">{NOME_DO_VOTO[valor]}</dt>
							<dd className="numero-do-tipo">{contagem[valor]}</dd>
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
				parlamentar só fica registrado na votação nominal, pelo painel
				eletrônico. Na votação simbólica, a mais comum na Câmara, o resultado
				sai sem a lista de nomes.
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
 * desenho, no edicoes.css), que funcionam sem o JavaScript. A primeira página
 * fica sem o ?pagina.
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
					className="mais-antigas acao-de-texto"
				>
					<span>Votos mais antigos</span>
				</Link>
			)}
		</nav>
	);
}
