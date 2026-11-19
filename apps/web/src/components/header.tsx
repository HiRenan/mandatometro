import { Link, useRouterState } from "@tanstack/react-router";
import { EntradaDaBusca } from "./busca";
import { NOME_DO_SITE } from "./nome-do-site";

const LINKS = [
	{ to: "/", label: "Início" },
	{ to: "/trilhas", label: "Trilhas" },
] as const;

/** As edições da newsletter, que só aparecem onde o site tem a API. */
const EDICOES = { to: "/edicoes", label: "Edições" } as const;

function estaNaSecao(caminho: string, secao: string): boolean {
	return secao === "/"
		? caminho === "/"
		: caminho === secao || caminho.startsWith(`${secao}/`);
}

/**
 * O cabeçalho: o bloco de tinta com o nome, o lema em letra de máquina, a
 * entrada da busca e os links, e a tira das cinco fitas embaixo. É o que separa
 * o cabeçalho da página clara (o Renan, na #89: "um header bem feito"). A busca
 * fica no meio, entre o nome e os links (o Renan, na #233). Abaixo de 1312 px,
 * o lema sai, porque é largo, e está no rodapé; abaixo de 912 px, a barra da
 * busca encolhe para a lupa e o "Buscar".
 *
 * Onde o site tem a API (o API_URL), as edições entram nos links. No celular, os
 * três não cabem na linha do nome: o Início sai (o CSS, pelo data-com-edicoes), e
 * o nome leva ao início (o Renan, na #39).
 */
export default function Header({
	comEdicoes = false,
}: {
	/** Se o site tem o endereço da API e, com ele, as páginas das edições. */
	comEdicoes?: boolean;
}) {
	const caminho = useRouterState({
		select: (estado) => estado.location.pathname,
	});
	const links = comEdicoes ? [...LINKS, EDICOES] : [...LINKS];

	return (
		<header className="moldura">
			<a
				href="#conteudo"
				className="bg-papel text-tinta sr-only font-bold focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10 focus:px-4 focus:py-2"
			>
				Pular para o conteúdo
			</a>
			{/* No celular, as margens e o respiro ficam em px: com a letra grande, eles
			    não crescem, e o nome e os links ganham o espaço (o Renan, na #48:
			    "Ficam em 20 px" e "Espaço de hoje"). */}
			<div className="topo-dentro px-margem-celular md:px-margem-larga gap-y-[4px] py-[8px]">
				<div className="marca">
					<Link to="/" className={NOME_DO_SITE}>
						Mandatômetro
					</Link>
					<p className="marca-lema">o diário oficial político, simplificado</p>
				</div>
				<EntradaDaBusca />
				<nav aria-label="Principal">
					<ul
						className="topo-links"
						data-com-edicoes={comEdicoes ? "" : undefined}
					>
						{links.map(({ to, label }) => (
							<li key={to}>
								{/* O traço marca a seção inteira (data-na-secao), mas o link só
								    diz que é a página atual (aria-current) na página dele: por
								    isso o exact. */}
								<Link
									to={to}
									activeOptions={{ exact: true }}
									data-na-secao={estaNaSecao(caminho, to) ? "" : undefined}
								>
									{label}
								</Link>
							</li>
						))}
						<li>
							<a
								href="/perfil"
								data-na-secao={
									estaNaSecao(caminho, "/cadastro") ||
									caminho === "/perfil" ||
									caminho === "/login"
										? ""
										: undefined
								}
								aria-current={caminho === "/perfil" ? "page" : undefined}
							>
								Conta
							</a>
						</li>
					</ul>
				</nav>
			</div>
			<div aria-hidden="true" className="tira-de-fitas h-[6px]" />
		</header>
	);
}
