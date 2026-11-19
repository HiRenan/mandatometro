// O que a caixa da busca usa: as funções que pedem os índices ao servidor, a
// procura e os tipos. A montagem dos índices fica nos arquivos .server.ts.
export {
	buscarIndiceDasEdicoes,
	buscarIndiceDoConteudo,
} from "./busca.functions";
export type {
	ArtigoNaBusca,
	EdicaoNaBusca,
	PaginaNaBusca,
	TrilhaNaBusca,
} from "./paginas-na-busca";
export {
	type DocumentoPreparado,
	type Pedaco,
	prepararIndice,
	procurar,
	type Resultado,
	termosDaBusca,
} from "./procurar";
