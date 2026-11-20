// @vitest-environment jsdom

import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VERSAO_DO_TERMO } from "@/lib/termo";
import { FormularioConta } from "./formulario-conta";

// O cadastro pede à API a versão e o endereço do termo (GET /contas/termo). O
// link da caixa de aceite leva ao endereço que a API devolve, em outra aba, e o
// cadastro só abre com a versão da API igual à da página do termo: com outra, a
// pessoa aceitaria um texto que não leu.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.example.com" } }));

const pedidosAApi = vi.fn<(pedido: Request) => Promise<Response>>();

/** O endereço do termo na API: outro que o da página, para o link vir dela. */
const ENDERECO_NA_API = "https://termo.example.com/termo";

/** A API responde ao GET /contas/termo com esta versão. */
function versaoNaApi(versao: string) {
	pedidosAApi.mockResolvedValueOnce(
		Response.json({ versao, url: ENDERECO_NA_API }),
	);
}

const botao = () =>
	screen.getByRole("button", { name: "Criar conta" }) as HTMLButtonElement;

function preencherCadastro() {
	const senha = "Senha fictícia de cadastro";
	fireEvent.change(screen.getByLabelText("Nome completo"), {
		target: { value: "Pessoa fictícia" },
	});
	fireEvent.change(screen.getByLabelText("E-mail"), {
		target: { value: "pessoa@example.com" },
	});
	fireEvent.change(screen.getByLabelText("Senha (12 a 128 caracteres)"), {
		target: { value: senha },
	});
	fireEvent.change(screen.getByLabelText("Confirmar senha"), {
		target: { value: senha },
	});
	fireEvent.click(screen.getByRole("checkbox", { name: /li e aceito/ }));
}

beforeEach(() => {
	pedidosAApi.mockReset();
	vi.stubGlobal("fetch", pedidosAApi);
});

afterEach(() => {
	cleanup();
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
		await screen.findByText(
			"Confira sua caixa de entrada para confirmar o cadastro.",
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

		expect(
			await screen.findByText("O cadastro está indisponível no momento."),
		).toBeTruthy();
		expect(
			screen.queryByRole("link", { name: "o termo de consentimento" }),
		).toBeNull();
		expect(botao().disabled).toBe(true);
	});

	it("faz zero POSTs mesmo se o formulário com versão divergente for enviado", async () => {
		versaoNaApi("2026-01-01");
		render(<FormularioConta modo="cadastro" />);
		await screen.findByText("O cadastro está indisponível no momento.");

		preencherCadastro();
		await act(async () => {
			fireEvent.submit(botao().form as HTMLFormElement);
		});

		expect(
			pedidosAApi.mock.calls.map(([pedido]) => [pedido.method, pedido.url]),
		).toEqual([["GET", "https://api.example.com/contas/termo"]]);
	});
});
