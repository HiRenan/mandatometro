import { createServerFn } from "@tanstack/react-start";
import { paginaDaBusca } from "@/lib/edicoes/pagina";
import { ufDaBusca } from "./estados";
import {
	lerParlamentar,
	lerParlamentares,
	lerVotacao,
} from "./parlamentares.server";

// Os loaders das páginas dos parlamentares e das votações chamam estas funções.
// No servidor, elas rodam direto; numa navegação dentro do site, o navegador
// pede a página pronta ao servidor. Quem fala com a API é sempre o servidor: a
// falha vira o erro genérico do parlamentares.server.ts, e o navegador não
// recebe a mensagem original.

export const buscarParlamentares = createServerFn({ method: "GET" })
	.validator((dados: { uf?: string }) => ({ uf: ufDaBusca(dados?.uf) }))
	.handler(({ data }) => lerParlamentares(data.uf));

// O fim do endereço segue como veio: o lerParlamentar confere e dá a página não
// encontrada sem chamar a API quando ele não pode ser de um parlamentar.
export const buscarParlamentar = createServerFn({ method: "GET" })
	.validator((dados: { id: string; pagina?: number }) => ({
		id: typeof dados?.id === "string" ? dados.id : "",
		pagina: paginaDaBusca(dados?.pagina) ?? 1,
	}))
	.handler(({ data }) => lerParlamentar(data.id, data.pagina));

export const buscarVotacao = createServerFn({ method: "GET" })
	.validator((dados: { id: string }) => ({
		id: typeof dados?.id === "string" ? dados.id : "",
	}))
	.handler(({ data }) => lerVotacao(data.id));
