// O que as páginas dos jogos usam do roteiro: os tipos e as funções que pedem a
// lista e a página pronta ao servidor. A leitura dos arquivos fica em
// paginas.server.ts.
export { JOGO_DAS_COMISSOES } from "./comissoes";
export type {
	Carimbo,
	Cena,
	Decisao,
	DecisaoDeOpiniao,
	DecisaoDeRegra,
	Fala,
	OpcaoDeOpiniao,
	OpcaoDeRegra,
	Painel,
	Passo,
	Relogio,
	Revelacao,
} from "./ler";
export { buscarJogo, buscarJogos } from "./paginas.functions";
export type {
	ArtigoDaCena,
	CenaNaPagina,
	JogoNaLista,
	JogoNaPagina,
} from "./paginas.server";
