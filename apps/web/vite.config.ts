import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
// Com a extensão, aqui e nos arquivos que este importa: sem ela, o Vite avisa a
// cada build que o carregador nativo do config, futuro padrão, não os acharia.
import { conferirConteudo } from "./src/lib/conteudo/conferir.ts";

// A Vercel põe VERCEL=1 no build. A função dela não tem o CLI do varlock nem o
// .env.schema: lá, o varlock grava no build as variáveis já resolvidas. Fora
// dela, o servidor lê o .env.schema ao subir, como no Docker.
const naVercel = Boolean(process.env.VERCEL);

export default defineConfig({
	server: {
		port: 3001,
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		varlockVitePlugin({
			ssrInjectMode: naVercel ? "resolved-env" : "auto-load",
		}),
		// Um artigo mal formado ou a falta da trilha da página inicial para o
		// build, com o arquivo e o problema.
		conferirConteudo(),
		tailwindcss(),
		tanstackStart(),
		// Sem preset fixo: na Vercel, o Nitro monta a saída no formato dela
		// (.vercel/output); fora dela, a do node-server (.output/server), que o
		// Dockerfile também fixa pelo NITRO_PRESET.
		nitro(),
		viteReact(),
	],
});
