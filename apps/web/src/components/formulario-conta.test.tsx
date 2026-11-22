// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tetoDoTitulo } from "@/lib/conteudo/regua";
import { VERSAO_DO_TERMO } from "@/lib/termo";
import { FormularioConta, titulos } from "./formulario-conta";

// O cadastro pede à API a versão e o endereço do termo (GET /contas/termo). O
// link da caixa de aceite leva ao endereço que a API devolve, em outra aba, e o
// cadastro só abre com a versão da API igual à da página do termo: com outra, a
// pessoa aceitaria um texto que não leu. O site sem o API_URL, como nas prévias
// dos PRs, fica no "sem a API".
const COM_API = "https://api.example.com";
const ambiente = vi.hoisted(() => ({ API_URL: "https://api.example.com" }));
vi.mock("@/env", () => ({ ENV: ambiente }));

type Modo = keyof typeof titulos;
const MODOS = Object.keys(titulos) as Modo[];

const pedidosAApi = vi.fn<(pedido: Request) => Promise<Response>>();

/** O endereço do termo na API: outro que o da página, para o link vir dela. */
const ENDERECO_NA_API = "https://termo.example.com/termo";
const avisoDeSpam =
	"Se o e-mail não aparecer, procure também no spam ou no lixo eletrônico.";
const conclusaoDoCadastro = `Confira sua caixa de entrada para confirmar o cadastro. ${avisoDeSpam}`;

/** A API responde ao GET /contas/termo com esta versão. */
function versaoNaApi(versao: string) {
	pedidosAApi.mockResolvedValueOnce(
		Response.json({ versao, url: ENDERECO_NA_API }),
	);
}

const botao = () =>
	screen.getByRole("button", { name: "Criar conta" }) as HTMLButtonElement;

function preencherCadastro() {
	escrever("Nome completo", "Pessoa fictícia");
	escrever("E-mail", "pessoa@example.com");
	escrever("Senha (12 a 128 caracteres)", SENHA);
	escrever("Confirmar senha", SENHA);
	fireEvent.click(screen.getByRole("checkbox", { name: /li e aceito/ }));
}

const SENHA = "Senha fictícia de cadastro";

function escrever(rotulo: string, valor: string) {
	fireEvent.change(screen.getByLabelText(rotulo), {
		target: { value: valor },
	});
}

/** Os links entre as telas, embaixo do formulário: o texto e o endereço. */
function linksEntreAsTelas() {
	return within(screen.getByRole("list"))
		.getAllByRole("link")
		.map((link) => [link.textContent, link.getAttribute("href")]);
}

beforeEach(() => {
	ambiente.API_URL = COM_API;
	pedidosAApi.mockReset();
	vi.stubGlobal("fetch", pedidosAApi);
	window.history.replaceState(null, "", "/");
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("o termo no cadastro", () => {
	it("leva ao endereço que a API devolve, em outra aba", async () => {
		versaoNaApi(VERSAO_DO_TERMO);
		render(<FormularioConta modo="cadastro" />);
		const link = await screen.findByRole("link", {
			name: "o termo de consentimento",
		});

		expect(link.getAttribute("href")).toBe(ENDERECO_NA_API);
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toBe("noreferrer");
		expect(botao().disabled).toBe(false);
	});

	it("pede, na caixa de aceite, 12 anos ou mais", async () => {
		versaoNaApi(VERSAO_DO_TERMO);
		render(<FormularioConta modo="cadastro" />);
		await screen.findByRole("link", { name: "o termo de consentimento" });

		expect(
			screen.getByRole("checkbox", {
				name: "Tenho 12 anos ou mais e li e aceito o termo de consentimento.",
			}),
		).toBeTruthy();
	});

	it("manda no POST a versão que a API devolveu no GET", async () => {
		const versao = VERSAO_DO_TERMO;
		versaoNaApi(versao);
		pedidosAApi.mockResolvedValueOnce(new Response(null, { status: 204 }));
		render(<FormularioConta modo="cadastro" />);
		await screen.findByRole("link", { name: "o termo de consentimento" });

		preencherCadastro();
		fireEvent.click(botao());
		await waitFor(() =>
			expect(screen.getByRole("status").textContent).toBe(conclusaoDoCadastro),
		);

		expect(
			pedidosAApi.mock.calls.map(([pedido]) => [pedido.method, pedido.url]),
		).toEqual([
			["GET", "https://api.example.com/contas/termo"],
			["POST", "https://api.example.com/contas"],
		]);
		const [[_get], [post]] = pedidosAApi.mock.calls;
		expect(await post.json()).toMatchObject({ aceite: true, termo: versao });
	});

	it("fica fechado quando a versão da API não é a da página do termo", async () => {
		versaoNaApi("2026-01-01");
		render(<FormularioConta modo="cadastro" />);

		await waitFor(() =>
			expect(screen.getByRole("status").textContent).toBe(
				"O cadastro está indisponível no momento.",
			),
		);
		expect(
			screen.queryByRole("link", { name: "o termo de consentimento" }),
		).toBeNull();
		expect(botao().disabled).toBe(true);
	});

	it("faz zero POSTs mesmo se o formulário com versão divergente for enviado", async () => {
		versaoNaApi("2026-01-01");
		render(<FormularioConta modo="cadastro" />);
		await waitFor(() =>
			expect(screen.getByRole("status").textContent).toBe(
				"O cadastro está indisponível no momento.",
			),
		);

		preencherCadastro();
		await act(async () => {
			fireEvent.submit(botao().form as HTMLFormElement);
		});

		expect(
			pedidosAApi.mock.calls.map(([pedido]) => [pedido.method, pedido.url]),
		).toEqual([["GET", "https://api.example.com/contas/termo"]]);
	});
});

describe("o aviso de e-mail na conclusão", () => {
	it("marca o status como ocupado até concluir o pedido da newsletter", async () => {
		let responderInscricao!: (resposta: Response) => void;
		const inscricao = new Promise<Response>((resolver) => {
			responderInscricao = resolver;
		});
		versaoNaApi(VERSAO_DO_TERMO);
		pedidosAApi
			.mockResolvedValueOnce(new Response(null, { status: 204 }))
			.mockReturnValueOnce(inscricao);
		render(<FormularioConta modo="cadastro" />);
		await screen.findByRole("link", { name: "o termo de consentimento" });

		preencherCadastro();
		fireEvent.click(
			screen.getByRole("checkbox", { name: /receber a newsletter/ }),
		);
		fireEvent.click(botao());

		const status = screen.getByRole("status");
		await waitFor(() => expect(status.textContent).toBe(conclusaoDoCadastro));
		expect(screen.getByRole("status", { busy: true })).toBe(status);

		responderInscricao(Response.json({}, { status: 503 }));
		await waitFor(() => {
			expect(screen.getByRole("status", { busy: false })).toBe(status);
			expect(status.textContent).toBe(
				`${conclusaoDoCadastro} A inscrição na newsletter precisa ser tentada novamente.`,
			);
		});
	});

	it.each([
		{
			modo: "reenvio",
			botao: "Reenviar confirmação",
			rotulo: "E-mail",
			valor: "pessoa@example.com",
			conclusao: "Se houver um cadastro pendente, você receberá outro link.",
		},
		{
			modo: "recuperar",
			botao: "Recuperar senha",
			rotulo: "E-mail",
			valor: "pessoa@example.com",
			conclusao:
				"Se houver uma conta confirmada, você receberá um link para redefinir a senha.",
		},
		{
			modo: "excluir",
			botao: "Excluir conta",
			rotulo: "Senha atual",
			valor: "Senha fictícia de cadastro",
			conclusao:
				"Sua conta foi excluída. O comprovante será enviado por e-mail.",
		},
	] as const)(
		"$modo traz o aviso no status",
		async ({ modo, botao, rotulo, valor, conclusao }) => {
			pedidosAApi.mockResolvedValueOnce(new Response(null, { status: 204 }));
			render(<FormularioConta modo={modo} />);

			fireEvent.change(screen.getByLabelText(rotulo), {
				target: { value: valor },
			});
			fireEvent.click(screen.getByRole("button", { name: botao }));

			await waitFor(() =>
				expect(screen.getByRole("status").textContent).toBe(
					`${conclusao} ${avisoDeSpam}`,
				),
			);
		},
	);
});

// As telas da conta no cartaz (DESIGN.md, "Telas da conta").
describe("as telas da conta", () => {
	it.each(MODOS)(
		"%s, sem a API, não pede nada e diz que a conta não funciona ali",
		async (modo) => {
			ambiente.API_URL = "";
			// O "Ver as trilhas" é um Link do roteador, que rola a página ao abrir.
			vi.spyOn(window, "scrollTo").mockImplementation(() => {});
			const raiz = createRootRoute();
			const pagina = createRoute({
				getParentRoute: () => raiz,
				path: "/",
				component: () => <FormularioConta modo={modo} />,
			});
			const router = createRouter({
				routeTree: raiz.addChildren([pagina]),
				history: createMemoryHistory({ initialEntries: ["/"] }),
			});
			const { container } = render(<RouterProvider router={router} />);
			const trilhas = await screen.findByRole("link", {
				name: "Ver as trilhas",
			});
			await act(async () => {});

			expect(trilhas.getAttribute("href")).toBe("/trilhas");
			expect(
				screen.getByText("A conta ainda não funciona neste endereço do site."),
			).toBeTruthy();
			expect(container.querySelector("form")).toBeNull();
			expect(pedidosAApi).not.toHaveBeenCalled();
		},
	);

	it.each([
		{
			modo: "cadastro",
			titulo: "Confira o e-mail",
			frase: conclusaoDoCadastro,
			preencher: preencherCadastro,
			links: [
				["Solicitar outro e-mail de confirmação", "/cadastro/reenvio"],
				["Entrar na conta", "/login"],
			],
		},
		{
			modo: "confirmar",
			titulo: "E-mail confirmado",
			frase: "Seu e-mail foi confirmado.",
			preencher: () => {},
			links: [["Entrar na conta", "/login"]],
		},
		{
			modo: "reenvio",
			titulo: "Confira o e-mail",
			frase: `Se houver um cadastro pendente, você receberá outro link. ${avisoDeSpam}`,
			preencher: () => escrever("E-mail", "pessoa@example.com"),
			links: [["Entrar na conta", "/login"]],
		},
		{
			modo: "recuperar",
			titulo: "Confira o e-mail",
			frase: `Se houver uma conta confirmada, você receberá um link para redefinir a senha. ${avisoDeSpam}`,
			preencher: () => escrever("E-mail", "pessoa@example.com"),
			links: [["Entrar na conta", "/login"]],
		},
		{
			modo: "redefinir",
			titulo: "Senha alterada",
			frase: "Sua senha foi alterada. Entre novamente para continuar.",
			preencher: () => {
				escrever("Senha (12 a 128 caracteres)", SENHA);
				escrever("Confirmar senha", SENHA);
			},
			links: [["Entrar na conta", "/login"]],
		},
		{
			modo: "excluir",
			titulo: "Conta excluída",
			frase: `Sua conta foi excluída. O comprovante será enviado por e-mail. ${avisoDeSpam}`,
			preencher: () => escrever("Senha atual", SENHA),
			links: [["Ir para o início", "/"]],
		},
	] as const)(
		"$modo, na conclusão, troca o título, leva o foco a ele e lê a frase",
		async ({ modo, titulo, frase, preencher, links }) => {
			// A confirmação e a redefinição leem o código do link no endereço.
			window.history.replaceState(null, "", "/cadastro#codigo-ficticio");
			if (modo === "cadastro") versaoNaApi(VERSAO_DO_TERMO);
			pedidosAApi.mockResolvedValueOnce(new Response(null, { status: 204 }));
			const { container } = render(<FormularioConta modo={modo} />);
			if (modo === "cadastro")
				await screen.findByRole("link", { name: "o termo de consentimento" });

			preencher();
			fireEvent.click(screen.getByRole("button", { name: titulos[modo] }));
			const novo = await screen.findByRole("heading", {
				level: 1,
				name: titulo,
			});

			await waitFor(() => expect(document.activeElement).toBe(novo));
			expect(screen.getByRole("status").textContent).toBe(frase);
			expect(container.querySelector("form")).toBeNull();
			expect(linksEntreAsTelas()).toEqual(links);
		},
	);

	it("enquanto envia, deixa o foco no botão, com o aria-disabled, e não manda o segundo envio", async () => {
		let responder!: (resposta: Response) => void;
		pedidosAApi.mockReturnValueOnce(
			new Promise<Response>((resolver) => {
				responder = resolver;
			}),
		);
		render(<FormularioConta modo="reenvio" />);
		escrever("E-mail", "pessoa@example.com");
		const enviar = screen.getByRole("button", {
			name: "Reenviar confirmação",
		}) as HTMLButtonElement;
		enviar.focus();

		fireEvent.click(enviar);
		await act(async () => {});

		expect(enviar.getAttribute("aria-disabled")).toBe("true");
		expect(enviar.disabled).toBe(false);
		expect(document.activeElement).toBe(enviar);
		expect(screen.getByRole("status").textContent).toBe("Aguarde…");
		expect((screen.getByLabelText("E-mail") as HTMLInputElement).readOnly).toBe(
			true,
		);

		fireEvent.click(enviar);
		await act(async () => {});
		expect(pedidosAApi).toHaveBeenCalledTimes(1);

		await act(async () => responder(new Response(null, { status: 204 })));
		await screen.findByRole("heading", { level: 1, name: "Confira o e-mail" });
		expect(pedidosAApi).toHaveBeenCalledTimes(1);
	});

	it("leva o foco ao primeiro campo com erro, ligado à mensagem pelo aria-describedby", () => {
		render(<FormularioConta modo="login" />);

		fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

		const email = screen.getByRole("textbox", {
			name: "E-mail",
			description: "Preencha este campo.",
		});
		expect(document.activeElement).toBe(email);
		expect(email.getAttribute("aria-invalid")).toBe("true");
		expect(
			screen
				.getByLabelText("Senha")
				.getAttribute("aria-describedby")
				?.split(" ")
				.map((id) => document.getElementById(id)?.textContent),
		).toEqual(["Preencha este campo."]);
		expect(pedidosAApi).not.toHaveBeenCalled();
	});

	it("mostra o erro da API e o da rede embaixo do botão, e o botão volta", async () => {
		pedidosAApi
			.mockResolvedValueOnce(new Response(null, { status: 401 }))
			.mockRejectedValueOnce(new TypeError("Failed to fetch"));
		const { container } = render(<FormularioConta modo="login" />);
		escrever("E-mail", "pessoa@example.com");
		escrever("Senha", SENHA);
		const entrar = screen.getByRole("button", { name: "Entrar" });
		const status = screen.getByRole("status");
		// No computador, o lugar de cada erro e o do link que o 401 traz já
		// existem, invisíveis: o login recusado não sobe o formulário.
		const errosGuardados = [
			...container.querySelectorAll(".conta-erro-guardado"),
		].map((frase) => frase.textContent);
		const reenvio = container
			.querySelector('a[href="/cadastro/reenvio"]')
			?.closest("li");
		expect(reenvio?.className).toBe("conta-link-guardado");
		expect(reenvio?.getAttribute("aria-hidden")).toBe("true");
		expect(reenvio?.hasAttribute("inert")).toBe(true);

		fireEvent.click(entrar);
		await waitFor(() =>
			expect(status.textContent).toBe(
				"Confira o e-mail, a senha e a confirmação do cadastro.",
			),
		);
		expect(errosGuardados).toContain(status.textContent);
		expect(status.classList.contains("ainda-nao")).toBe(true);
		expect(entrar.getAttribute("aria-disabled")).toBeNull();
		expect(linksEntreAsTelas()).toEqual([
			["Esqueci minha senha", "/cadastro/recuperar"],
			["Criar conta", "/cadastro"],
			["Solicitar outro e-mail de confirmação", "/cadastro/reenvio"],
		]);
		expect(reenvio?.hasAttribute("class")).toBe(false);
		expect(reenvio?.hasAttribute("inert")).toBe(false);

		// A rede caiu: o cliente gerado devolve o erro, sem a resposta.
		fireEvent.click(entrar);
		await waitFor(() =>
			expect(status.textContent).toBe("Confira sua conexão e tente novamente."),
		);
		expect(errosGuardados).toContain(status.textContent);
		expect(status.classList.contains("ainda-nao")).toBe(true);
		expect(entrar.getAttribute("aria-disabled")).toBeNull();
	});

	it.each([
		{
			modo: "login",
			links: [
				["Esqueci minha senha", "/cadastro/recuperar"],
				["Criar conta", "/cadastro"],
			],
		},
		{ modo: "cadastro", links: [["Entrar na conta", "/login"]] },
		{
			modo: "confirmar",
			links: [["Solicitar outro e-mail de confirmação", "/cadastro/reenvio"]],
		},
		{ modo: "reenvio", links: [["Entrar na conta", "/login"]] },
		{ modo: "recuperar", links: [["Entrar na conta", "/login"]] },
		{
			modo: "redefinir",
			links: [["Solicitar outro link", "/cadastro/recuperar"]],
		},
		{ modo: "excluir", links: [["Voltar ao perfil", "/perfil"]] },
	] as const)("$modo leva às outras telas", ({ modo, links }) => {
		if (modo === "cadastro") versaoNaApi(VERSAO_DO_TERMO);
		render(<FormularioConta modo={modo} />);

		expect(linksEntreAsTelas()).toEqual(links);
	});

	it("no login, deixa o formulário inerte e invisível enquanto confere a sessão", () => {
		const { container, rerender } = render(
			<FormularioConta modo="login" sessao="verificando" />,
		);
		const formulario = container.querySelector("form");

		expect(formulario?.hasAttribute("inert")).toBe(true);
		expect(formulario?.classList.contains("invisible")).toBe(true);
		expect(screen.getAllByRole("status")[0].textContent).toBe(
			"Verificando sua sessão…",
		);

		rerender(<FormularioConta modo="login" sessao="indisponivel" />);
		expect(formulario?.hasAttribute("inert")).toBe(true);
		const alerta = screen.getByRole("alert");
		expect(alerta.textContent).toContain(
			"Não foi possível consultar sua conta.",
		);
		expect(
			within(alerta)
				.getByRole("link", { name: "Tentar novamente" })
				.getAttribute("href"),
		).toBe("/login");

		rerender(<FormularioConta modo="login" sessao="visitante" />);
		expect(formulario?.hasAttribute("inert")).toBe(false);
		expect(formulario?.classList.contains("invisible")).toBe(false);
		expect(screen.queryByText("Verificando sua sessão…")).toBeNull();
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("dá ao título a letra da palavra mais larga de todos os títulos da tela", () => {
		render(<FormularioConta modo="redefinir" />);
		const titulo = screen.getByRole("heading", { level: 1 });
		const antes = tetoDoTitulo("Definir nova senha", "titulo-condensado");
		const depois = tetoDoTitulo("Senha alterada", "titulo-condensado");

		// ALTERADA, do título da conclusão, é mais larga que DEFINIR.
		expect(depois).toBeGreaterThan(antes);
		expect(titulo.style.getPropertyValue("--palavra")).toBe(String(depois));
	});

	it("não segue, no segundo e no terceiro clique, o link que nasce no lugar do botão", async () => {
		pedidosAApi.mockResolvedValueOnce(new Response(null, { status: 204 }));
		render(<FormularioConta modo="confirmar" />);
		fireEvent.click(screen.getByRole("button", { name: "Confirmar e-mail" }));
		const entrar = await screen.findByRole("link", { name: "Entrar na conta" });
		const seguidos: boolean[] = [];
		// Depois do onClick do React, anota se o link seria seguido e para o
		// jsdom, que não navega.
		const anotar = (evento: MouseEvent) => {
			seguidos.push(!evento.defaultPrevented);
			evento.preventDefault();
		};
		document.addEventListener("click", anotar);

		fireEvent.click(entrar, { detail: 2 });
		fireEvent.click(entrar, { detail: 3 });
		fireEvent.click(entrar, { detail: 1 });
		document.removeEventListener("click", anotar);

		expect(seguidos).toEqual([false, false, true]);
	});
});
