/**
 * Leva o foco para o título da página que está na tela, ou para o main se ela
 * não tiver h1: quem usa o teclado continua dali, e o leitor de tela anuncia a
 * página. O título não é um controle, então não ganha o anel de foco (index.css).
 *
 * Quando o endereço aponta para um trecho do conteúdo (o `trecho`, o #caminho do
 * link da página inicial), o foco vai para esse trecho, como o navegador faz ao
 * abrir o endereço: a página já rolou até ele, e o Tab seguinte continua dali,
 * sem voltar ao topo.
 */
export function focarNoTitulo(trecho?: string) {
	const conteudo = document.getElementById("conteudo");
	const doTrecho = trecho ? document.getElementById(trecho) : null;
	const alvo =
		(doTrecho && conteudo?.contains(doTrecho) ? doTrecho : null) ??
		conteudo?.querySelector<HTMLElement>("h1");
	if (alvo) {
		alvo.tabIndex = -1;
	}
	(alvo ?? conteudo)?.focus({ preventScroll: true });
}
