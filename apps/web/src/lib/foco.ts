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

/** O título que recebe o foco ao paginar os votos de um parlamentar. */
export const TRECHO_DOS_VOTOS = "votos";

/** O que a regra abaixo lê de cada endereço (o `ParsedLocation` do router). */
type Endereco = {
	pathname: string;
	search: { uf?: unknown; pagina?: unknown };
	hash?: string;
};

/**
 * Se a navegação abriu outra página: outro caminho ou, na lista dos
 * parlamentares, outro estado (?uf), que traz outro título e outros nomes no
 * mesmo caminho. No perfil, a paginação dos votos muda a lista e leva o foco
 * ao título dela (#votos). O filtro da votação (?uf e ?partido) só troca
 * a lista da mesma página, e o foco fica no botão do filtro. Sem a página de
 * antes, conta como outra, como o `pathChanged` do router.
 */
export function outraPagina(de: Endereco | undefined, para: Endereco) {
	if (!de || de.pathname !== para.pathname) {
		return true;
	}
	if (
		para.pathname.startsWith("/parlamentares/") &&
		para.hash === TRECHO_DOS_VOTOS
	) {
		return de.search.pagina !== para.search.pagina;
	}
	return para.pathname === "/parlamentares" && de.search.uf !== para.search.uf;
}
