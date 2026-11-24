import { createLink } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { classes } from "@/lib/classes";

/** As partes visíveis também formam o nome do link na caixa original. */
export function AcaoDeTexto({
	texto,
	complemento,
	icone,
	className,
	href,
	...atributos
}: Omit<ComponentProps<"a">, "children" | "aria-label"> & {
	texto: string | string[];
	complemento?: string;
	icone?: ReactNode;
}) {
	const frase = typeof texto === "string" ? texto : texto.join("");
	const nome = complemento ? `${frase} ${complemento}` : frase;
	return (
		<a
			{...atributos}
			href={href}
			className={classes("acao-de-texto", className)}
			aria-label={href ? nome : undefined}
		>
			<span aria-hidden="true">
				{texto}
				{icone}
			</span>
		</a>
	);
}

export const LinkDeAcao = createLink(AcaoDeTexto);
