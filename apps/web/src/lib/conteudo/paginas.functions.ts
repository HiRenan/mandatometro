import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	acharArtigo,
	acharTrilha,
	inicio,
	listarTrilhas,
	trilhas,
} from "./paginas.server";

// Os loaders das páginas chamam estas funções. No servidor, elas rodam direto;
// numa navegação dentro do site, o navegador pede a página pronta ao servidor.
// O build troca o corpo delas por essa chamada, e a leitura dos arquivos, com o
// zod, o js-yaml e o markdown-to-jsx, fica fora do navegador.

function texto(valor: unknown): string {
	return typeof valor === "string" ? valor : "";
}

export const buscarTrilhas = createServerFn({ method: "GET" }).handler(() =>
	listarTrilhas(trilhas),
);

export const buscarInicio = createServerFn({ method: "GET" }).handler(() => {
	const pagina = inicio(trilhas);
	// O conteúdo sempre tem a trilha do processo legislativo, e o teste
	// (paginas.test.ts) confere. Sem ela, a página de erro aparece.
	if (!pagina) {
		throw new Error("O conteúdo não tem a trilha da página inicial.");
	}
	return pagina;
});

export const buscarTrilha = createServerFn({ method: "GET" })
	.validator((dados: { trilha: string }) => ({ trilha: texto(dados?.trilha) }))
	.handler(({ data }) => {
		const trilha = acharTrilha(trilhas, data.trilha);
		if (!trilha) {
			throw notFound();
		}
		return trilha;
	});

export const buscarArtigo = createServerFn({ method: "GET" })
	.validator((dados: { trilha: string; artigo: string }) => ({
		trilha: texto(dados?.trilha),
		artigo: texto(dados?.artigo),
	}))
	.handler(({ data }) => {
		const artigo = acharArtigo(trilhas, data.trilha, data.artigo);
		if (!artigo) {
			throw notFound();
		}
		return artigo;
	});
