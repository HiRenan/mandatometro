// O que as páginas usam do conteúdo: os tipos e as funções que pedem a página
// pronta ao servidor. A leitura dos arquivos fica em paginas.server.ts.
export type { Fonte, Infografico } from "./ler";
export {
	buscarArtigo,
	buscarInicio,
	buscarQuiz,
	buscarQuizFinal,
	buscarTrilha,
	buscarTrilhas,
} from "./paginas.functions";
export type {
	ArtigoNaLista,
	ArtigoNaTrilha,
	CaminhoNaInicial,
	ChamadaDoQuiz,
	PaginaInicial,
	PerguntaNaPagina,
	QuizNaPagina,
	TrilhaNaLista,
} from "./paginas.server";
