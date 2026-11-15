import { Link } from "@tanstack/react-router";
import { sementeDe } from "@/lib/azulejos";
import { Painel } from "./azulejo";
import { BOTAO_CONTINUAR } from "./botao-continuar";

/** A página de não encontrado, para trilha, artigo ou endereço que não existe. */
export function NaoEncontrado() {
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
							to="/trilhas"
							activeOptions={{ exact: true }}
							className={BOTAO_CONTINUAR}
						>
							Ver as trilhas
						</Link>
					</li>
					<li>
						<Link
							to="/"
							activeOptions={{ exact: true }}
							className="acao-de-texto"
						>
							<span>Ir para o início</span>
						</Link>
					</li>
				</ul>
			</div>
		</section>
	);
}
