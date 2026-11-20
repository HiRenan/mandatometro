/**
 * A versão do termo de consentimento da conta: a data do texto da página /termo
 * (components/pagina-do-termo.tsx), em AAAA-MM-DD. É o lugar único dela no site.
 * A API recebe o mesmo valor no CONTA_TERMO_VERSAO, e o cadastro só abre com as
 * duas iguais (components/formulario-conta.tsx). Mude o texto e a data no mesmo
 * PR. Publique primeiro a API com a data nova e depois faça o merge para publicar
 * o site (docs/hospedagem.md, "Quando o texto do termo mudar").
 */
export const VERSAO_DO_TERMO = "2026-11-20";

/** O caminho da página do termo: o do CONTA_TERMO_URL da API e o do rodapé. */
export const ENDERECO_DO_TERMO = "/termo";
