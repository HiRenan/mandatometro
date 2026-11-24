// O que as páginas usam dos parlamentares e das votações: os tipos e as funções
// que pedem a página pronta ao servidor. A leitura na API fica em
// parlamentares.server.ts.
export { enderecoDoParlamentar } from "./endereco";
export {
	classeDaRegiao,
	ESTADOS,
	ESTADOS_PELO_NOME,
	type Estado,
	estadoDaSigla,
	REGIOES,
	ufDaBusca,
} from "./estados";
export {
	buscarParlamentar,
	buscarParlamentares,
	buscarVotacao,
} from "./parlamentares.functions";
export type {
	ContagemDoEstado,
	ListaDosParlamentares,
	PaginaDaVotacao,
	PaginaDoParlamentar,
	ParlamentarDaLista,
	ParlamentarDaPagina,
	Patrimonio,
} from "./parlamentares.server";
