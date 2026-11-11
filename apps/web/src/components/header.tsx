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

/** O cartão preto da folhinha, com o nome e o lema, e a tira de fitas embaixo. */
export default function Header() {
	const caminho = useRouterState({
		select: (estado) => estado.location.pathname,
	});

	return (
		<header className="moldura bg-tinta text-papel">
			<a
				href="#conteudo"
				className="bg-papel text-tinta sr-only font-bold focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10 focus:px-4 focus:py-2"
			>
				Pular para o conteúdo
			</a>
			{/* No celular, o respiro fica em px, como as margens: com a letra grande, ele
			    não cresce, e o nome e os links ganham o espaço (o Renan, na #48:
			    "Espaço de hoje"). */}
			<div className="px-margem-celular mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-8 gap-y-[12px] py-[16px] md:min-h-24 md:px-16 md:py-3">
				<div className="flex flex-wrap items-baseline gap-x-5 gap-y-[4px]">
					<Link to="/" className={`${NOME_DO_SITE} no-underline`}>
						Mandatômetro
					</Link>
					<p className="text-[0.9375rem] font-medium md:text-[1.0625rem]">
						o diário oficial político, simplificado
					</p>
				</div>
				<nav aria-label="Principal">
					<ul className="flex gap-7 md:gap-9">
						{links.map(({ to, label }) => (
							<li key={to}>
								{/* O traço marca a seção inteira, mas o link só diz que é a
								    página atual (aria-current) na página dele: por isso o exact. */}
								<Link
									to={to}
									activeOptions={{ exact: true }}
									className={`hover:border-fita-amarela border-b-4 pb-1 text-[1.0625rem] font-bold no-underline md:text-[1.1875rem] ${estaNaSecao(caminho, to) ? "border-papel" : "border-transparent"}`}
								>
									{label}
								</Link>
							</li>
						))}
					</ul>
				</nav>
			</div>
			<div aria-hidden="true" className="tira-de-fitas h-[18px]" />
		</header>
	);
}
