import { Link } from "@tanstack/react-router";

const links = [
	{ to: "/", label: "Início", exato: true },
	{ to: "/trilhas", label: "Trilhas", exato: false },
] as const;

/** O cartão preto da folhinha, com o nome e o lema, e a tira de fitas embaixo. */
export default function Header() {
	return (
		<header className="moldura bg-tinta text-papel">
			<a
				href="#conteudo"
				className="bg-papel text-tinta sr-only font-bold focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10 focus:px-4 focus:py-2"
			>
				Pular para o conteúdo
			</a>
			<div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-4 md:min-h-24 md:px-16 md:py-3">
				<div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
					<Link
						to="/"
						className="text-[2rem] leading-none font-black tracking-[-0.01em] [font-stretch:68%] no-underline md:text-[2.75rem]"
					>
						Mandatômetro
					</Link>
					<p className="text-[0.9375rem] font-medium md:text-[1.0625rem]">
						o diário oficial político, simplificado
					</p>
				</div>
				<nav aria-label="Principal">
					<ul className="flex gap-7 md:gap-9">
						{links.map(({ to, label, exato }) => (
							<li key={to}>
								<Link
									to={to}
									activeOptions={{ exact: exato }}
									className="hover:border-fita-amarela data-[status=active]:border-papel border-b-4 border-transparent pb-1 text-[1.0625rem] font-bold no-underline md:text-[1.1875rem]"
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
