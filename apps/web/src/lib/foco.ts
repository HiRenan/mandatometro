/**
 * Leva o foco para o título da página que está na tela, ou para o main se ela
 * não tiver h1: quem usa o teclado continua dali, e o leitor de tela anuncia a
 * página. O título não é um controle, então não ganha o anel de foco (index.css).
 */
export function focarNoTitulo() {
	const titulo = document.querySelector<HTMLElement>("#conteudo h1");
	if (titulo) {
		titulo.tabIndex = -1;
	}
	(titulo ?? document.getElementById("conteudo"))?.focus({
		preventScroll: true,
	});
}
