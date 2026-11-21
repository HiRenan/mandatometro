// @vitest-environment jsdom
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Link,
	type RootRouteOptions,
	RouterProvider,
} from "@tanstack/react-router";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route as Raiz } from "./__root";
import { Route as Exclusao } from "./cadastro/excluir";
import { Route as Perfil } from "./perfil";

const { consultar, perfil, sair, excluir } = vi.hoisted(() => ({
	consultar: vi.fn(),
	perfil: vi.fn(),
	sair: vi.fn(),
	excluir: vi.fn(),
}));

vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.example.com" } }));
vi.mock("@/client", () => ({
	consultarProgressoConta: consultar,
	alterarProgressoConta: vi.fn(),
	consultarPerfil: perfil,
	sairConta: sair,
	excluirConta: excluir,
}));

const CHAVE = "mandatometro:sessao-do-progresso";
const ESPELHO = "mandatometro:artigos-lidos-na-conta";
const ARTIGO = "leis/primeiro";

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	localStorage.setItem(CHAVE, crypto.randomUUID());
	localStorage.setItem(ESPELHO, JSON.stringify([ARTIGO]));
	consultar.mockResolvedValue({ data: { lidos: [ARTIGO] } });
	perfil.mockResolvedValue({ data: { nome: "Pessoa fictícia" } });
	sair.mockResolvedValue({ response: new Response(null, { status: 204 }) });
	excluir.mockResolvedValue({ response: new Response(null, { status: 204 }) });
});

afterEach(() => {
	cleanup();
	localStorage.clear();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("progresso no documento e nas rotas da conta", () => {
	it("a raiz lê na abertura e limita as releituras por navegação e visibilidade juntas", async () => {
		const relogio = vi.spyOn(performance, "now").mockReturnValue(0);
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
		const raiz = createRootRoute({
			shellComponent: (Raiz.options as RootRouteOptions).shellComponent,
		});
		const inicio = createRoute({
			getParentRoute: () => raiz,
			path: "/",
			component: () => <Link to="/trilhas">Abrir trilhas</Link>,
		});
		const trilhas = createRoute({
			getParentRoute: () => raiz,
			path: "/trilhas",
			component: () => <Link to="/">Voltar</Link>,
		});
		const router = createRouter({
			routeTree: raiz.addChildren([inicio, trilhas]),
			history: createMemoryHistory({ initialEntries: ["/"] }),
		});
		const outro = document.implementation.createHTMLDocument();
		const caixa = outro.body.appendChild(outro.createElement("div"));
		// O documento inteiro é montado à parte, como no teste de CliqueNaTroca.
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		vi.stubGlobal("matchMedia", (media: string) => ({
			matches: false,
			media,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
		}));
		render(<RouterProvider router={router} />, { container: caixa });
		const link = await waitFor(() => {
			const link = outro.querySelector<HTMLAnchorElement>("main a");
			if (!link) throw new Error("O documento ainda não mostrou o link.");
			expect(link.textContent).toBe("Abrir trilhas");
			return link;
		});
		await waitFor(() => expect(consultar).toHaveBeenCalledTimes(1));

		await act(async () => link.click());
		await waitFor(() =>
			expect(outro.querySelector("main a")?.textContent).toBe("Voltar"),
		);
		await waitFor(() => expect(consultar).toHaveBeenCalledTimes(2));
		relogio.mockReturnValue(29_999);
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
			await router.navigate({ to: "/" });
		});
		expect(consultar).toHaveBeenCalledTimes(2);

		relogio.mockReturnValue(30_000);
		document.dispatchEvent(new Event("visibilitychange"));
		await waitFor(() => expect(consultar).toHaveBeenCalledTimes(3));
		await act(() => router.navigate({ to: "/trilhas" }));
		expect(consultar).toHaveBeenCalledTimes(3);

		window.dispatchEvent(
			new PageTransitionEvent("pageshow", { persisted: true }),
		);
		await waitFor(() => expect(consultar).toHaveBeenCalledTimes(4));
	});

	it("Sair em /perfil limpa o progresso depois da confirmação da API", async () => {
		// O perfil lê as trilhas do loader e tem links para elas: a tela abre num
		// site de mentira, com uma trilha inventada, a do artigo lido.
		const raiz = createRootRoute();
		const pagina = (path: string) =>
			createRoute({ getParentRoute: () => raiz, path, component: () => null });
		const router = createRouter({
			routeTree: raiz.addChildren([
				createRoute({
					getParentRoute: () => raiz,
					path: "/perfil",
					loader: () => [
						{
							slug: "leis",
							titulo: "Trilha inventada",
							descricao: "Descrição inventada.",
							ordem: 1,
							artigos: [
								{
									trilha: "leis",
									slug: "primeiro",
									titulo: "Artigo inventado",
									resumo: "Resumo inventado.",
									ordem: 1,
									fontes: [],
									minutos: 2,
								},
							],
						},
					],
					component: Perfil.options.component,
				}),
				pagina("/trilhas"),
				pagina("/trilhas/$trilha"),
				pagina("/trilhas/$trilha/$artigo"),
				pagina("/termo"),
			]),
			history: createMemoryHistory({ initialEntries: ["/perfil"] }),
		});
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		render(<RouterProvider router={router} />);
		fireEvent.click(await screen.findByRole("button", { name: "Sair" }));
		await waitFor(() => {
			expect(sair).toHaveBeenCalledTimes(1);
			expect(localStorage.getItem(CHAVE)).toBeNull();
			expect(localStorage.getItem(ESPELHO)).toBeNull();
		});
	});

	it("Excluir conta pela rota limpa o progresso depois da confirmação da API", async () => {
		const Tela = Exclusao.options.component;
		if (!Tela) throw new Error("A rota de exclusão está sem tela.");
		render(<Tela />);
		fireEvent.change(screen.getByLabelText("Senha atual"), {
			target: { value: "senha fictícia" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
		await screen.findByText(/Sua conta foi excluída/);
		expect(excluir).toHaveBeenCalledTimes(1);
		expect(localStorage.getItem(CHAVE)).toBeNull();
		expect(localStorage.getItem(ESPELHO)).toBeNull();
	});
});
