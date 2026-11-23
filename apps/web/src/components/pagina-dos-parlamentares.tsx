// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { sementeDe } from "@/lib/azulejos";
import { estiloDoTeto } from "@/lib/conteudo/regua";
import { plural } from "@/lib/formatar";
import {
	enderecoDoParlamentar,
	estadoDaSigla,
	type ListaDosParlamentares,
	type ParlamentarDaLista,
} from "@/lib/parlamentares";
import { Painel } from "./azulejo";
import { EnquantoIsso } from "./pagina-das-edicoes";
import { Palavras } from "./palavras";
import { EscolhaDoEstado } from "./parlamentares/escolha-do-estado";
import { MapaDosEstados } from "./parlamentares/mapa-dos-estados";
import { Partido } from "./parlamentares/partido";
import { RetratoNaLista } from "./parlamentares/retrato-na-lista";

/** A Constituição, arts. 45 e 46: quantos deputados e senadores cada estado tem. */
const CONSTITUICAO =
	"https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988";

/**
 * Os parlamentares por estado, em /parlamentares (o Renan, em 21/11/2026: o
 * cartaz com painel de dados). O cartaz das páginas de dentro tem, no lugar do
 * painel de enfeite, o mapa do Brasil (o MapaDosEstados), e o campo
 * "Estado", que funciona sem o JavaScript. Com um estado no endereço (?uf=SC),
 * o título vira o nome dele, e embaixo vêm os deputados e os senadores em
 * exercício, cada nome com o partido e o link para a página da pessoa. No
 * celular, o painel de enfeite fica no alto, como nas outras páginas, e o mapa
 * vem depois do campo.
 */
export function PaginaDosParlamentares({
	lista,
}: {
	lista: ListaDosParlamentares;
}) {
	if (lista.tipo === "sem-api") {
		return <ParlamentaresIndisponiveis />;
	}
	const { estados, escolhido } = lista;
	const estado = escolhido && estadoDaSigla(escolhido.sigla);
	return (
		<>
			<CartazDosParlamentares
				titulo={estado ? estado.nome : "Parlamentares"}
				migalha={Boolean(estado)}
				mapa={<MapaDosEstados estados={estados} escolhido={escolhido?.sigla} />}
			>
				{estado && escolhido ? (
					<>
						<p className="abertura">
							{plural(
								escolhido.camara.length,
								"deputado federal",
								"deputados federais",
							)}{" "}
							e {plural(escolhido.senado.length, "senador", "senadores")} em
							exercício.
						</p>
						<p className="para-quem">
							O partido é o do último voto registrado. Quem ainda não tem voto
							registrado aparece com um traço.
						</p>
					</>
				) : (
					<p className="abertura">
						Escolha o seu estado. Na Câmara, cada estado tem de 8 a 70
						deputados; no Senado, sempre 3 (Constituição,{" "}
						<a href={`${CONSTITUICAO}!art45`}>
							art. 45 <span className="sr-only">da Constituição</span>
						</a>{" "}
						e{" "}
						<a href={`${CONSTITUICAO}!art46`}>
							art. 46 <span className="sr-only">da Constituição</span>
						</a>
						).
					</p>
				)}
				<div className="cartaz-acao">
					<EscolhaDoEstado escolhido={escolhido?.sigla} />
				</div>
			</CartazDosParlamentares>
			{escolhido && (
				<div className="artigos parlamentares-do-estado">
					<section aria-labelledby="camara" className="lista-da-casa">
						<h2
							id="camara"
							className="subtitulo-condensado letra-com-teto [--palavra:4.9]"
						>
							Câmara dos Deputados
						</h2>
						<NomesDaCasa nomes={escolhido.camara} />
					</section>
					<section aria-labelledby="senado" className="lista-da-casa">
						<h2
							id="senado"
							className="subtitulo-condensado letra-com-teto [--palavra:3.61]"
						>
							Senado Federal
						</h2>
						<NomesDaCasa nomes={escolhido.senado} />
					</section>
				</div>
			)}
		</>
	);
}

/**
 * As páginas dos parlamentares e das votações sem a API, como na Vercel até ela
 * ter casa: o cartaz diz que os parlamentares não aparecem neste endereço e
 * leva às trilhas, como o das edições.
 */
export function ParlamentaresIndisponiveis() {
	return (
		<CartazDosParlamentares titulo="Parlamentares">
			<p className="abertura">
				Os parlamentares ainda não aparecem neste endereço do site.
			</p>
			<EnquantoIsso />
		</CartazDosParlamentares>
	);
}

/**
 * O cartaz da lista: o painel de enfeite (no celular), a migalha de volta ao
 * mapa, o título, que tomba palavra por palavra, o pé e o mapa. A partir do lg,
 * o mapa fica no lugar do painel, nos 30% da direita.
 */
function CartazDosParlamentares({
	titulo,
	migalha = false,
	mapa,
	children,
}: {
	titulo: string;
	migalha?: boolean;
	mapa?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="cartaz cartaz-medio cartaz-dos-parlamentares">
			<Painel
				semente={sementeDe("parlamentares")}
				colunas={4}
				quantas={64}
				className={mapa ? "mural mural-do-celular" : "mural"}
				sozinho
			/>
			{migalha && (
				<nav aria-label="Caminho" className="migalhas rotulo">
					<ol>
						<li>
							<Link to="/parlamentares" activeOptions={{ exact: true }}>
								Parlamentares
							</Link>
						</li>
					</ol>
				</nav>
			)}
			{/* O nome do estado muda com o endereço: o teto da letra grande sai da
			    régua, com a palavra mais larga dele (lib/conteudo/regua.ts). */}
			<h1
				aria-label={titulo}
				className="titulo-condensado letra-com-teto"
				style={estiloDoTeto(titulo, "titulo-condensado")}
			>
				<span aria-hidden="true" className="caixa">
					<Palavras texto={titulo} />
				</span>
			</h1>
			<div className="cartaz-pe">{children}</div>
			{mapa}
		</section>
	);
}

/**
 * Os nomes de uma Casa, em ordem alfabética, cada um com o partido. Com alguma
 * foto nos dados, cada nome leva o retrato à esquerda, com o partido embaixo do
 * nome (o Renan, em 23/11/2026, na #305: "Chamada com retrato"), e o crédito da
 * Casa fica embaixo do título dela ("Uma linha por Casa"). O nome sem a foto leva
 * a moldura com o azulejo cru. A Casa sem nenhuma foto, como na API de antes da
 * #303, fica sem os retratos e sem o crédito.
 */
function NomesDaCasa({ nomes }: { nomes: ParlamentarDaLista[] }) {
	if (nomes.length === 0) {
		return <p className="sem-nomes">Nenhum nome nos dados usados.</p>;
	}
	const credito = nomes.find((parlamentar) => parlamentar.foto)?.foto?.credito;
	return (
		<>
			{credito && <p className="rotulo credito-das-fotos">Fotos: {credito}</p>}
			<ul
				role="list"
				className="nomes-da-casa"
				data-com-retratos={credito ? "" : undefined}
			>
				{nomes.map((parlamentar) => (
					<li key={parlamentar.id}>
						<Link
							to="/parlamentares/$id"
							params={{ id: enderecoDoParlamentar(parlamentar) }}
							className="nome-na-lista"
						>
							{credito && <RetratoNaLista foto={parlamentar.foto} />}
							<span className="nome">{parlamentar.nome}</span>{" "}
							<Partido sigla={parlamentar.partido} />
						</Link>
					</li>
				))}
			</ul>
		</>
	);
}
