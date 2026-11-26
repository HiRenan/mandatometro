import { createServerFn } from "@tanstack/react-start";
import type { PedidoDaOpiniao } from "./opiniao";
import { entregarOpiniao } from "./opiniao.server";

export const enviarOpiniao = createServerFn({ method: "POST" })
	.validator((dados: PedidoDaOpiniao) => dados)
	.handler(({ data }) => entregarOpiniao(data));
