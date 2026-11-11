import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { conferirConteudo } from "./src/lib/conteudo/conferir";

export default defineConfig({
	server: {
		port: 3001,
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		varlockVitePlugin({ ssrInjectMode: "auto-load" }),
		// Um artigo mal formado para o build, com o arquivo e o problema.
		conferirConteudo(),
		tailwindcss(),
		tanstackStart(),
		nitro({ preset: "node-server" }),
		viteReact(),
	],
});
