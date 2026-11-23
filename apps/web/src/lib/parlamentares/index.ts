// O que as páginas usam dos parlamentares e das votações: os tipos e as funções
// que pedem a página pronta ao servidor. A leitura na API fica em
// parlamentares.server.ts.
export { enderecoDoParlamentar, idDaVotacao } from "./endereco";
export {
	classeDaRegiao,
	ESTADOS,
	ESTADOS_PELO_NOME,
	type Estado,
	estadoDaSigla,
	REGIOES,
	type Regiao,
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
	ParlamentarDaPagina,
	Patrimonio,
} from "./parlamentares.server";
