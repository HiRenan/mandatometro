// O que as páginas dos jogos usam do roteiro: os tipos e as funções que pedem a
// lista e a página pronta ao servidor. A leitura dos arquivos fica em
// paginas.server.ts.
export type { Decisao, Painel, Passo, Relogio, Versoes } from "./ler";
export { buscarJogo, buscarJogos } from "./paginas.functions";
export type { CenaNaPagina, JogoNaLista, JogoNaPagina } from "./paginas.server";
