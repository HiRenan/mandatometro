import { defineConfig } from "@hey-api/openapi-ts";

// Gera o cliente da API a partir do OpenAPI do FastAPI (apps/backend/openapi.json).
// Rode `pnpm generate:client` na raiz depois de mudar a API.
export default defineConfig({
	input: "../backend/openapi.json",
	output: "src/client",
	plugins: [
		{ name: "@hey-api/client-fetch", runtimeConfigPath: "./src/hey-api.ts" },
		"@tanstack/react-query",
	],
});
