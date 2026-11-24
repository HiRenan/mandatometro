// O que as páginas usam das edições: os tipos e as funções que pedem a página
// pronta ao servidor. A leitura na API fica em edicoes.server.ts.
export { buscarEdicao, buscarEdicoes } from "./edicoes.functions";
export type { EdicaoDaPagina, PaginaDaLista } from "./edicoes.server";
export { paginaDaBusca } from "./pagina";
