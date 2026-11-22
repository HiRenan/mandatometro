import { describe, expect, it } from "vitest";
import { enderecoDoPlayer, enderecoNoYoutube, idDoVideo } from "./video";

describe("idDoVideo", () => {
	it("lê o id do endereço do contrato: o watch do YouTube, com 11 caracteres", () => {
		expect(idDoVideo("https://www.youtube.com/watch?v=Mnd268Cam01")).toBe(
			"Mnd268Cam01",
		);
		expect(idDoVideo("https://www.youtube.com/watch?v=a-b_c1D2e3F")).toBe(
			"a-b_c1D2e3F",
		);
	});

	it("qualquer outro valor fica sem vídeo", () => {
		for (const endereco of [
			null,
			undefined,
			42,
			"",
			"https://youtu.be/Mnd268Cam01",
			"http://www.youtube.com/watch?v=Mnd268Cam01",
			"https://youtube.com/watch?v=Mnd268Cam01",
			"https://www.youtube.com/watch?v=Mnd268Cam0",
			"https://www.youtube.com/watch?v=Mnd268Cam012",
			"https://www.youtube.com/watch?v=Mnd268Cam01&t=90",
			"https://www.youtube.com/watch?v=Mnd268Cam0!",
			"https://exemplo.test/?https://www.youtube.com/watch?v=Mnd268Cam01",
			"javascript:alert(1)//https://www.youtube.com/watch?v=Mnd268Cam01",
		]) {
			expect(idDoVideo(endereco)).toBeNull();
		}
	});
});

describe("os endereços do vídeo", () => {
	it("o player é o do youtube-nocookie.com, e o link sem JavaScript vai ao YouTube", () => {
		expect(enderecoDoPlayer("Mnd268Cam01")).toBe(
			"https://www.youtube-nocookie.com/embed/Mnd268Cam01?autoplay=1",
		);
		expect(enderecoNoYoutube("Mnd268Cam01")).toBe(
			"https://www.youtube.com/watch?v=Mnd268Cam01",
		);
	});
});
