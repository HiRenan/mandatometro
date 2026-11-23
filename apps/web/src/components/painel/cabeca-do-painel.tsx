// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";

/**
 * O alto das duas páginas do painel: a migalha "Conta", para o /perfil, e as
 * páginas do painel, "Números" e "Revisão da edição", em Label, com a página
 * aberta sem link e em tinta suave, como na migalha. Da largura de 40rem para
 * cima, as páginas ficam na linha da migalha, à direita; abaixo, embaixo dela
 * (estilos/painel.css). Na revisão com alterações por salvar, o link "Números"
 * passa pelo aviso "Sair sem salvar?", como os outros links do site.
 */
export function CabecaDoPainel({ atual }: { atual: "numeros" | "revisao" }) {
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
