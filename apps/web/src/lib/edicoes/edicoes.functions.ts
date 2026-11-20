import { createServerFn } from "@tanstack/react-start";
import { lerEdicao, lerEdicoes } from "./edicoes.server";
import { paginaDaBusca } from "./pagina";

// Os loaders das páginas das edições chamam estas funções. No servidor, elas rodam
// direto; numa navegação dentro do site, o navegador pede a página pronta ao
// servidor, e o build troca o corpo delas por essa chamada. Quem fala com a API
// é sempre o servidor: a falha vira o erro genérico do edicoes.server.ts, e o
// navegador não recebe a mensagem original.

export const buscarEdicoes = createServerFn({ method: "GET" })
	.validator((dados: { pagina?: number }) => ({
		pagina: paginaDaBusca(dados?.pagina) ?? 1,
	}))
	.handler(({ data }) => lerEdicoes(data.pagina));

// O id segue como veio: o lerEdicao confere e dá a página não encontrada sem
// chamar a API quando ele não pode ser de uma edição.
export const buscarEdicao = createServerFn({ method: "GET" })
	.validator((dados: { id: string }) => ({
		id: typeof dados?.id === "string" ? dados.id : "",
	}))
	.handler(({ data }) => lerEdicao(data.id));
