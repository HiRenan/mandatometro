/**
 * O rodapé, a moldura de baixo da folhinha: o cartão preto com a tira de fitas
 * em cima, como o cabeçalho tem a dele embaixo. Diz que o projeto foi feito
 * para o Hack Brasil, de onde vêm as explicações e onde está o código. Mora no
 * documento (__root.tsx), e por isso aparece em todas as páginas, inclusive na
 * de não encontrado e na de erro.
 */
export function Rodape() {
	return (
		<footer className="moldura bg-tinta text-papel">
			<div aria-hidden="true" className="tira-de-fitas h-[18px]" />
			{/* A partir do lg, duas colunas. A partir do xl, a do texto é a mesma da
			    coluna da direita da página inicial. */}
			<div className="mx-auto grid max-w-[1440px] gap-x-16 gap-y-6 px-5 pt-10 pb-12 md:px-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
				<p className="text-[2rem] leading-none font-black tracking-[-0.01em] [font-stretch:68%] md:text-[2.75rem]">
					Mandatômetro
				</p>
				{/* O vão entre as linhas, 12 px, é maior que os 11 px que a área de toque
				    do link passa da linha dele: um toque na linha de cima não vai para o
				    link. */}
				<div className="grid max-w-[38rem] gap-3 text-[1.0625rem] leading-snug">
					<p>
						O Mandatômetro foi feito para o Hack Brasil 2026, na trilha Acesso à
						educação.
					</p>
					<p>
						Cada explicação traz a fonte oficial: a lei, o regimento ou a página
						da Câmara e do Senado.
					</p>
					<p>
						<a
							href="https://github.com/HiRenan/mandatometro"
							className="acao-de-texto"
						>
							<span>O código é aberto, no GitHub</span>
						</a>
						.
					</p>
				</div>
			</div>
		</footer>
	);
}
