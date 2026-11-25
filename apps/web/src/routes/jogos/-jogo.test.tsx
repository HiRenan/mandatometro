// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { acharJogo, jogos } from "@/lib/jogo/paginas.server";
import { Route } from "./$jogo";

vi.mock("@/env", () => ({ ENV: { API_URL: "" } }));

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

it("começa uma nova partida quando a navegação troca o jogo", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
	vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
	const raiz = createRootRoute();
	const rota = createRoute({
		getParentRoute: () => raiz,
		path: "/jogos/$jogo",
		loader: ({ params }) => acharJogo(jogos, params.jogo),
		component: Route.options.component,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([rota]),
		history: createMemoryHistory({ initialEntries: ["/jogos/comissoes"] }),
	});
	render(<RouterProvider router={router} />);

	const comecar = { name: "Começar pela primeira cena" };
	fireEvent.click(await screen.findByRole("button", comecar));
	expect(screen.queryByRole("button", comecar)).toBeNull();

	await act(async () => {
		await router.navigate({ to: "/jogos/$jogo", params: { jogo: "6x1" } });
	});
	expect(screen.getByRole("heading", { name: "Jogo da 6x1" })).toBeTruthy();
	expect(screen.getByRole("button", comecar)).toBeTruthy();
});
