import { Link } from "@tanstack/react-router";

/** A página de não encontrado, para trilha, artigo ou endereço que não existe. */
export function NaoEncontrado() {
	return (
		<div className="mx-auto grid max-w-[1440px] gap-x-14 px-5 pt-10 pb-20 md:px-16 xl:grid-cols-[292px_minmax(0,700px)]">
			<p aria-hidden="true" className="numeral text-[7rem] xl:text-[13rem]">
				404
			</p>
			<div className="mt-6 xl:mt-4">
				<h1 className="titulo-condensado text-[2.5rem] md:text-[3.5rem] xl:text-[4.75rem]">
					Página não encontrada
				</h1>
				<p className="mt-5 max-w-[40ch] font-serif text-xl leading-snug xl:text-[1.5625rem]">
					O endereço pode ter mudado ou ter sido digitado com algum erro.
				</p>
				<ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-[1.1875rem] font-bold">
					<li>
						<Link to="/trilhas">Ver as trilhas</Link>
					</li>
					<li>
						<Link to="/">Ir para o início</Link>
					</li>
				</ul>
			</div>
		</div>
	);
}
