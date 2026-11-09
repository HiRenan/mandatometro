import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Caminho } from "@/components/caminho";
import { MarcaX } from "@/components/marca-x";
import { buscarTrilha } from "@/lib/conteudo";
import { corDaFita, plural } from "@/lib/formatar";
import { META_NAO_ENCONTRADA, metaDaPagina } from "@/lib/meta";
import {
	contarLidos,
	idDoArtigo,
	primeiroNaoLido,
	useArtigosLidos,
} from "@/lib/progresso";

export const Route = createFileRoute("/trilhas/$trilha/")({
	loader: ({ params }) => buscarTrilha({ data: { trilha: params.trilha } }),
	head: ({ loaderData: trilha }) => ({
		meta: trilha
			? metaDaPagina({ titulo: trilha.titulo, descricao: trilha.descricao })
			: META_NAO_ENCONTRADA,
	}),
	component: PaginaDaTrilha,
});

function PaginaDaTrilha() {
	const trilha = Route.useLoaderData();
	const lidos = useArtigosLidos();
	const total = trilha.artigos.length;
	const quantosLidos = contarLidos(trilha.artigos, lidos);
	const ondeParou = primeiroNaoLido(trilha.artigos, lidos);
	const minutos = trilha.artigos.reduce(
		(soma, artigo) => soma + artigo.minutos,
		0,
	);

	return (
		<div className="mx-auto max-w-[1440px] px-5 pb-20 md:px-16">
			<Caminho trilha={trilha} naTrilha />
			<div className="mt-8 max-w-[56rem]">
				<h1 className="titulo-condensado text-[3rem] md:text-[4.75rem]">
					{trilha.titulo}
				</h1>
				<p className="mt-5 max-w-[40ch] font-serif text-xl leading-snug font-medium lg:text-[1.5625rem] lg:leading-[1.4]">
					{trilha.descricao}
				</p>
				<p className="border-tinta mt-5 flex flex-wrap gap-x-7 gap-y-1 border-y-2 py-3 text-[1.0625rem] font-semibold">
					<span>{plural(total, "artigo", "artigos")}</span>
					<span>{minutos} min de leitura</span>
					<span>Fonte oficial em cada explicação</span>
				</p>

				<div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
					{quantosLidos > 0 && (
						<p className="text-xl font-bold">
							{ondeParou
								? `Você leu ${quantosLidos} de ${total}.`
								: "Você terminou a trilha."}
						</p>
					)}
					{ondeParou && (
						<Link
							to="/trilhas/$trilha/$artigo"
							params={{ trilha: trilha.slug, artigo: ondeParou.slug }}
							className="bg-tinta text-papel inline-flex items-center gap-3 px-5 py-3 text-lg font-bold no-underline hover:underline"
						>
							{quantosLidos > 0
								? `Continuar de onde parou: ${ondeParou.titulo}`
								: "Começar pelo primeiro artigo"}
							<ArrowRight
								aria-hidden="true"
								className="size-5 shrink-0"
								strokeWidth={2.5}
							/>
						</Link>
					)}
				</div>

				<ol className="border-tinta mt-12 border-t-2">
					{trilha.artigos.map((artigo, indice) => {
						const lido = lidos.has(idDoArtigo(artigo));
						const parouAqui =
							quantosLidos > 0 && ondeParou?.slug === artigo.slug;
						const estado = parouAqui ? "Continue daqui" : lido ? "Lido" : "";
						return (
							<li
								key={artigo.slug}
								className={`border-tinta relative border-b-2 border-dashed ${parouAqui ? "canto-dobrado" : ""}`}
							>
								<span
									aria-hidden="true"
									className="fita absolute -top-0.5 left-0 h-24 w-3 md:h-28"
									style={{ background: corDaFita(indice + 1) }}
								/>
								{/* No celular, o número fica ao lado do título e o resumo usa a
								    largura toda; a partir do md, o número ocupa a coluna inteira. */}
								<div className="grid grid-cols-[4.5rem_minmax(0,1fr)] content-start gap-x-4 py-6 pr-5 pl-[1.625rem] md:grid-cols-[7rem_minmax(0,1fr)] md:gap-x-6 md:pr-10">
									<span
										aria-hidden="true"
										className="numeral justify-self-center text-[5.5rem] md:row-span-3 md:text-[8rem]"
									>
										<span className="relative inline-block">
											{indice + 1}
											{lido && <MarcaX className="sobre-o-numero" />}
										</span>
									</span>
									{/* O respiro à direita do título, no celular, deixa o canto dobrado livre. */}
									<h2 className="subtitulo-condensado pr-3 text-[1.75rem] md:pr-0 md:text-[2.25rem]">
										<Link
											to="/trilhas/$trilha/$artigo"
											params={{ trilha: trilha.slug, artigo: artigo.slug }}
											className="no-underline hover:underline"
										>
											{artigo.titulo}
										</Link>
									</h2>
									<p className="col-span-2 mt-3 max-w-[52ch] font-serif text-lg leading-snug md:col-span-1 md:mt-2">
										{artigo.resumo}
									</p>
									{/* Cada parte fica inteira: a linha só quebra entre elas. */}
									<p className="col-span-2 mt-3 text-[0.9375rem] font-semibold md:col-span-1">
										{estado && (
											<>
												<strong className="font-extrabold whitespace-nowrap">
													{estado} ·
												</strong>{" "}
											</>
										)}
										<span className="whitespace-nowrap">
											{artigo.minutos} min ·
										</span>{" "}
										<span className="whitespace-nowrap">
											{plural(
												artigo.fontes.length,
												"fonte oficial",
												"fontes oficiais",
											)}
										</span>
									</p>
								</div>
							</li>
						);
					})}
				</ol>
			</div>
		</div>
	);
}
