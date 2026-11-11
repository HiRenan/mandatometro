import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// O endereço do site (APP_BASE_URL), que vai na prévia do link, sai do
// .env.schema conforme o ambiente da Vercel. O teste roda o varlock numa cópia
// do schema, fora do repositório: assim não lê o .env de ninguém nem regrava o
// src/env.ts.

const RAIZ_DO_SITE = fileURLToPath(new URL("../..", import.meta.url));
const VARLOCK = join(RAIZ_DO_SITE, "node_modules", "varlock", "bin", "cli.js");

// As variáveis que mudam o endereço. Cada caso só tem as que ele define.
const VARIAVEIS_DO_ENDERECO = [
	"APP_BASE_URL",
	"VERCEL",
	"VERCEL_ENV",
	"VERCEL_URL",
	"VERCEL_BRANCH_URL",
	"VERCEL_PROJECT_PRODUCTION_URL",
];

let pasta: string;

beforeAll(() => {
	pasta = mkdtempSync(join(tmpdir(), "mandatometro-schema-"));
	copyFileSync(join(RAIZ_DO_SITE, ".env.schema"), join(pasta, ".env.schema"));
});

afterAll(() => {
	rmSync(pasta, { recursive: true, force: true });
});

/** O APP_BASE_URL que o varlock resolve com estas variáveis no ambiente. */
function enderecoDoSite(variaveis: Record<string, string>): string {
	const ambiente: NodeJS.ProcessEnv = { ...process.env };
	for (const nome of VARIAVEIS_DO_ENDERECO) {
		delete ambiente[nome];
	}
	const saida = execFileSync(
		process.execPath,
		[VARLOCK, "load", "--format", "json"],
		{
			cwd: pasta,
			// Os testes rodam sem rede: o varlock não manda a telemetria dele.
			env: { ...ambiente, VARLOCK_TELEMETRY_DISABLED: "1", ...variaveis },
			encoding: "utf8",
		},
	);
	return JSON.parse(saida).APP_BASE_URL;
}

describe("o endereço do site", { timeout: 30_000 }, () => {
	it("fica no localhost fora da Vercel, como no pnpm dev", () => {
		expect(enderecoDoSite({})).toBe("http://localhost:3001");
	});

	it("é o domínio na produção da Vercel", () => {
		expect(
			enderecoDoSite({
				VERCEL: "1",
				VERCEL_ENV: "production",
				VERCEL_BRANCH_URL: "mandatometro-git-main-time.vercel.app",
			}),
		).toBe("https://mandatometro.com.br");
	});

	it("é o endereço da branch nas prévias e na develop", () => {
		expect(
			enderecoDoSite({
				VERCEL: "1",
				VERCEL_ENV: "preview",
				VERCEL_BRANCH_URL: "mandatometro-git-develop-time.vercel.app",
			}),
		).toBe("https://mandatometro-git-develop-time.vercel.app");
	});

	it("respeita o APP_BASE_URL dado no ambiente, como no Docker", () => {
		expect(enderecoDoSite({ APP_BASE_URL: "http://localhost:3005" })).toBe(
			"http://localhost:3005",
		);
		expect(
			enderecoDoSite({
				VERCEL: "1",
				VERCEL_ENV: "preview",
				VERCEL_BRANCH_URL: "mandatometro-git-develop-time.vercel.app",
				APP_BASE_URL: "https://teste.mandatometro.com.br",
			}),
		).toBe("https://teste.mandatometro.com.br");
	});
});
