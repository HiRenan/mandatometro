import { createFileRoute, Link } from "@tanstack/react-router";
import { FolhasDaTrilha } from "@/components/folhas-da-trilha";
import { MarcaX } from "@/components/marca-x";
import { buscarTrilhas, type TrilhaNaLista } from "@/lib/conteudo";
import { fraseDoProgresso, plural } from "@/lib/formatar";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";
import { contarLidos, idDoArtigo, useArtigosLidos } from "@/lib/progresso";

export const Route = createFileRoute("/trilhas/")({
	loader: () => buscarTrilhas(),
	head: ({ loaderData: trilhas, match }) => ({
		meta: trilhas
			? metaDaPagina({
					titulo: "Trilhas",
					descricao:
						"Artigos curtos que explicam, passo a passo, como funciona a política brasileira, com a fonte oficial de cada explicação.",
				})
			: metaSemPagina(match),
	}),
	component: PaginaDasTrilhas,
});

function PaginaDasTrilhas() {
	const trilhas = Route.useLoaderData();
	const lidos = useArtigosLidos();

	return (
		<div className="px-margem-celular mx-auto max-w-[1440px] pb-20 md:px-16">
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
			</div>
			{/* A lista usa a moldura inteira: a partir do lg, as folhas de cada trilha
			    ficam numa coluna à direita, da largura do caminho na página da trilha. */}
			<ol className="border-tinta mt-10 border-t-2">
				{trilhas.map((trilha) => (
					<ItemDaTrilha key={trilha.slug} trilha={trilha} lidos={lidos} />
				))}
			</ol>
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
		<li className="border-tinta folha:grid-cols-[minmax(0,1fr)_28rem] folha:gap-x-12 border-b-2 border-dashed py-7 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-x-8 lg:py-0 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-x-10">
			<div className="lg:py-7">
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
				{/* No celular, a frase do progresso tem a linha dela, reservada desde o
				    HTML do servidor; a partir do sm, fica ao lado das folhas em
				    miniatura, e a partir do lg, sozinha, porque as folhas inteiras estão
				    à direita. Assim, nada muda de lugar quando o progresso aparece,
				    depois da hidratação. */}
				<div className="mt-4 grid items-center gap-x-5 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)] lg:block">
					<ol aria-hidden="true" className="flex flex-wrap gap-1.5 lg:hidden">
						{trilha.artigos.map((artigo, indice) => (
							<li
								key={artigo.slug}
								className="border-tinta relative grid size-11 place-items-center border-2"
							>
								<span className="numeral pt-1 text-[1.75rem]">
									{indice + 1}
								</span>
								{lidos.has(idDoArtigo(artigo)) && (
									<MarcaX className="absolute inset-0 size-full p-0.5" />
								)}
							</li>
						))}
					</ol>
					<p className="min-h-7 text-lg font-bold">
						{fraseDoProgresso(quantosLidos, total)}
					</p>
				</div>
			</div>
			{/* As fitas penduram da linha que abre a trilha. A linha de baixo da
			    última folha some, porque a da trilha já fecha a lista. */}
			<FolhasDaTrilha
				trilha={trilha}
				lidos={lidos}
				aria-label={`Artigos da trilha ${trilha.titulo}`}
				className="hidden lg:block [&>li:last-child]:border-b-0"
			/>
		</li>
	);
}
