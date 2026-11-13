import { Link, useRouterState } from "@tanstack/react-router";
import { NOME_DO_SITE } from "./nome-do-site";

const links = [
	{ to: "/", label: "Início" },
	{ to: "/trilhas", label: "Trilhas" },
] as const;

function estaNaSecao(caminho: string, secao: string): boolean {
	return secao === "/"
		? caminho === "/"
		: caminho === secao || caminho.startsWith(`${secao}/`);
}

/**
 * O cabeçalho: o bloco de tinta com o nome, o lema em letra de máquina e os
 * links, e a tira das cinco fitas embaixo. É o que separa o cabeçalho da página
 * clara (o Renan, na #89: "um header bem feito"). Abaixo de 864 px, ficam só o
 * nome e os links: o lema, que é largo, está no rodapé.
 */
export default function Header() {
	const caminho = useRouterState({
		select: (estado) => estado.location.pathname,
	});

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
				<nav aria-label="Principal">
					<ul className="topo-links">
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
					</ul>
				</nav>
			</div>
			<div aria-hidden="true" className="tira-de-fitas h-[6px]" />
		</header>
	);
}
