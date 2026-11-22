import { describe, expect, it } from "vitest";
import {
	enderecoDoParlamentar,
	idDaVotacao,
	idDoParlamentar,
	nomeNoEndereco,
} from "./endereco";

describe("o nome no endereço", () => {
	it("tira o acento, passa a minúsculas e troca o espaço por hífen", () => {
		expect(nomeNoEndereco("Ágata Cedrolume")).toBe("agata-cedrolume");
		expect(
			nomeNoEndereco("Maria Aparecida Quinemar Belombre de Tavaquil"),
		).toBe("maria-aparecida-quinemar-belombre-de-tavaquil");
	});

	it("o apóstrofo some sem hífen, e o hífen do nome fica", () => {
		expect(nomeNoEndereco("Íris Dell'Ombre")).toBe("iris-dellombre");
		expect(nomeNoEndereco("Íris Dell’Ombre")).toBe("iris-dellombre");
		expect(nomeNoEndereco("João-Pedro Varustel")).toBe("joao-pedro-varustel");
	});

	it("o cedilha e o til viram a letra sem o sinal", () => {
		expect(nomeNoEndereco("Conceição Ãngelo")).toBe("conceicao-angelo");
	});
});

describe("o endereço da página", () => {
	it("junta o id e o nome", () => {
		expect(enderecoDoParlamentar({ id: 81, nome: "Ágata Cedrolume" })).toBe(
			"81-agata-cedrolume",
		);
	});

	it("um nome sem letra nem número fica só com o id", () => {
		expect(enderecoDoParlamentar({ id: 81, nome: "—" })).toBe("81");
	});
});

describe("o id no endereço", () => {
	it("acha o id com o nome certo, com um nome antigo e sem nome", () => {
		expect(idDoParlamentar("81-agata-cedrolume")).toBe(81);
		expect(idDoParlamentar("81-nome-antigo")).toBe(81);
		expect(idDoParlamentar("81")).toBe(81);
	});

	it("o que não começa por um id válido não é parlamentar nenhum", () => {
		for (const valor of [
			"081",
			"0",
			"",
			"abc",
			"-81",
			"81 ",
			"2147483648",
			81,
		]) {
			expect(idDoParlamentar(valor), String(valor)).toBeNull();
		}
		expect(idDoParlamentar("2147483647")).toBe(2_147_483_647);
	});

	it("a votação usa só o id, sem nome", () => {
		expect(idDaVotacao("139")).toBe(139);
		expect(idDaVotacao("139-nome")).toBeNull();
		expect(idDaVotacao("0139")).toBeNull();
	});
});
