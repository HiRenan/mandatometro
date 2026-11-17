// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	notFound,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EdicaoPublica } from "@/client";
import { tetoDoTitulo } from "@/lib/conteudo/regua";
import type { EdicaoDaPagina } from "@/lib/edicoes";
import {
	edicaoDeExemplo,
	FONTE_DA_PROPOSICAO,
	FONTE_DA_VOTACAO,
	FONTE_DE_EDICAO_ANTIGA,
	FONTE_DO_SENADO,
} from "@/lib/edicoes/exemplos-de-teste";
import { classeDaFita, posicaoDaSemana } from "@/lib/formatar";
import { Route } from "@/routes/edicoes/$id";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));

beforeEach(() => {
	// O jsdom não rola a janela.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const TITULO = "Jornal legislativo — 09 a 15/11/2026";

/**
 * A edição num site de mentira. A rota entra na árvore como no routeTree.gen.ts,
 * e os dados vêm prontos, sem a função do servidor.
 */
async function abrir(dados: () => EdicaoDaPagina, titulo = TITULO) {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/edicoes/$id",
		path: "/edicoes/$id",
		getParentRoute: () => raiz,
		loader: () => dados(),
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		history: createMemoryHistory({ initialEntries: ["/edicoes/7"] }),
	});
	render(<RouterProvider router={router} />);
	return screen.findByRole("heading", { level: 1, name: titulo });
}

/** A edição de exemplo, com uma mudança. */
function edicao(mudar: (edicao: EdicaoPublica) => void = () => {}) {
	const exemplo = edicaoDeExemplo();
	mudar(exemplo);
	return (): EdicaoDaPagina => ({ tipo: "edicao", edicao: exemplo });
}

/** O item de número `ordem`, pela seção dele. */
function item(ordem: number): HTMLElement {
	const secao = document.getElementById(`item-${ordem}`);
	if (!secao) {
		throw new Error(`não achei o item ${ordem}`);
	}
	return secao;
}

/** Os pares de termo e definição de um trecho da página, como o leitor de tela lê. */
function definicoes(elemento: HTMLElement): [string, string][] {
	return Array.from(elemento.querySelectorAll("dt"), (termo) => [
		termo.textContent ?? "",
		termo.nextElementSibling?.textContent ?? "",
	]);
}

/**
 * Os links de um trecho da página, com o nome que o leitor de tela ouve e o
 * destino. O nome sai da conta do Testing Library, a mesma do getByRole: o
 * que fica escondido do leitor de tela (o aria-hidden) não entra, e o que é
 * só dele (o sr-only) entra.
 */
function links(trecho: HTMLElement = document.body): [string, string][] {
	const achados: [string, string][] = [];
	within(trecho).queryAllByRole("link", {
		name: (nome, link) => {
			achados.push([nome, link.getAttribute("href") ?? ""]);
			return true;
		},
	});
	return achados;
}

/** O texto de um elemento como a tela mostra: sem o que é só do leitor de tela. */
function textoAVista(elemento: HTMLElement): string {
	const copia = elemento.cloneNode(true) as HTMLElement;
	for (const escondido of copia.querySelectorAll(".sr-only")) {
		escondido.remove();
	}
	return (copia.textContent ?? "").trim();
}

describe("a página de uma edição", () => {
	it("mostra o título com o teto, a faixa com a semana e a publicação, e os itens na ordem", async () => {
		// A API manda os itens fora da ordem: a página segue o `ordem` de cada um.
		const titulo = await abrir(
			edicao((exemplo) => {
				exemplo.itens.reverse();
			}),
		);

		expect(titulo.style.getPropertyValue("--palavra")).toBe(
			String(tetoDoTitulo(TITULO, "titulo-condensado")),
		);
		const faixa = document.querySelector(".artigo-folha > .faixa");
		expect(
			Array.from(faixa?.children ?? [], (parte) => parte.textContent),
		).toEqual([
			"9 a 15 de novembro de 2026",
			"Publicada em 16 de novembro",
			"3 itens",
		]);
		expect(
			Array.from(
				document.querySelectorAll("section.item-da-edicao h2"),
				(titulo) => titulo.textContent,
			),
		).toEqual([
			"Câmara aprova a semana das bibliotecas escolares",
			"Senado vota um requerimento",
			"Um item de uma edição antiga",
		]);
	});

	it("a cor da folha é a da semana, a mesma da lista, e o desenho fica fora do leitor de tela", async () => {
		await abrir(edicao());
		const folha = document.querySelector("article.artigo-folha");

		expect(
			folha?.classList.contains(classeDaFita(posicaoDaSemana("2026-11-15"))),
		).toBe(true);
		expect(
			folha?.querySelector(".do-artigo")?.getAttribute("aria-hidden"),
		).toBe("true");
	});

	it("o caminho leva à lista das edições, sem repetir o período", async () => {
		await abrir(edicao());
		const caminho = screen.getByRole("navigation", { name: "Caminho" });

		expect(
			within(caminho)
				.getByRole("link", { name: "Edições" })
				.getAttribute("href"),
		).toBe("/edicoes");
		// O título padrão já traz o período, e a faixa o diz com o ano.
		expect(caminho.textContent).toBe("Edições");
	});

	it("nada fica acima do título além do caminho", async () => {
		const titulo = await abrir(edicao());

		expect(titulo.previousElementSibling?.matches("nav.migalhas")).toBe(true);
		expect(document.querySelector(".artigo-folha .sobretitulo")).toBeNull();
	});

	it("com outro título, sem o período, a faixa ainda diz a semana, com o ano", async () => {
		const outro = "Câmara e Senado votam o orçamento";
		await abrir(
			edicao((exemplo) => {
				exemplo.titulo = outro;
			}),
			outro,
		);

		expect(
			document.querySelector(".artigo-folha > .faixa")?.firstElementChild
				?.textContent,
		).toBe("9 a 15 de novembro de 2026");
	});

	it("publicada em outro ano, a faixa diz o ano da publicação", async () => {
		await abrir(
			edicao((exemplo) => {
				exemplo.inicio = "2026-12-21";
				exemplo.fim = "2026-12-27";
				// 1h30 de 2/1 no UTC ainda é 1º de janeiro em Brasília.
				exemplo.publicada_em = "2027-01-02T01:30:00Z";
			}),
		);

		expect(
			Array.from(
				document.querySelector(".artigo-folha > .faixa")?.children ?? [],
				(parte) => parte.textContent,
			).slice(0, 2),
		).toEqual([
			"21 a 27 de dezembro de 2026",
			"Publicada em 1º de janeiro de 2027",
		]);
	});

	it("o texto de cada item vira parágrafos, sempre como texto", async () => {
		await abrir(
			edicao((exemplo) => {
				exemplo.itens[1].texto =
					"Texto com <img src=x onerror=alert(1)> dentro.";
			}),
		);

		expect(
			Array.from(item(1).querySelectorAll(".texto > p"), (p) => p.textContent),
		).toEqual([
			"O projeto cria uma semana dedicada às bibliotecas das escolas públicas.",
			"Agora o texto segue para o Senado, que pode aprovar, mudar ou rejeitar.",
		]);
		expect(item(2).querySelector("img")).toBeNull();
		expect(item(2).textContent).toContain("<img src=x onerror=alert(1)>");
	});

	it("a quebra simples de linha fica dentro do parágrafo, como no e-mail", async () => {
		// O e-mail troca cada quebra por um <br>. Aqui, ela fica no texto, e o CSS
		// a mostra (o white-space do estilos/edicoes.test.ts).
		await abrir(
			edicao((exemplo) => {
				exemplo.itens[1].texto =
					"Primeira linha\nsegunda linha do mesmo parágrafo.\n\nOutro parágrafo.";
			}),
		);

		expect(
			Array.from(item(2).querySelectorAll(".texto > p"), (p) => p.textContent),
		).toEqual([
			"Primeira linha\nsegunda linha do mesmo parágrafo.",
			"Outro parágrafo.",
		]);
	});

	it("o teto do título e o dos títulos dos itens se medem pela folha, a caixa deles", async () => {
		const titulo = await abrir(edicao());
		const folha = document.querySelector("article.artigo-folha");
		const titulos = [
			titulo,
			...document.querySelectorAll<HTMLElement>("section.item-da-edicao > h2"),
		];

		// O CSS mede o teto pela largura da folha (o 100cqi), e não pela da tela,
		// que conta a barra de rolagem do Windows: estilos/edicoes.test.ts.
		expect(folha?.classList.contains("caixa-do-teto")).toBe(true);
		expect(titulos).toHaveLength(4);
		for (const t of titulos) {
			expect(t.classList.contains("teto-pela-caixa"), t.textContent ?? "").toBe(
				true,
			);
			expect(t.parentElement?.closest(".caixa-do-teto")).toBe(folha);
		}
	});

	it("o teto do título de cada item sai da régua do subtítulo, a letra dele", async () => {
		await abrir(edicao());
		const titulos = [
			...document.querySelectorAll<HTMLElement>("section.item-da-edicao > h2"),
		];

		// O título do item é um subtítulo condensado (largura 68%), mais largo que o
		// título da página (62%). Com a régua do título, o --palavra ficaria pequeno
		// demais, e a palavra mais larga passaria da folha com a letra grande.
		expect(titulos).toHaveLength(3);
		for (const t of titulos) {
			const texto = t.textContent ?? "";
			const doSubtitulo = tetoDoTitulo(texto, "subtitulo-condensado");

			expect(t.classList.contains("subtitulo-condensado"), texto).toBe(true);
			expect(t.style.getPropertyValue("--palavra"), texto).toBe(
				String(doSubtitulo),
			);
			// A régua do título dá outro número: o teste pega a troca das réguas.
			expect(doSubtitulo, texto).toBeGreaterThan(
				tetoDoTitulo(texto, "titulo-condensado"),
			);
		}
	});
});

describe("o quadro da votação", () => {
	it("traz o resultado registrado, o placar e a Presidência contada à parte", async () => {
		await abrir(edicao());

		expect(
			within(item(1)).getByRole("heading", {
				level: 3,
				name: "Votação de 11 de novembro de 2026",
			}),
		).toBeTruthy();
		expect(definicoes(item(1))).toEqual([
			["Resultado registrado", "Aprovada"],
			["Sim", "312"],
			["Não", "141"],
			["Abstenções", "3"],
			["Obstruções", "0"],
			["Presidência", "1, contada à parte"],
		]);
	});

	it("a votação rejeitada diz que foi rejeitada", async () => {
		await abrir(
			edicao((exemplo) => {
				const votacao = exemplo.itens[0].fatos?.votacoes[0];
				if (votacao) {
					votacao.resultado = "rejeitada";
				}
			}),
		);

		expect(definicoes(item(1))[0]).toEqual([
			"Resultado registrado",
			"Rejeitada",
		]);
	});

	it("sem placar, diz que ele não está disponível, e o resultado não classificado não vira aprovação", async () => {
		await abrir(edicao());

		expect(definicoes(item(2))).toEqual([
			["Resultado registrado", "Não classificado nos dados usados"],
		]);
		expect(item(2).textContent).toContain(
			"O placar não está disponível nos dados usados.",
		);
		expect(item(2).textContent).not.toContain("Aprovada");
	});

	it("o item de uma edição antiga, sem os fatos, fica sem o quadro e com a fonte", async () => {
		await abrir(edicao());

		expect(within(item(3)).queryByRole("heading", { name: /^Votação/ })).toBe(
			null,
		);
		expect(definicoes(item(3))).toEqual([]);
		expect(
			within(item(3))
				.getByRole("link", { name: "Fonte oficial do item 3" })
				.getAttribute("href"),
		).toBe(FONTE_DE_EDICAO_ANTIGA.url);
	});
});

describe("as fontes de cada item", () => {
	it("ficam agrupadas pelo endereço: a fonte oficial, a outra referência e a outra coleta", async () => {
		await abrir(edicao());
		const fontes = item(1).querySelector<HTMLElement>(".fontes-do-item");
		if (!fontes) {
			throw new Error("não achei as fontes do item 1");
		}
		expect(
			within(fontes).getByRole("heading", {
				level: 3,
				name: "Fontes do item 1",
			}),
		).toBeTruthy();
		expect(links(fontes)).toEqual([
			["Fonte oficial do item 1", FONTE_DA_VOTACAO.url],
			["Outra referência oficial 2 do item 1", FONTE_DA_PROPOSICAO.url],
		]);
		// Na tela, o nome fica sem o item e sem o número, que a lista já mostra ao lado.
		expect(within(fontes).getAllByRole("link").map(textoAVista)).toEqual([
			"Fonte oficial",
			"Outra referência oficial",
		]);
		// 1h30 de 12/11 em UTC é 11/11 em Brasília.
		expect(fontes.textContent).toContain(
			"camara.leg.br, coletada em 11 de novembro de 2026",
		);
		expect(fontes.textContent).toContain(
			"Outra coleta da mesma referência, em 13 de novembro de 2026.",
		);
	});

	it("com três endereços num item, cada link tem um nome só dele", async () => {
		// Como nos itens 1 e 5 da edição 1: duas outras referências no mesmo item.
		await abrir(
			edicao((exemplo) => {
				exemplo.itens[0].fontes.push(FONTE_DO_SENADO);
			}),
		);
		const fontes = item(1).querySelector<HTMLElement>(".fontes-do-item");
		if (!fontes) {
			throw new Error("não achei as fontes do item 1");
		}

		// O número é o que a lista mostra ao lado de cada endereço.
		expect(links(fontes)).toEqual([
			["Fonte oficial do item 1", FONTE_DA_VOTACAO.url],
			["Outra referência oficial 2 do item 1", FONTE_DA_PROPOSICAO.url],
			["Outra referência oficial 3 do item 1", FONTE_DO_SENADO.url],
		]);
		// Na página inteira, o mesmo nome nunca leva a dois lugares. O mesmo nome
		// para o mesmo lugar pode se repetir: o índice vem duas vezes no HTML (a
		// tela mostra uma cópia de cada vez), e o "Entenda na trilha" de dois
		// itens pode levar ao mesmo artigo.
		const destinos = new Map<string, Set<string>>();
		for (const [nome, destino] of links()) {
			destinos.set(nome, (destinos.get(nome) ?? new Set()).add(destino));
		}
		expect(
			[...destinos]
				.filter(([, lugares]) => lugares.size > 1)
				.map(([nome]) => nome),
		).toEqual([]);
	});

	it("o trecho da fonte aparece como texto, entre aspas, sem virar HTML", async () => {
		await abrir(edicao());
		const trecho = item(1).querySelector("blockquote");

		expect(trecho?.getAttribute("cite")).toBe(FONTE_DA_VOTACAO.url);
		expect(trecho?.textContent).toBe(
			"Trecho da fonte: “Aprovado o projeto, com <b>emenda</b> de redação.”",
		);
		expect(trecho?.querySelector("b")).toBeNull();
	});

	it("o endereço que não é de um site oficial fica sem link", async () => {
		await abrir(
			edicao((exemplo) => {
				exemplo.itens[2].fontes = [
					{ ...FONTE_DE_EDICAO_ANTIGA, url: "javascript:alert(1)" },
				];
			}),
		);

		expect(within(item(3)).queryByRole("link")).toBeNull();
		expect(item(3).textContent).toContain("Fonte oficial");
		expect(item(3).textContent).toContain("Coletada em 10 de novembro de 2026");
		expect(item(3).innerHTML).not.toContain("javascript:");
	});
});

describe("o artigo da trilha de cada item", () => {
	it("o item com o artigo leva a ele", async () => {
		await abrir(edicao());

		expect(
			within(item(1))
				.getByRole("link", { name: "Entenda na trilha: Onde o projeto começa" })
				.getAttribute("href"),
		).toBe("/trilhas/processo-legislativo/onde-o-projeto-comeca");
		expect(
			within(item(2)).queryByRole("link", { name: /Entenda na trilha/ }),
		).toBeNull();
	});

	it("um caminho que não é da trilha fica sem o link", async () => {
		await abrir(
			edicao((exemplo) => {
				exemplo.itens[0].artigo = {
					titulo: "Onde o projeto começa",
					caminho: "https://exemplo.com/trilhas/a/b",
				};
			}),
		);

		expect(
			within(item(1)).queryByRole("link", { name: /Entenda na trilha/ }),
		).toBeNull();
		expect(item(1).innerHTML).not.toContain("exemplo.com");
	});
});

describe("o índice e a ordem dos títulos", () => {
	it("o 'Nesta edição' leva a cada item, e as duas cópias não repetem o id do título", async () => {
		await abrir(edicao());
		const indices = screen.getAllByRole("navigation", { name: "Nesta edição" });

		expect(indices).toHaveLength(2);
		for (const indice of indices) {
			expect(
				within(indice)
					.getAllByRole("link")
					.map((link) => [link.textContent, link.getAttribute("href")]),
			).toEqual([
				["1Câmara aprova a semana das bibliotecas escolares", "#item-1"],
				["2Senado vota um requerimento", "#item-2"],
				["3Um item de uma edição antiga", "#item-3"],
			]);
		}
		const ids = Array.from(document.querySelectorAll("[id]"), (el) => el.id);
		expect(new Set(ids).size).toBe(ids.length);
		// O item não sobe com a rolagem: com o revelar, o navegador calcula o lugar
		// do #item-N com o item ainda deslocado, e o alto dele fica fora da tela.
		for (const item of document.querySelectorAll("section.item-da-edicao")) {
			expect(item.classList.contains("revelar")).toBe(false);
		}
	});

	it("o h1, os h2 do índice e dos itens e os h3 dentro de cada item", async () => {
		await abrir(edicao());
		const niveis = Array.from(
			document.querySelectorAll("h1, h2, h3"),
			(titulo) => titulo.tagName,
		);

		expect(niveis[0]).toBe("H1");
		expect(niveis.filter((nivel) => nivel === "H1")).toHaveLength(1);
		for (const ordem of [1, 2, 3]) {
			const titulos = Array.from(
				item(ordem).querySelectorAll("h2, h3"),
				(titulo) => titulo.tagName,
			);
			expect(titulos[0], `item ${ordem}`).toBe("H2");
			expect(titulos.slice(1).every((nivel) => nivel === "H3")).toBe(true);
		}
	});

	it("o fim da página leva à lista das edições e à inscrição", async () => {
		await abrir(edicao());

		expect(
			screen
				.getByRole("link", { name: "Ver todas as edições" })
				.getAttribute("href"),
		).toBe("/edicoes");
		expect(
			screen
				.getByRole("link", { name: "Receber as próximas por e-mail" })
				.getAttribute("href"),
		).toBe("/#newsletter");
	});
});

describe("os outros estados da página", () => {
	it("sem a API, diz que as edições não aparecem neste endereço", async () => {
		await abrir(() => ({ tipo: "sem-api" }), "Edições");

		expect(document.body.textContent).toContain(
			"As edições ainda não aparecem neste endereço do site.",
		);
		expect(
			screen.getByRole("link", { name: "Ver as trilhas" }).getAttribute("href"),
		).toBe("/trilhas");
	});

	it("a edição que não existe dá a página não encontrada, que leva às edições", async () => {
		await abrir(() => {
			throw notFound();
		}, "Página não encontrada");

		expect(
			screen.getByRole("link", { name: "Ver as edições" }).getAttribute("href"),
		).toBe("/edicoes");
	});
});

describe("o cabeçalho da página", () => {
	const head = (pagina: EdicaoDaPagina | undefined, status = "success") =>
		Route.options.head?.({
			loaderData: pagina,
			match: { status },
		} as never) as { meta: Record<string, string>[] };

	it("a edição tem o título, a descrição com o período e o tipo de artigo", () => {
		const meta = head({ tipo: "edicao", edicao: edicaoDeExemplo() }).meta;

		expect(meta).toContainEqual({ title: `${TITULO} · Mandatômetro` });
		expect(meta).toContainEqual({
			name: "description",
			content:
				"O que o Congresso votou de 9 a 15 de novembro de 2026, em 3 itens em linguagem simples, com a fonte oficial de cada um.",
		});
		expect(meta).toContainEqual({ property: "og:type", content: "article" });
	});

	it("com um item só, a descrição fala dele no singular", () => {
		const exemplo = edicaoDeExemplo();
		exemplo.itens = exemplo.itens.slice(0, 1);

		expect(head({ tipo: "edicao", edicao: exemplo }).meta).toContainEqual({
			name: "description",
			content:
				"O que o Congresso votou de 9 a 15 de novembro de 2026, em 1 item em linguagem simples, com a fonte oficial.",
		});
	});

	it("sem a API, fica com o título das edições; sem a página, com o do erro", () => {
		expect(head({ tipo: "sem-api" }).meta).toContainEqual({
			title: "Edições · Mandatômetro",
		});
		expect(head(undefined, "error").meta).toEqual([
			{ title: "Erro ao carregar a página · Mandatômetro" },
		]);
	});
});
