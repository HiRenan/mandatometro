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

/** O que a regra abaixo lê de cada endereço (o `ParsedLocation` do router). */
type Endereco = { pathname: string; search: { uf?: unknown } };

/**
 * Se a navegação abriu outra página: outro caminho ou, na lista dos
 * parlamentares, outro estado (?uf), que traz outro título e outros nomes no
 * mesmo caminho. O filtro da votação (?uf e ?partido em /votacoes/139) só troca
 * a lista da mesma página, e o foco fica no botão do filtro. Sem a página de
 * antes, conta como outra, como o `pathChanged` do router.
 */
export function outraPagina(de: Endereco | undefined, para: Endereco) {
	if (!de || de.pathname !== para.pathname) {
		return true;
	}
	return para.pathname === "/parlamentares" && de.search.uf !== para.search.uf;
}
