// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Progresso = typeof import("./progresso");

const CHAVE = "mandatometro:artigos-lidos";
const artigos = [
	{ trilha: "processo-legislativo", slug: "quem-pode-propor-uma-lei" },
	{ trilha: "processo-legislativo", slug: "onde-o-projeto-comeca" },
	{ trilha: "processo-legislativo", slug: "o-projeto-passa-pelas-comissoes" },
];

let progresso: Progresso;

beforeEach(async () => {
	localStorage.clear();
	vi.resetModules();
	progresso = await import("./progresso");
});

afterEach(() => {
	vi.restoreAllMocks();
});

function Contador() {
	const lidos = progresso.useArtigosLidos();
	return <p>{`${lidos.size} lidos`}</p>;
}

describe("artigos lidos", () => {
	it("começa sem nenhum artigo lido", () => {
		expect(progresso.lerLidos().size).toBe(0);
	});

	it("guarda só os ids dos artigos lidos, sem repetir", () => {
		progresso.marcarLido("processo-legislativo/quem-pode-propor-uma-lei");
		progresso.marcarLido("processo-legislativo/quem-pode-propor-uma-lei");

		expect(JSON.parse(localStorage.getItem(CHAVE) ?? "")).toEqual([
			"processo-legislativo/quem-pode-propor-uma-lei",
		]);
		expect(progresso.lerLidos()).toEqual(
			new Set(["processo-legislativo/quem-pode-propor-uma-lei"]),
		);
	});

	it("ignora o que não for uma lista de ids", () => {
		localStorage.setItem(CHAVE, "{quebrado");
		expect(progresso.lerLidos().size).toBe(0);

		localStorage.setItem(CHAVE, JSON.stringify({ lidos: ["a/b"] }));
		expect(progresso.lerLidos().size).toBe(0);

		localStorage.setItem(CHAVE, JSON.stringify(["a/b", 3, null]));
		expect(progresso.lerLidos()).toEqual(new Set(["a/b"]));
	});

	it("funciona sem erro com o armazenamento bloqueado e lembra o lido até sair da página", () => {
		const bloqueado = () => {
			throw new DOMException("bloqueado", "SecurityError");
		};
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(bloqueado);
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(bloqueado);

		expect(progresso.lerLidos().size).toBe(0);
		expect(() => progresso.marcarLido("a/b")).not.toThrow();
		expect(progresso.lerLidos()).toEqual(new Set(["a/b"]));
	});

	it("acha o primeiro artigo não lido, na ordem da trilha", () => {
		const lidos = new Set(["processo-legislativo/quem-pode-propor-uma-lei"]);

		expect(progresso.primeiroNaoLido(artigos, lidos)?.slug).toBe(
			"onde-o-projeto-comeca",
		);
		expect(progresso.contarLidos(artigos, lidos)).toBe(1);
	});

	it("não acha nenhum não lido quando a trilha terminou", () => {
		const lidos = new Set(artigos.map(progresso.idDoArtigo));

		expect(progresso.primeiroNaoLido(artigos, lidos)).toBeUndefined();
		expect(progresso.contarLidos(artigos, lidos)).toBe(3);
	});

	it("conta só os artigos que ainda existem na trilha", () => {
		const lidos = new Set([
			"processo-legislativo/quem-pode-propor-uma-lei",
			"processo-legislativo/artigo-que-saiu",
		]);

		expect(progresso.contarLidos(artigos, lidos)).toBe(1);
	});
});

describe("useArtigosLidos", () => {
	it("no servidor, mostra a trilha como nova", () => {
		localStorage.setItem(CHAVE, JSON.stringify(["a/b"]));

		expect(renderToString(<Contador />)).toContain("0 lidos");
	});

	it("hidrata sem erro e mostra o progresso depois", async () => {
		localStorage.setItem(CHAVE, JSON.stringify(["a/b"]));
		const raiz = document.createElement("div");
		raiz.innerHTML = renderToString(<Contador />);
		document.body.append(raiz);
		const erros = vi.fn();
		const consoleErro = vi.spyOn(console, "error");

		await act(async () => {
			hydrateRoot(raiz, <Contador />, { onRecoverableError: erros });
		});

		expect(erros).not.toHaveBeenCalled();
		expect(consoleErro).not.toHaveBeenCalled();
		expect(raiz.textContent).toBe("1 lidos");
		raiz.remove();
	});

	it("atualiza quando um artigo é marcado como lido", () => {
		const { result } = renderHook(() => progresso.useArtigosLidos());
		expect(result.current.size).toBe(0);

		act(() => progresso.marcarLido("a/b"));

		expect(result.current).toEqual(new Set(["a/b"]));
	});

	it("atualiza quando outra aba marca um artigo", () => {
		const { result } = renderHook(() => progresso.useArtigosLidos());

		act(() => {
			localStorage.setItem(CHAVE, JSON.stringify(["a/b"]));
			window.dispatchEvent(new StorageEvent("storage", { key: CHAVE }));
		});

		expect(result.current).toEqual(new Set(["a/b"]));
	});
});
