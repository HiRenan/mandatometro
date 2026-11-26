// @vitest-environment jsdom

import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	ENVIANDO_OPINIAO,
	MUITAS_OPINIOES,
	OPINIAO_ENVIADA,
	OPINIAO_FORA_DO_AR,
	TEXTO_INVALIDO,
} from "@/lib/opiniao";
import { enviarOpiniao } from "@/lib/opiniao.functions";
import { FormularioDeOpiniao } from "./formulario-de-opiniao";

vi.mock("@/lib/opiniao.functions", () => ({ enviarOpiniao: vi.fn() }));
const enviar = vi.mocked(enviarOpiniao);

beforeEach(() => {
	enviar.mockReset();
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function abrir() {
	render(<FormularioDeOpiniao />);
	return {
		campo: screen.getByRole<HTMLTextAreaElement>("textbox", {
			name: "O que funcionou e o que pode melhorar?",
		}),
		botao: screen.getByRole("button", { name: "Enviar opinião" }),
	};
}

function escrever(campo: HTMLTextAreaElement, value: string) {
	fireEvent.change(campo, { target: { value } });
}

const semAviso = { ignore: "[role='status']" };

it("envia uma só vez, sem cookie, e confirma com foco no link do início", async () => {
	let confirmar: (resultado: "enviada") => void = () => {};
	enviar.mockReturnValue(
		new Promise((resolve) => {
			confirmar = resolve;
		}),
	);
	const { campo, botao } = abrir();
	expect(
		screen.getByRole("group", { name: /Como foi usar o site/ }),
	).toBeTruthy();
	expect(screen.getByRole("group", { name: /O que você usou/ })).toBeTruthy();
	fireEvent.click(screen.getByRole("radio", { name: "4" }));
	fireEvent.click(screen.getByRole("checkbox", { name: "Edições" }));
	escrever(campo, "  Gostei das edições.  ");
	botao.focus();
	fireEvent.click(botao);
	fireEvent.click(botao);

	expect(enviar).toHaveBeenCalledTimes(1);
	expect(enviar.mock.calls[0][0].data).toEqual({
		nota: 4,
		partes: ["edicoes"],
		texto: "Gostei das edições.",
		site: "",
	});
	expect(document.activeElement).toBe(botao);
	expect(botao.getAttribute("aria-disabled")).toBe("true");
	expect(screen.getByRole("status").textContent).toBe(ENVIANDO_OPINIAO);
	const fetch = vi.fn(async () => new Response(null, { status: 200 }));
	vi.stubGlobal("fetch", fetch);
	await enviar.mock.calls[0][0].fetch?.("https://example.com/opiniao", {
		credentials: "same-origin",
	});
	expect(fetch).toHaveBeenCalledWith("https://example.com/opiniao", {
		credentials: "omit",
	});

	await act(async () => confirmar("enviada"));
	expect(screen.getByText(OPINIAO_ENVIADA, semAviso)).toBeTruthy();
	expect(screen.getByRole("status").textContent).toBe(OPINIAO_ENVIADA);
	expect(screen.queryByRole("textbox")).toBeNull();
	const voltar = screen.getByRole("link", { name: "Voltar ao início" });
	expect(voltar.getAttribute("href")).toBe("/");
	expect(document.activeElement).toBe(voltar);
});

it("conta até 2.000 caracteres, inclusive quando um caractere ocupa dois códigos UTF-16", () => {
	const { campo } = abrir();
	expect(screen.getByText("0 de 2.000 caracteres")).toBeTruthy();
	escrever(campo, "Oi 🎲");
	expect(screen.getByText("4 de 2.000 caracteres")).toBeTruthy();
	escrever(campo, "🎲".repeat(2001));
	expect(campo.value).toBe("🎲".repeat(2000));
	expect(screen.getByText("2.000 de 2.000 caracteres")).toBeTruthy();
});

it("recusa só espaços e liga a mensagem ao campo antes de devolver o foco", () => {
	const { campo, botao } = abrir();
	escrever(campo, "  ");
	fireEvent.click(botao);
	expect(enviar).not.toHaveBeenCalled();
	const falta = screen.getByText(TEXTO_INVALIDO, semAviso);
	expect(campo.getAttribute("aria-invalid")).toBe("true");
	expect(campo.getAttribute("aria-describedby")?.split(" ")).toContain(
		falta.id,
	);
	expect(document.activeElement).toBe(campo);
});

it.each([
	["texto-invalido", TEXTO_INVALIDO],
	["limite", MUITAS_OPINIOES],
	["fora-do-ar", OPINIAO_FORA_DO_AR],
] as const)(
	"mostra a mensagem fixa de %s e mantém o que a pessoa escreveu",
	async (tipo, mensagem) => {
		if (tipo === "fora-do-ar") {
			enviar.mockRejectedValue(
				new Error("Resposta bruta com conteúdo de teste."),
			);
		} else {
			enviar.mockResolvedValue(tipo);
		}
		const { campo, botao } = abrir();
		const jogo = screen.getByRole<HTMLInputElement>("checkbox", {
			name: "Jogos",
		});
		fireEvent.click(jogo);
		escrever(campo, "Queria mais jogos.");
		await act(async () => fireEvent.click(botao));
		expect(screen.getByText(mensagem, semAviso)).toBeTruthy();
		expect(screen.getByRole("status").textContent).toBe(mensagem);
		expect(campo.value).toBe("Queria mais jogos.");
		expect(jogo.checked).toBe(true);
		expect(botao.hasAttribute("aria-disabled")).toBe(false);
		expect(
			screen.queryByText("Resposta bruta com conteúdo de teste."),
		).toBeNull();
	},
);
