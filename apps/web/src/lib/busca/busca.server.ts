import type { EdicaoPublica } from "@/client";
import { lerEdicoesDaBusca } from "@/lib/edicoes/edicoes.server";
import { formatarPeriodo } from "@/lib/formatar";
import type { EdicaoNaBusca } from "./paginas-na-busca";

// O índice das edições para a busca: as mais novas, lidas na API pelo
// lerEdicoesDaBusca e guardadas na memória do servidor. Uma edição nova entra na
// busca em até 5 minutos. A falha não fica guardada: ela vira o erro genérico do
// edicoes.server.ts, e o pedido seguinte tenta de novo.

/** Quanto tempo o servidor guarda o índice antes de ler a API de novo. */
export const TEMPO_NA_MEMORIA = 5 * 60 * 1000;

export type IndiceDasEdicoes =
	| { tipo: "sem-api" }
	| { tipo: "edicoes"; paginas: EdicaoNaBusca[] };

/** A edição na busca: o período no resumo, e cada item numa seção, com o link dele. */
function naBusca(edicao: EdicaoPublica): EdicaoNaBusca {
	return {
		tipo: "edicao",
		endereco: `/edicoes/${edicao.id}`,
		titulo: edicao.titulo,
		resumo: formatarPeriodo(edicao.inicio, edicao.fim),
		abertura: edicao.itens.map((item) => item.titulo).join(" · "),
		inicio: edicao.inicio,
		fim: edicao.fim,
		secoes: edicao.itens.map((item) => ({
			id: `item-${item.ordem}`,
			titulo: item.titulo,
			texto: item.texto.replace(/\s+/g, " ").trim(),
		})),
	};
}

async function montar(): Promise<IndiceDasEdicoes> {
	const lidas = await lerEdicoesDaBusca();
	return lidas.tipo === "sem-api"
		? lidas
		: { tipo: "edicoes", paginas: lidas.edicoes.map(naBusca) };
}

let guardado: { indice: IndiceDasEdicoes; ate: number } | undefined;
let lendo: Promise<IndiceDasEdicoes> | undefined;

/**
 * O índice das edições, da memória ou da API. Os pedidos que chegam durante uma
 * leitura esperam por ela, e a API não recebe as mesmas chamadas duas vezes.
 */
export async function indiceDasEdicoes(): Promise<IndiceDasEdicoes> {
	if (guardado && Date.now() < guardado.ate) {
		return guardado.indice;
	}
	lendo ??= montar()
		.then((indice) => {
			guardado = { indice, ate: Date.now() + TEMPO_NA_MEMORIA };
			return indice;
		})
		.finally(() => {
			lendo = undefined;
		});
	return lendo;
}
