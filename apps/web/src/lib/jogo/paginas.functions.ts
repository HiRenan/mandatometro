import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { acharJogo, JOGO_DAS_COMISSOES, jogos } from "./paginas.server";

// O loader da rota /jogos chama esta função. No servidor ela roda direto; numa
// navegação dentro do site, o navegador pede a página pronta ao servidor. O
// build troca o corpo dela por essa chamada, e a leitura dos arquivos, com o
// zod e o js-yaml, fica fora do navegador.

// Só pede o roteiro: o que a pessoa escolheu fica no navegador e não vem aqui.
export const buscarJogo = createServerFn({ method: "GET" }).handler(() => {
	const jogo = acharJogo(jogos, JOGO_DAS_COMISSOES);
	if (!jogo) {
		throw notFound();
	}
	return jogo;
});
