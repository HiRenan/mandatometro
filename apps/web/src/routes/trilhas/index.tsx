import { createFileRoute, Link } from "@tanstack/react-router";
import { MarcaX } from "@/components/marca-x";
import { buscarTrilhas, type TrilhaNaLista } from "@/lib/conteudo";
import { plural } from "@/lib/formatar";
import { metaDaPagina } from "@/lib/meta";
import { contarLidos, idDoArtigo, useArtigosLidos } from "@/lib/progresso";

export const Route = createFileRoute("/trilhas/")({
	loader: () => buscarTrilhas(),
	head: () => ({
		meta: metaDaPagina({
			titulo: "Trilhas",
			descricao:
				"Artigos curtos que explicam, passo a passo, como funciona a política brasileira, com a fonte oficial de cada explicação.",
		}),
	}),
	component: PaginaDasTrilhas,
});

function PaginaDasTrilhas() {
	const trilhas = Route.useLoaderData();
	const lidos = useArtigosLidos();

	return (
		<div className="mx-auto max-w-[1440px] px-5 pb-20 md:px-16">
			<div className="max-w-[56rem]">
				<h1 className="titulo-condensado mt-10 text-[3rem] md:text-[4.75rem]">
					Trilhas
				</h1>
				<p className="mt-5 max-w-[44ch] font-serif text-xl leading-snug font-medium lg:text-[1.5625rem] lg:leading-[1.4]">
					Artigos curtos que explicam, passo a passo, como funciona a política
					brasileira. Cada explicação traz a fonte oficial.
				</p>
				<p className="mt-4 max-w-[52ch] text-[1.0625rem]">
					Sem cadastro: os artigos que você lê ficam marcados neste navegador.
				</p>
				<ol className="border-tinta mt-10 border-t-2">
					{trilhas.map((trilha) => (
						<ItemDaTrilha key={trilha.slug} trilha={trilha} lidos={lidos} />
					))}
				</ol>
			</div>
		</div>
	);
}

function ItemDaTrilha({
	trilha,
	lidos,
}: {
	trilha: TrilhaNaLista;
	lidos: ReadonlySet<string>;
}) {
	const total = trilha.artigos.length;
	const quantosLidos = contarLidos(trilha.artigos, lidos);
	const minutos = trilha.artigos.reduce(
		(soma, artigo) => soma + artigo.minutos,
		0,
	);

	return (
		<li className="border-tinta border-b-2 border-dashed py-7">
			<h2 className="subtitulo-condensado text-[2rem] md:text-[2.75rem]">
				<Link
					to="/trilhas/$trilha"
					params={{ trilha: trilha.slug }}
					className="no-underline hover:underline"
				>
					{trilha.titulo}
				</Link>
			</h2>
			<p className="mt-2 max-w-[52ch] font-serif text-lg leading-snug">
				{trilha.descricao}
			</p>
			<p className="mt-3 text-[0.9375rem] font-semibold">
				{plural(total, "artigo", "artigos")} · {minutos} min de leitura
			</p>
			<div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
				<ol aria-hidden="true" className="flex gap-1.5">
					{trilha.artigos.map((artigo, indice) => (
						<li
							key={artigo.slug}
							className="border-tinta relative grid size-11 place-items-center border-2"
						>
							<span className="numeral pt-1 text-[1.75rem]">{indice + 1}</span>
							{lidos.has(idDoArtigo(artigo)) && (
								<MarcaX className="absolute inset-0 size-full p-0.5" />
							)}
						</li>
					))}
				</ol>
				{quantosLidos > 0 && (
					<p className="text-lg font-bold">
						{quantosLidos === total
							? "Você terminou a trilha."
							: `Você leu ${quantosLidos} de ${total}.`}
					</p>
				)}
			</div>
		</li>
	);
}
