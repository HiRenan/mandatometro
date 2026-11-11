import { Link } from "@tanstack/react-router";

/** A página de não encontrado, para trilha, artigo ou endereço que não existe. */
export function NaoEncontrado() {
	// Abaixo do xl, uma coluna da largura da tela: com a letra grande, uma palavra
	// comprida não alarga a página.
	return (
		<div className="px-margem-celular mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-x-14 pt-10 pb-20 md:px-16 xl:grid-cols-[292px_minmax(0,700px)]">
			<p aria-hidden="true" className="numeral text-[7rem] xl:text-[13rem]">
				404
			</p>
			<div className="mt-6 xl:mt-4">
				{/* Com a letra grande, o título cresce até "encontrada" encostar nas
				    margens (o letra-com-teto do index.css). */}
				<h1 className="titulo-condensado letra-com-teto [--letra:2.5rem] [--palavra:4.33] md:text-[3.5rem] xl:text-[4.75rem]">
					Página não encontrada
				</h1>
				<p className="mt-5 max-w-[40ch] font-serif text-xl leading-snug xl:text-[1.5625rem]">
					O endereço pode ter mudado ou ter sido digitado com algum erro.
				</p>
				<ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-[1.1875rem] font-bold">
					<li>
						{/* Exato: num endereço como /trilhas/x, o link não é a página atual. */}
						<Link to="/trilhas" activeOptions={{ exact: true }}>
							Ver as trilhas
						</Link>
					</li>
					<li>
						<Link to="/" activeOptions={{ exact: true }}>
							Ir para o início
						</Link>
					</li>
				</ul>
			</div>
		</div>
	);
}
