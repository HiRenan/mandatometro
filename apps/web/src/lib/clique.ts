/**
 * O `onClick` de um botão que vira outro no mesmo lugar, como o "Recomeçar o
 * quiz", o "Recomeçar a trilha" e o "Desmarcar" do artigo, que viram
 * "Desfazer". Num clique duplo, o segundo clique cairia no botão novo e
 * desmancharia o primeiro.
 *
 * O navegador conta os cliques no `detail`: 1 num clique ou num toque, 2 no
 * segundo clique de um clique duplo, e 0 no Enter e no espaço (num link, o
 * Enter do Firefox vem com o 1). O botão só age até o 1: quem clica em
 * "Desfazer" de propósito, depois de ler o botão, manda um clique novo, com o
 * `detail` 1.
 */
export function semCliqueDuplo(
	fazer: () => void,
): (evento: { detail: number }) => void {
	return (evento) => {
		if (evento.detail <= 1) {
			fazer();
		}
	};
}

/**
 * O `onClick` de um link que nasce no lugar de um botão, como os da conclusão
 * das telas da conta: o segundo clique de um clique duplo no botão, e o
 * terceiro de um clique triplo, não seguem o link. Um clique novo, de
 * propósito, segue.
 */
export function semSegundoClique(evento: {
	detail: number;
	preventDefault: () => void;
}) {
	if (evento.detail > 1) {
		evento.preventDefault();
	}
}
