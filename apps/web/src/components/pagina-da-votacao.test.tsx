// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DetalheVotacao, PlacarPorPartido } from "@/client";
import type { PaginaDaVotacao } from "@/lib/parlamentares";
import { buscaComPartido } from "@/lib/parlamentares/busca";
import {
	CONTAGEM_ZERADA,
	votacaoDeExemplo,
} from "@/lib/parlamentares/exemplos-de-teste";
import { Route } from "@/routes/votacoes/$id";
import { QuadroDaVotacao } from "./item-da-edicao";

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

/**
 * A votação num site de mentira. A rota entra na árvore como no routeTree.gen.ts,
 * e os dados vêm do loader, sem a função do servidor: o teste conta quantas vezes
 * ele roda.
 */
async function abrir(votacao: DetalheVotacao = votacaoDeExemplo()) {
	const carregar = vi.fn((): PaginaDaVotacao => ({ tipo: "votacao", votacao }));
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/votacoes/$id",
		path: "/votacoes/$id",
		getParentRoute: () => raiz,
		loader: carregar,
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		...buscaComPartido,
		history: createMemoryHistory({ initialEntries: ["/votacoes/139"] }),
	});
	render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { level: 1, name: "PL 812/2026" });
	return { router, carregar };
}

/** Os nomes da lista de quem votou como, na ordem da página. */
function nomes() {
	return Array.from(
		document.querySelectorAll(".nomes-do-grupo a"),
		(link) => link.textContent,
	);
}

describe("a página da votação", () => {
	it("o filtro troca a lista sem pedir a votação de novo, e o Limpar os filtros volta à lista inteira", async () => {
		const { router, carregar } = await abrir();
		const filtro = screen.getByRole("button", { name: "Filtrar" });
		vi.mocked(window.scrollTo).mockClear();

		fireEvent.change(screen.getByRole("combobox", { name: "Estado" }), {
			target: { value: "BA" },
		});
		// Pelo teclado, o Enter no botão: o foco está nele quando o filtro roda.
		filtro.focus();
		fireEvent.click(filtro);

		expect(await screen.findByText("Mostrando 2 de 5 nomes")).toBeTruthy();
		expect(router.state.location.search).toEqual({ uf: "BA" });
		expect(nomes()).toEqual(["Rui Tavaquil", "Sara Varombre"]);
		// O botão continua o mesmo, com o foco, e a página fica onde está.
		expect(document.activeElement).toBe(filtro);
		expect(window.scrollTo).not.toHaveBeenCalled();

		// O mesmo filtro de novo leva ao mesmo endereço: a votação também não volta
		// a ser pedida.
		fireEvent.click(filtro);
		await screen.findByText("Mostrando 2 de 5 nomes");
		await new Promise((pronto) => setTimeout(pronto, 50));

		const limpar = screen.getByRole("link", { name: "Limpar os filtros" });
		limpar.focus();
		fireEvent.click(limpar);

		expect(await screen.findByText("Mostrando 5 de 5 nomes")).toBeTruthy();
		expect(router.state.location.search).toEqual({});
		expect(screen.getByRole("combobox", { name: "Estado" })).toHaveProperty(
			"value",
			"",
		);
		// O link saiu da tela: o foco vai para o Filtrar, logo acima.
		expect(document.activeElement).toBe(filtro);
		expect(window.scrollTo).not.toHaveBeenCalled();
		expect(carregar).toHaveBeenCalledTimes(1);
	});

	it("o placar por partido é uma tabela com legenda e os cabeçalhos de cada linha e coluna", async () => {
		await abrir();
		const tabela = screen.getByRole("table", {
			name: "Quantos votos de cada tipo cada partido deu nesta votação",
		});

		expect(
			within(tabela)
				.getAllByRole("columnheader")
				.map((celula) => celula.textContent),
		).toEqual([
			"Partido",
			"Sim",
			"Não",
			"Abstenção",
			"Obstrução",
			"Presidência",
			"Não votou",
		]);
		expect(
			within(tabela)
				.getAllByRole("rowheader")
				.map((celula) => celula.textContent),
		).toEqual(["PFT", "PNX", "PRV", "Sem partido registrado"]);
	});

	it.each(["S/TESTE", "PT.Z", "PÁ R", "P'T", "1.0"])(
		"o partido %s continua selecionado e filtra pelo texto exato depois do envio",
		async (partido) => {
			const votacao = votacaoDeExemplo();
			votacao.votos[0] = { ...votacao.votos[0], partido };
			const { router, carregar } = await abrir(votacao);
			const campo = () => screen.getByRole("combobox", { name: "Partido" });

			fireEvent.change(campo(), { target: { value: partido } });
			fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));

			await screen.findByText("Mostrando 1 de 5 nomes");
			expect(campo()).toHaveProperty("value", partido);
			expect(router.state.location.search).toEqual({ partido });
			expect(nomes()).toEqual(["Ágata Cedrolume"]);
			expect(carregar).toHaveBeenCalledTimes(1);
		},
	);

	it("o estado vazio junta a frase e a contagem na região que o leitor ouve inteira", async () => {
		await abrir();
		fireEvent.change(screen.getByRole("combobox", { name: "Estado" }), {
			target: { value: "BA" },
		});
		fireEvent.change(screen.getByRole("combobox", { name: "Partido" }), {
			target: { value: "PNX" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));

		const contador = await screen.findByText("Mostrando 0 de 5 nomes");
		expect(contador.getAttribute("aria-live")).toBe("polite");
		expect(contador.getAttribute("aria-atomic")).toBe("true");
		expect(contador.textContent).toBe(
			"Mostrando 0 de 5 nomes. Nenhum nome com esses filtros.",
		);
		expect(
			document.querySelector(".texto-sem-votos")?.getAttribute("aria-hidden"),
		).toBe("true");
		expect(
			screen.getByRole("link", { name: "Limpar os filtros" }),
		).toBeTruthy();
	});

	it("o quadro mostra cada número do placar geral vindo da API", async () => {
		const votacao = votacaoDeExemplo();
		votacao.placar = { ...votacao.placar, abstencao: 3, obstrucao: 4 };
		await abrir(votacao);

		const placar = screen.getByRole("region", { name: "Placar" });
		expect(
			Array.from(
				placar.querySelectorAll(".contagem, .presidencia"),
				(linha) => [
					linha.querySelector("dt")?.textContent,
					linha.querySelector("dd")?.textContent,
				],
			),
		).toEqual([
			["Sim", "2"],
			["Não", "1"],
			["Abstenções", "3"],
			["Obstruções", "4"],
			["Presidência", "1, contada à parte"],
		]);
	});

	it("o nome no grupo leva o partido e a UF do próprio registro de voto", async () => {
		await abrir();
		for (const [nome, partidoEUf] of [
			["Ágata Cedrolume", "PFT · SC"],
			["Íris Dell'Ombre", "PNX · SC"],
			["Rui Tavaquil", "PRV · BA"],
		]) {
			const link = screen.getByRole("link", { name: nome });
			expect(
				link.closest("li")?.querySelector(".partido-e-uf")?.textContent,
			).toBe(partidoEUf);
		}
	});

	it("a coluna do Outro registro só aparece quando algum partido tem um", async () => {
		const grupos: PlacarPorPartido[] = [
			{ partido: "PFT", placar: { ...CONTAGEM_ZERADA, sim: 1, outro: 1 } },
		];
		await abrir(votacaoDeExemplo({ placar_por_partido: grupos }));

		expect(
			screen.getByRole("columnheader", { name: "Outro registro" }),
		).toBeTruthy();
	});

	it("o plenário é desenho, fora do leitor de tela, com a legenda só dos votos que aparecem", async () => {
		await abrir();
		const painel = document.querySelector(".painel-da-votacao");

		expect(painel?.getAttribute("aria-hidden")).toBe("true");
		expect(
			Array.from(
				painel?.querySelectorAll(".legenda-do-plenario li") ?? [],
				(item) => item.textContent,
			),
		).toEqual(["Sim", "Não", "Presidência", "Não votou"]);
	});

	it("cada desenho do plenário tem um azulejo por voto da API", async () => {
		const votacao = votacaoDeExemplo();
		await abrir(votacao);
		const desenhos = document.querySelectorAll(
			".painel-da-votacao svg.plenario",
		);
		expect(desenhos).toHaveLength(2);
		for (const desenho of desenhos) {
			// O anel usa dois subcaminhos por azulejo e a obstrução usa três.
			const azulejos = Array.from(desenho.querySelectorAll("path"), (forma) => {
				const subcaminhos =
					(forma.getAttribute("d") ?? "").split("M").length - 1;
				if (forma.classList.contains("voto-nao")) return subcaminhos / 2;
				if (forma.classList.contains("voto-obstrucao")) return subcaminhos / 3;
				return subcaminhos;
			}).reduce((total, quantidade) => total + quantidade, 0);
			expect(azulejos).toBe(votacao.votos.length);
		}
	});
});

describe("o vídeo da sessão, na página da votação", () => {
	const VIDEO = "https://www.youtube.com/watch?v=Mnd268Cam01";

	it("a capa é um link para o YouTube; o toque põe no lugar o player do nocookie, com o foco nele", async () => {
		await abrir(votacaoDeExemplo({ url_video: VIDEO }));
		const bloco = screen.getByRole("region", { name: "Vídeo da sessão" });
		const capa = within(bloco).getByRole("link", {
			name: "Assistir ao vídeo da sessão Sessão de 20 de novembro de 2026 · Câmara dos Deputados · YouTube",
		});

		expect(capa.getAttribute("href")).toBe(VIDEO);
		expect(capa.querySelector("img, picture, svg image")).toBeNull();
		expect(document.querySelector("iframe")).toBeNull();
		expect(bloco.textContent).toContain(
			"O vídeo é da sessão inteira do Plenário, publicado pela Câmara dos Deputados no YouTube, e não começa no momento desta votação. O player do YouTube, do Google, só carrega depois do toque.",
		);

		capa.focus();
		fireEvent.click(capa);

		const player = await within(bloco).findByTitle(
			"Vídeo da sessão de 20 de novembro de 2026, no YouTube",
		);
		expect(player.getAttribute("src")).toBe(
			"https://www.youtube-nocookie.com/embed/Mnd268Cam01?autoplay=1",
		);
		expect(document.activeElement).toBe(player);
		// A capa fica na caixa, para guardar a altura, mas fora do teclado.
		expect(capa.hasAttribute("inert")).toBe(true);
	});

	it("com o Ctrl, o clique segue o link para o YouTube, sem o player", async () => {
		await abrir(votacaoDeExemplo({ url_video: VIDEO }));
		const capa = screen.getByRole("link", { name: /^Assistir ao vídeo/ });
		let seguiu: boolean | undefined;
		// O jsdom não navega: aqui, só se confere que o site deixou o link seguir.
		const conferir = (evento: Event) => {
			seguiu = !evento.defaultPrevented;
			evento.preventDefault();
		};
		document.addEventListener("click", conferir);

		fireEvent.click(capa, { ctrlKey: true });

		document.removeEventListener("click", conferir);
		expect(seguiu).toBe(true);
		expect(document.querySelector("iframe")).toBeNull();
	});

	it("no Senado, a nota e a capa dizem Senado Federal", async () => {
		await abrir(votacaoDeExemplo({ casa: "senado", url_video: VIDEO }));
		const bloco = screen.getByRole("region", { name: "Vídeo da sessão" });

		expect(bloco.textContent).toContain(
			"publicado pelo Senado Federal no YouTube",
		);
		expect(bloco.textContent).toContain("· Senado Federal · YouTube");
	});
});

describe("o quadro da votação, na edição e no painel", () => {
	/** O quadro num site de mentira, com o id da votação ou sem ele, como no painel. */
	async function mostrar(id?: number, video?: string | null) {
		const raiz = createRootRoute({ component: () => <Outlet /> });
		const inicio = createRoute({
			getParentRoute: () => raiz,
			path: "/",
			component: () => (
				<QuadroDaVotacao
					votacao={{
						data: "2026-11-20",
						resultado: "aprovada",
						placar: { ...CONTAGEM_ZERADA, sim: 2, nao: 1 },
					}}
					Titulo="h3"
					id={id}
					video={video}
				/>
			),
		});
		const router = createRouter({
			routeTree: raiz.addChildren([inicio]),
			history: createMemoryHistory({ initialEntries: ["/"] }),
		});
		render(<RouterProvider router={router} />);
		await screen.findByRole("heading", {
			level: 3,
			name: "Votação de 20 de novembro de 2026",
		});
	}

	it("com o id, leva a quem votou, com o dia da votação no nome do link", async () => {
		await mostrar(139);

		expect(
			screen
				.getByRole("link", {
					name: "Ver quem votou na votação de 20 de novembro de 2026",
				})
				.getAttribute("href"),
		).toBe("/votacoes/139");
	});

	it("sem o id, como no painel de revisão, fica sem o link", async () => {
		await mostrar(undefined, "https://www.youtube.com/watch?v=Mnd268Cam01");

		expect(screen.queryByRole("link")).toBeNull();
	});

	it("com o vídeo da sessão, o Vídeo da sessão leva ao bloco dele na página da votação", async () => {
		await mostrar(139, "https://www.youtube.com/watch?v=Mnd268Cam01");

		expect(
			screen
				.getByRole("link", {
					name: "Vídeo da sessão da votação de 20 de novembro de 2026",
				})
				.getAttribute("href"),
		).toBe("/votacoes/139#video-da-sessao");
	});

	it("sem o vídeo, ou com um endereço fora do contrato, só o Ver quem votou", async () => {
		for (const video of [null, "https://youtu.be/Mnd268Cam01"]) {
			await mostrar(139, video);

			expect(
				screen.getAllByRole("link").map((link) => link.textContent),
			).toEqual(["Ver quem votou na votação de 20 de novembro de 2026"]);
			cleanup();
		}
	});
});
