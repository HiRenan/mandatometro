import { createServerFn } from "@tanstack/react-start";
import { indiceDoConteudo } from "./indice.server";

// A caixa da busca pede os índices ao servidor quando abre, sem o texto
// digitado: a procura roda no navegador, e o que a pessoa escreve não sai dele.
// O build troca o corpo destas funções pela chamada ao servidor, e a leitura do
// conteúdo, com o conversor de Markdown, fica fora do navegador.

/** As trilhas e os artigos, do conteúdo do build. */
export const buscarIndiceDoConteudo = createServerFn({ method: "GET" }).handler(
	() => indiceDoConteudo(),
);
