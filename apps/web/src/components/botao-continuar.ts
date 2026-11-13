/**
 * O botão "Continuar" (DESIGN.md): o bloco reto de tinta, a única ação em bloco
 * das páginas, na trilha, na página inicial e no quiz. O desenho está no index.css
 * (o botao): a tira das cinco fitas aparece embaixo quando o ponteiro passa, e,
 * com a letra grande, a seta vem logo depois da última palavra, com o respiro dos
 * lados em 18 px (o Renan, na #76: "Seta no fim, respiro fixo").
 */
export const BOTAO_CONTINUAR = "botao";

/**
 * A seta do botão "Continuar": com a letra grande, ela segue a última palavra. Entre
 * a palavra e a seta vai um espaço ({" "} antes da seta), e não uma margem: quando a
 * seta desce sozinha para a linha de baixo, o espaço fica no fim da linha de cima, e
 * a seta começa alinhada com o texto. No flex, a partir de 20rem, o espaço no fim do
 * texto não conta, e o vão continua o do botão. Quando o ponteiro passa, a seta
 * anda um pouco (estilos/movimento.css).
 */
export const SETA_DO_BOTAO = "seta";
