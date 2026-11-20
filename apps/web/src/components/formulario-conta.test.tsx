// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { termoConta } from "@/client";
import { VERSAO_DO_TERMO } from "@/lib/termo";
import { FormularioConta } from "./formulario-conta";

// O cadastro pede à API a versão e o endereço do termo (GET /contas/termo). O
// link da caixa de aceite leva ao endereço que a API devolve, em outra aba, e o
// cadastro só abre com a versão da API igual à da página do termo: com outra, a
// pessoa aceitaria um texto que não leu.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.example.com" } }));
vi.mock("@/client", () => ({
	cadastrarConta: vi.fn(),
	confirmarConta: vi.fn(),
	entrarConta: vi.fn(),
	excluirConta: vi.fn(),
	recuperarConta: vi.fn(),
	redefinirSenha: vi.fn(),
	reenviarConfirmacao: vi.fn(),
	termoConta: vi.fn(),
}));

const termo = vi.mocked(termoConta);

/** O endereço do termo na API: outro que o da página, para o link vir dela. */
const ENDERECO_NA_API = "https://termo.example.com/termo";

/** A API responde ao GET /contas/termo com esta versão. */
function versaoNaApi(versao: string) {
	termo.mockResolvedValue({
		data: { versao, url: ENDERECO_NA_API },
		request: new Request("https://api.example.com/contas/termo"),
		response: new Response(null, { status: 200 }),
	} as never);
}

const botao = () =>
	screen.getByRole("button", { name: "Criar conta" }) as HTMLButtonElement;

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(cleanup);

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
});
