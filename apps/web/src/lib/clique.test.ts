import { describe, expect, it, vi } from "vitest";
import { semCliqueDuplo } from "./clique";

describe("semCliqueDuplo", () => {
	it("faz a ação num clique, num toque, no Enter e no espaço", () => {
		const fazer = vi.fn();
		const aoClicar = semCliqueDuplo(fazer);

		aoClicar({ detail: 1 }); // um clique ou um toque
		aoClicar({ detail: 0 }); // o Enter ou o espaço

		expect(fazer).toHaveBeenCalledTimes(2);
	});

	it("ignora o segundo clique de um clique duplo e os que vêm logo depois", () => {
		const fazer = vi.fn();
		const aoClicar = semCliqueDuplo(fazer);

		aoClicar({ detail: 1 });
		aoClicar({ detail: 2 });
		aoClicar({ detail: 3 });

		expect(fazer).toHaveBeenCalledTimes(1);
	});
});
