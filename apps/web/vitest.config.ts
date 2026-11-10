import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Config própria dos testes: o vite.config.ts carrega o TanStack Start, o Nitro e
// o varlock, que os testes não usam.
export default defineConfig({
	plugins: [viteReact()],
	resolve: { tsconfigPaths: true },
	test: { environment: "node" },
});
