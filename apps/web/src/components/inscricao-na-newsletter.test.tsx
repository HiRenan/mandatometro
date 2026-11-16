// @vitest-environment jsdom

import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	pedirInscricao,
	type ResultadoDaInscricao,
	type Situacao,
} from "@/lib/newsletter";
import { InscricaoNaNewsletter } from "./inscricao-na-newsletter";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site. O pedido à API fica simulado: o que cada resposta da API vira
// está no lib/newsletter.test.ts, e aqui vale o que a folha faz com o resultado.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));
vi.mock("@/lib/newsletter", async (original) => ({
	...(await original<typeof import("@/lib/newsletter")>()),
	pedirInscricao: vi.fn(),
}));

const pedir = vi.mocked(pedirInscricao);
const EMAIL = "pessoa@example.com";

const FEITO: Record<Situacao, string> = {
	edicao_enviada:
		"Inscrição realizada. Enviamos para o seu e-mail a última edição publicada.",
	aguardando_edicao:
		"Inscrição realizada. A primeira edição ainda não saiu: ela chega no seu e-mail quando for publicada.",
	envio_indisponivel:
		"Inscrição realizada. Não conseguimos confirmar o envio da última edição agora. Se ela não chegar, tente de novo mais tarde.",
};
const VAZIO = "Escreva o seu e-mail para receber a newsletter.";
const CONFIRA = "Confira o e-mail: falta alguma parte, como o @ ou o domínio.";
const FORA_DO_AR =
	"Não conseguimos registrar a inscrição agora. Espere alguns minutos e tente de novo.";
const SEM_CONEXAO =
	"Não deu para enviar a inscrição. Confira a internet e tente de novo.";

beforeEach(() => {
	pedir.mockReset();
	localStorage.clear();
	sessionStorage.clear();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

function mostrar() {
	render(<InscricaoNaNewsletter />);
	return {
		campo: screen.getByLabelText<HTMLInputElement>("Seu e-mail"),
		botao: screen.getByRole("button", { name: "Receber a newsletter" }),
	};
}

/** Escreve no campo e aperta o botão, com o foco nele, como no clique. */
async function enviar(texto: string) {
	const { campo, botao } = mostrar();
	fireEvent.change(campo, { target: { value: texto } });
	botao.focus();
	await act(async () => {
		fireEvent.click(botao);
	});
	return { campo, botao };
}

/** A API responde com o resultado. */
function responder(resultado: ResultadoDaInscricao) {
	pedir.mockResolvedValue(resultado);
}

/** O texto à vista na folha: o aviso do leitor de tela repete o mesmo texto. */
const SEM_O_AVISO = { ignore: "[role='status'], script, style" };

function naTela(texto: string) {
	return screen.getByText(texto, SEM_O_AVISO);
}

function talvezNaTela(texto: string) {
	return screen.queryByText(texto, SEM_O_AVISO);
}

/** O aviso do leitor de tela: a região que já vem vazia no HTML. */
function aviso() {
	return screen.getByRole("status").textContent;
}

describe("a folha da newsletter", () => {
	it("tem o título, a faixa, a abertura, o campo com o rótulo, o botão e a nota", () => {
		const { campo, botao } = mostrar();

		const folha = screen.getByRole("region", { name: "O jornal legislativo" });
		const titulo = within(folha).getByRole("heading", { level: 2 });
		expect(titulo.id).toBe("newsletter");
		expect(folha.textContent).toContain(
			"O que o Congresso votou na semana, explicado em linguagem simples. Quem se inscreve recebe na hora a última edição publicada.",
		);
		expect(
			[...folha.querySelectorAll(".faixa > span")].map(
				(parte) => parte.textContent,
			),
		).toEqual(["Todo domingo", "Câmara e Senado", "Link oficial em cada item"]);
		expect(folha.textContent).toContain(
			"O e-mail serve só para mandar a newsletter. Para sair, use o link no fim de cada edição.",
		);
		expect(botao.getAttribute("type")).toBe("submit");
		expect(campo.form).toBe(botao.closest("form"));
		// Um campo só, o do e-mail.
		expect(folha.querySelectorAll("input, select, textarea")).toHaveLength(1);
		expect(aviso()).toBe("");
	});

	it("o campo é de e-mail, com o preenchimento automático, sem corretor e sem a validação do navegador", () => {
		const { campo } = mostrar();

		expect(campo.type).toBe("email");
		expect(campo.name).toBe("email");
		expect(campo.getAttribute("autocomplete")).toBe("email");
		expect(campo.getAttribute("spellcheck")).toBe("false");
		// A mensagem do erro é a da folha, e não o balão do navegador.
		expect(campo.form?.noValidate).toBe(true);
		expect(campo.required).toBe(false);
		expect(campo.hasAttribute("aria-invalid")).toBe(false);
	});

	it("deixa os azulejos fora do leitor de tela", () => {
		mostrar();

		const azulejos = document.querySelectorAll(".grande");
		expect(azulejos).toHaveLength(6);
		for (const azulejo of azulejos) {
			expect(azulejo.closest("[aria-hidden='true']")).not.toBeNull();
		}
	});
});

describe("o e-mail que falta", () => {
	it.each([
		["vazio", "", VAZIO],
		["só com espaço", "   ", VAZIO],
		// O espaço que não quebra, de um texto colado: o navegador não o tira.
		["só com o espaço que não quebra", "  ", VAZIO],
		["sem o domínio", "pessoa@", CONFIRA],
		["sem o @", "pessoa.example.com", CONFIRA],
	])(
		"%s: a folha pede o e-mail no campo, sem chamar a API",
		async (_, texto, mensagem) => {
			const { campo, botao } = await enviar(texto);

			expect(pedir).not.toHaveBeenCalled();
			const erro = naTela(mensagem);
			expect(campo.getAttribute("aria-invalid")).toBe("true");
			expect(campo.getAttribute("aria-describedby")).toBe(erro.id);
			expect(document.activeElement).toBe(campo);
			// O texto fica no campo, como o navegador guarda: o campo de e-mail tira das
			// pontas os espaços comuns, e não o que não quebra.
			expect(campo.value).toBe(texto.replace(/^ +| +$/g, ""));
			expect(aviso()).toBe(mensagem);
			expect(botao.hasAttribute("aria-disabled")).toBe(false);
		},
	);

	it("o Enter no campo também confere o e-mail", async () => {
		const { campo } = mostrar();
		fireEvent.change(campo, { target: { value: "pessoa@" } });

		await act(async () => {
			fireEvent.submit(campo.form as HTMLFormElement);
		});

		expect(pedir).not.toHaveBeenCalled();
		expect(naTela(CONFIRA)).toBeTruthy();
	});
});

describe("a inscrição", () => {
	it.each(Object.entries(FEITO) as [Situacao, string][])(
		"com %s, a folha diz o que aconteceu, anuncia e esvazia o campo",
		async (situacao, texto) => {
			responder({ tipo: "inscrita", situacao });

			const { campo, botao } = await enviar(`  ${EMAIL} `);

			expect(pedir.mock.calls).toEqual([[EMAIL]]);
			expect(naTela(texto)).toBeTruthy();
			expect(aviso()).toBe(texto);
			expect(campo.value).toBe("");
			expect(campo.hasAttribute("aria-invalid")).toBe(false);
			expect(campo.hasAttribute("aria-describedby")).toBe(false);
			// O foco fica no botão, onde a pessoa estava.
			expect(document.activeElement).toBe(botao);
		},
	);

	it("com o e-mail que a API recusa, pede para conferir, guarda o texto e leva o foco ao campo", async () => {
		responder({ tipo: "email-invalido" });

		const { campo } = await enviar("pessoa@example.test");

		const erro = naTela(CONFIRA);
		expect(campo.value).toBe("pessoa@example.test");
		expect(campo.getAttribute("aria-invalid")).toBe("true");
		expect(campo.getAttribute("aria-describedby")).toBe(erro.id);
		expect(document.activeElement).toBe(campo);
		expect(aviso()).toBe(CONFIRA);
	});

	it("o e-mail recusado pela API depois do recusado pela folha também leva o foco ao campo", async () => {
		const { campo, botao } = await enviar("pessoa@");
		expect(document.activeElement).toBe(campo);
		responder({ tipo: "email-invalido" });

		fireEvent.change(campo, { target: { value: "pessoa@example.test" } });
		botao.focus();
		await act(async () => {
			fireEvent.click(botao);
		});

		expect(pedir).toHaveBeenCalledTimes(1);
		expect(campo.getAttribute("aria-invalid")).toBe("true");
		expect(document.activeElement).toBe(campo);
	});

	it.each([
		[
			{ tipo: "limite", segundos: 42 },
			"Muitas inscrições neste minuto. Espere 42 segundos e tente de novo.",
		],
		[
			{ tipo: "limite", segundos: 1 },
			"Muitas inscrições neste minuto. Espere 1 segundo e tente de novo.",
		],
		[
			{ tipo: "limite" },
			"Muitas inscrições neste minuto. Espere um minuto e tente de novo.",
		],
		[{ tipo: "fora-do-ar" }, FORA_DO_AR],
		[{ tipo: "sem-conexao" }, SEM_CONEXAO],
	] as [ResultadoDaInscricao, string][])(
		"com o resultado %o, a folha diz o que fazer, guarda o texto e deixa o foco no botão",
		async (resultado, texto) => {
			responder(resultado);

			const { campo, botao } = await enviar(EMAIL);

			expect(naTela(texto)).toBeTruthy();
			expect(aviso()).toBe(texto);
			expect(campo.value).toBe(EMAIL);
			// O problema não é o e-mail: o campo fica como estava.
			expect(campo.hasAttribute("aria-invalid")).toBe(false);
			expect(document.activeElement).toBe(botao);
		},
	);

	it("se o pedido falha de um jeito inesperado, pede para conferir a internet e libera o botão", async () => {
		pedir.mockRejectedValue(new Error("inesperado"));

		const { campo, botao } = await enviar(EMAIL);

		expect(naTela(SEM_CONEXAO)).toBeTruthy();
		expect(botao.hasAttribute("aria-disabled")).toBe(false);
		expect(campo.readOnly).toBe(false);
	});

	it("e-mail novo e e-mail repetido têm a mesma tela", async () => {
		responder({ tipo: "inscrita", situacao: "aguardando_edicao" });

		const { campo, botao } = await enviar(EMAIL);
		const primeira = screen.getByRole("region").innerHTML;
		fireEvent.change(campo, { target: { value: EMAIL } });
		await act(async () => {
			fireEvent.click(botao);
		});

		expect(pedir).toHaveBeenCalledTimes(2);
		expect(screen.getByRole("region").innerHTML).toBe(primeira);
	});

	it("enquanto espera a API, diz que está enviando e não manda de novo", async () => {
		let soltar: (resultado: ResultadoDaInscricao) => void = () => {};
		pedir.mockImplementation(
			() =>
				new Promise((resolver) => {
					soltar = resolver;
				}),
		);

		const { campo, botao } = await enviar(EMAIL);

		expect(naTela("Enviando a inscrição…")).toBeTruthy();
		expect(aviso()).toBe("Enviando a inscrição…");
		expect(botao.getAttribute("aria-disabled")).toBe("true");
		expect(campo.readOnly).toBe(true);
		// O botão continua com o foco, e o segundo clique e o Enter não mandam outro.
		// O clique no botão com o aria-disabled nem chega a enviar o formulário.
		expect(document.activeElement).toBe(botao);
		let enviou = true;
		await act(async () => {
			enviou = fireEvent.click(botao);
			fireEvent.submit(campo.form as HTMLFormElement);
		});
		expect(enviou).toBe(false);
		expect(pedir).toHaveBeenCalledTimes(1);

		await act(async () => {
			soltar({ tipo: "inscrita", situacao: "aguardando_edicao" });
		});

		expect(talvezNaTela("Enviando a inscrição…")).toBeNull();
		expect(naTela(FEITO.aguardando_edicao)).toBeTruthy();
		expect(botao.hasAttribute("aria-disabled")).toBe(false);
		expect(campo.readOnly).toBe(false);
		expect(pedir).toHaveBeenCalledTimes(1);
	});

	it("a mesma resposta, de novo, é anunciada de novo", async () => {
		responder({ tipo: "fora-do-ar" });
		const { botao } = await enviar(EMAIL);
		expect(aviso()).toBe(FORA_DO_AR);
		let soltar: (resultado: ResultadoDaInscricao) => void = () => {};
		pedir.mockImplementation(
			() =>
				new Promise((resolver) => {
					soltar = resolver;
				}),
		);

		await act(async () => {
			fireEvent.click(botao);
		});
		// O aviso muda no meio: o leitor de tela só lê a região quando o texto muda.
		expect(aviso()).toBe("Enviando a inscrição…");
		await act(async () => {
			soltar({ tipo: "fora-do-ar" });
		});

		expect(aviso()).toBe(FORA_DO_AR);
	});

	it("depois da resposta, aceita um envio novo", async () => {
		responder({ tipo: "fora-do-ar" });
		const { campo, botao } = await enviar(EMAIL);
		responder({ tipo: "inscrita", situacao: "aguardando_edicao" });

		await act(async () => {
			fireEvent.click(botao);
		});

		expect(pedir).toHaveBeenCalledTimes(2);
		expect(talvezNaTela(FORA_DO_AR)).toBeNull();
		expect(naTela(FEITO.aguardando_edicao)).toBeTruthy();
		expect(campo.value).toBe("");
	});
});

describe("o e-mail fica só no pedido", () => {
	it("não vai para a URL, para o armazenamento do navegador nem para o console", async () => {
		const endereco = window.location.href;
		const console_ = (["log", "info", "warn", "error", "debug"] as const).map(
			(metodo) => vi.spyOn(console, metodo),
		);

		responder({ tipo: "email-invalido" });
		const { campo, botao } = await enviar(EMAIL);
		responder({ tipo: "inscrita", situacao: "edicao_enviada" });
		await act(async () => {
			fireEvent.click(botao);
		});

		expect(campo.value).toBe("");
		expect(window.location.href).toBe(endereco);
		expect(window.location.href).not.toContain("pessoa");
		expect(localStorage.length).toBe(0);
		expect(sessionStorage.length).toBe(0);
		expect(document.cookie).toBe("");
		for (const espiao of console_) {
			expect(JSON.stringify(espiao.mock.calls)).not.toContain("pessoa");
		}
	});

	it("no HTML do servidor, o formulário não se envia sem o JavaScript", () => {
		const raiz = document.createElement("div");
		raiz.innerHTML = renderToString(<InscricaoNaNewsletter />)
			.replaceAll("<noscript>", "<div data-noscript>")
			.replaceAll("</noscript>", "</div>");

		const formulario = raiz.querySelector("form");
		// O React troca a função do action por um javascript: que não envia nada:
		// sem o JavaScript da página, o e-mail não sai, nem na URL.
		expect(formulario?.getAttribute("action")).toMatch(/^javascript:/);
		expect(formulario?.getAttribute("method")).toBeNull();
		expect(raiz.querySelector("[data-noscript]")?.textContent).toBe(
			"A inscrição precisa do JavaScript do navegador ligado.",
		);
		expect(raiz.querySelector("[role='status']")?.textContent).toBe("");
	});
});
