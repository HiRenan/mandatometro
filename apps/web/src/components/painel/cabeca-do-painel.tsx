// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";

/**
 * O alto do painel traz a migalha "Conta" e os links em Label. A página aberta
 * fica em tinta suave. A partir de 40rem, os links ficam na linha da migalha,
 * à direita. Na revisão com alterações por salvar, eles passam pelo aviso
 * "Sair sem salvar?", como os outros links do site.
 */
export function CabecaDoPainel({
	atual,
}: {
	atual: "numeros" | "opinioes" | "revisao";
}) {
	return (
		<div className="cabeca-do-painel">
			<nav aria-label="Caminho" className="migalhas rotulo">
				<ol>
					<li>
						<Link to="/perfil">Conta</Link>
					</li>
				</ol>
			</nav>
			<nav aria-label="Páginas do painel" className="migalhas rotulo">
				<ul role="list" className="paginas-do-painel">
					<li>
						{atual === "numeros" ? (
							<span aria-current="page">Números</span>
						) : (
							<Link to="/painel/numeros">Números</Link>
						)}
					</li>
					<li>
						{atual === "opinioes" ? (
							<span aria-current="page">Opiniões</span>
						) : (
							<Link to="/painel/opinioes">Opiniões</Link>
						)}
					</li>
					<li>
						{atual === "revisao" ? (
							<span aria-current="page">Revisão da edição</span>
						) : (
							<Link to="/painel" activeOptions={{ exact: true }}>
								Revisão da edição
							</Link>
						)}
					</li>
				</ul>
			</nav>
		</div>
	);
}
