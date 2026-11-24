import { Link } from "@tanstack/react-router";
import { LinkDeAcao } from "@/components/acao-de-texto";
import { sementeDe } from "@/lib/azulejos";
import { Painel } from "./azulejo";
import { BOTAO_CONTINUAR } from "./botao-continuar";

/** A página de não encontrado, para trilha, artigo ou endereço que não existe. */
export function NaoEncontrado() {
	return <PaginaNaoEncontrada para="/trilhas" texto="Ver as trilhas" />;
}

/**
 * A página de não encontrado das edições: a edição que não existe, o rascunho,
 * o endereço que não pode ser de uma edição e a página da lista depois da
 * última. Ela leva de volta à lista.
 */
export function EdicaoNaoEncontrada() {
	return <PaginaNaoEncontrada para="/edicoes" texto="Ver as edições" />;
}

/**
 * A página de não encontrado dos parlamentares e das votações: o parlamentar ou
 * a votação que não existe, o endereço que não pode ser de um deles e a página
 * de votos depois da última. Ela leva à lista dos parlamentares.
 */
export function ParlamentarNaoEncontrado() {
	return (
		<PaginaNaoEncontrada para="/parlamentares" texto="Ver os parlamentares" />
	);
}

/** O cartaz do 404, com a ação principal de cada lugar do site e o início. */
function PaginaNaoEncontrada({
	para,
	texto,
}: {
	para: "/trilhas" | "/edicoes" | "/parlamentares";
	texto: string;
}) {
	return (
		<section className="cartaz cartaz-medio">
			<Painel
				semente={sementeDe("404")}
				colunas={4}
				quantas={64}
				className="mural"
				sozinho
			/>
			{/* Cada algarismo leva a cor de uma fita, pela ordem. É só desenho: o
			    título diz o que aconteceu. */}
			<p aria-hidden="true" className="numero-404">
				<span className="numeral fita-verde">4</span>
				<span className="numeral fita-amarela">0</span>
				<span className="numeral fita-azul">4</span>
			</p>
			{/* Com a letra grande, o título cresce até "ENCONTRADA" encostar nas
			    margens (o letra-com-teto do index.css). */}
			<h1 className="titulo-condensado letra-com-teto [--palavra:5.15]">
				Página não encontrada
			</h1>
			<div className="cartaz-pe">
				<p className="abertura">
					O endereço pode ter mudado ou ter sido digitado com algum erro.
				</p>
				<ul className="acoes-da-pagina">
					<li>
						{/* Exato: num endereço como /trilhas/x, o link não é a página atual. */}
						<Link
							to={para}
							activeOptions={{ exact: true }}
							className={BOTAO_CONTINUAR}
						>
							{texto}
						</Link>
					</li>
					<li>
						<LinkDeAcao
							to="/"
							activeOptions={{ exact: true }}
							texto="Ir para o início"
						/>
					</li>
				</ul>
			</div>
		</section>
	);
}
