import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { acharJogo, jogos, listarJogos } from "./paginas.server";

// Os loaders das rotas /jogos e /jogos/<jogo> chamam estas funções. No servidor
// elas rodam direto; numa navegação dentro do site, o navegador pede a página
// pronta ao servidor. O build troca o corpo delas por essa chamada, e a leitura
// dos arquivos, com o zod e o js-yaml, fica fora do navegador.

/** A lista de /jogos: só o que a folha de cada jogo mostra. */
export const buscarJogos = createServerFn({ method: "GET" }).handler(() =>
	listarJogos(jogos),
);

// Só pede o roteiro: o que a pessoa escolheu fica no navegador e não vem aqui.
// O endereço que não é de um jogo dá a página não encontrada.
export const buscarJogo = createServerFn({ method: "GET" })
	.validator((dados: { jogo: string }) => ({
		jogo: typeof dados?.jogo === "string" ? dados.jogo : "",
	}))
	.handler(({ data }) => {
		const jogo = acharJogo(jogos, data.jogo);
		if (!jogo) {
			throw notFound();
		}
		return jogo;
	});
