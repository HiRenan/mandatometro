// O que a página do jogo usa do roteiro: os tipos e a função que pede a página
// pronta ao servidor. A leitura dos arquivos fica em paginas.server.ts.
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
export { buscarJogo } from "./paginas.functions";
export type {
	ArtigoDaCena,
	CenaNaPagina,
	JogoNaPagina,
} from "./paginas.server";
