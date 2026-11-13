/**
 * O `onClick` de um botão que vira outro no mesmo lugar, como o "Recomeçar o
 * quiz" e o "Recomeçar a trilha", que viram "Desfazer". Num clique duplo, o
 * segundo clique cairia no botão novo e desmancharia o primeiro.
 *
 * O navegador conta os cliques no `detail`: 1 num clique ou num toque, 2 no
 * segundo clique de um clique duplo, e 0 no Enter e no espaço. O botão só age
 * até o 1: quem clica em "Desfazer" de propósito, depois de ler o botão, manda
 * um clique novo, com o `detail` 1.
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
