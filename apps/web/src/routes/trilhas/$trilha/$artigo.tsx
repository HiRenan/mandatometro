import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Aviso, useAviso } from "@/components/aviso";
import { Caminho } from "@/components/caminho";
import { Fontes } from "@/components/fontes";
import { MarcaDeLido } from "@/components/marca-de-lido";
import { NestaTrilha } from "@/components/nesta-trilha";
import { TextoDoArtigo } from "@/components/texto-do-artigo";
import { type ArtigoNaTrilha, buscarArtigo } from "@/lib/conteudo";
import { corDaFita, plural } from "@/lib/formatar";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";
import {
	desmarcarLido,
	idDoArtigo,
	lerLidos,
	marcarLido,
	useArtigosLidos,
} from "@/lib/progresso";

export const Route = createFileRoute("/trilhas/$trilha/$artigo")({
	loader: ({ params }) =>
		buscarArtigo({ data: { trilha: params.trilha, artigo: params.artigo } }),
	head: ({ loaderData: pagina, match }) => ({
		meta: pagina
			? metaDaPagina({
					titulo: `${pagina.artigo.titulo} · ${pagina.trilha.titulo}`,
					descricao: pagina.artigo.resumo,
					tipo: "article",
				})
			: metaSemPagina(match),
	}),
	component: PaginaDoArtigo,
});

function PaginaDoArtigo() {
	const pagina = Route.useLoaderData();
	// A chave zera o estado da folha quando a pessoa passa para outro artigo.
	return <Folha key={idDoArtigo(pagina.artigo)} {...pagina} />;
}

function Folha({ trilha, artigo, posicao, anterior, proximo }: ArtigoNaTrilha) {
	const id = idDoArtigo(artigo);
	const lidos = useArtigosLidos();
	const lido = lidos.has(id);
	const [leuAgora, setLeuAgora] = useState(false);
	const [desmarcou, setDesmarcou] = useState(false);
	const { aviso, avisar } = useAviso();
	const fimDoTexto = useRef<HTMLDivElement>(null);
	// Depois do "Desmarcar", o fim do texto na tela não marca de novo nesta visita.
	const podeMarcar = useRef(true);

	// O artigo conta como lido quando o fim do texto aparece na tela.
	useEffect(() => {
		const alvo = fimDoTexto.current;
		if (!alvo || typeof IntersectionObserver === "undefined") {
			return;
		}
		if (lerLidos().has(id)) {
			return;
		}
		const observador = new IntersectionObserver(
			([entrada]) => {
				if (!entrada?.isIntersecting) {
					return;
				}
				observador.disconnect();
				if (!podeMarcar.current || lerLidos().has(id)) {
					return;
				}
				setLeuAgora(true);
				marcarLido(id);
				avisar("Você leu este artigo.");
			},
			{ rootMargin: "0px 0px -10% 0px" },
		);
		observador.observe(alvo);
		return () => observador.disconnect();
	}, [id, avisar]);

	function desmarcar() {
		podeMarcar.current = false;
		desmarcarLido(id);
		setLeuAgora(false);
		setDesmarcou(true);
		avisar("Você desmarcou o artigo.");
	}

	function desfazer() {
		marcarLido(id);
		avisar("Você leu este artigo.");
	}

	const total = trilha.artigos.length;
	const fontes = `${plural(artigo.fontes.length, "fonte oficial", "fontes oficiais")}, no fim do artigo`;
	const fita = corDaFita(posicao);
	const deTantos = (
		<span
			className="inline-block border-b-[0.35em] pb-[0.12em] font-extrabold [font-stretch:75%]"
			style={{ borderColor: fita }}
		>
			de {plural(total, "artigo", "artigos")}
		</span>
	);

	return (
		<div className="px-margem-celular mx-auto max-w-[1440px] pb-20 md:px-16">
			<Caminho trilha={trilha} />
			{/* Abaixo do lg, uma coluna da largura da tela: com a letra grande, uma
			    palavra comprida não alarga a página. */}
			<div className="folha:grid-cols-[minmax(0,248px)_minmax(0,700px)_minmax(15rem,1fr)] folha:gap-x-12 mt-5 grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-[minmax(0,700px)_minmax(15rem,1fr)]">
				<div className="folha:block hidden">
					<p className="grid justify-items-start">
						<span
							className={`numeral ${posicao >= 10 ? "text-[15rem]" : "text-[22.5rem]"}`}
						>
							{posicao}
						</span>
						<span className="mt-3.5 text-[2.125rem]">{deTantos}</span>
					</p>
				</div>

				<article>
					{/* Com a letra grande, o número fica em cima do título, e o título
					    cresce até "comissões", a palavra mais comprida dos títulos dos
					    artigos, encostar nas margens (o letra-com-teto do index.css). */}
					<header className="folha:block letra-grande:grid-cols-[minmax(0,1fr)] letra-grande:gap-y-3 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4">
						<p className="folha:hidden grid justify-items-start">
							<span className="numeral text-[7.5rem] md:text-[10rem]">
								{posicao}
							</span>
							<span className="mt-2 text-[0.9375rem] md:text-lg">
								{deTantos}
							</span>
						</p>
						<h1 className="titulo-condensado letra-com-teto folha:text-[4.75rem] max-w-[12ch] [--letra:2.5rem] [--palavra:4.06] md:text-[3.5rem]">
							{artigo.titulo}
						</h1>
					</header>
					<p className="folha:mt-[1.375rem] folha:text-[1.5625rem] folha:leading-[1.4] mt-5 max-w-[40ch] font-serif text-xl leading-snug font-medium lg:text-[1.375rem]">
						{artigo.resumo}
					</p>
					<p className="border-tinta folha:mt-6 mt-5 flex flex-wrap gap-x-7 gap-y-1 border-y-2 py-3 text-[1.0625rem] font-semibold">
						<span>Leitura de {artigo.minutos} min</span>
						<span>{fontes}</span>
					</p>
					<div className="mt-6">
						<TextoDoArtigo html={artigo.html} />
					</div>

					{/* A altura do aviso fica reservada: quando o visto aparece, as fontes
					    não descem. O botão é o mesmo nos dois estados, e o foco fica
					    nele quando "Desmarcar" vira "Desfazer". */}
					<div ref={fimDoTexto} className="mt-6 min-h-[4.5rem]">
						{(lido || desmarcou) && (
							<div className="grid grid-cols-[2.5rem_minmax(0,1fr)] grid-rows-[minmax(2.5rem,auto)_auto] items-center gap-x-3 gap-y-1">
								{lido && (
									<MarcaDeLido
										animar={leuAgora}
										className="col-start-1 row-start-1 size-10"
									/>
								)}
								<p className="col-start-2 row-start-1 text-xl font-bold">
									{lido ? "Você leu este artigo." : "Você desmarcou o artigo."}
								</p>
								<button
									type="button"
									onClick={lido ? desmarcar : desfazer}
									className="acao-de-texto col-start-2 row-start-2 justify-self-start"
								>
									{lido ? "Desmarcar" : "Desfazer"}
								</button>
							</div>
						)}
					</div>
					<Aviso texto={aviso} />

					<div className="mt-6">
						<Fontes fontes={artigo.fontes} />
					</div>

					<nav
						aria-label="Outros artigos da trilha"
						className="mt-12 grid gap-4 md:grid-cols-2"
					>
						{anterior && (
							<Link
								to="/trilhas/$trilha/$artigo"
								params={{ trilha: trilha.slug, artigo: anterior.slug }}
								className="group border-tinta grid content-start gap-1 border-t-2 pt-3 no-underline"
							>
								<span className="flex items-center gap-2 text-base font-semibold">
									<ArrowLeft
										aria-hidden="true"
										className="size-5"
										strokeWidth={2.5}
									/>
									Artigo anterior
								</span>
								<span className="subtitulo-condensado text-2xl group-hover:underline">
									{anterior.titulo}
								</span>
							</Link>
						)}
						{proximo ? (
							<Link
								to="/trilhas/$trilha/$artigo"
								params={{ trilha: trilha.slug, artigo: proximo.slug }}
								className="group border-tinta grid content-start gap-1 border-t-2 pt-3 no-underline md:col-start-2 md:text-right"
							>
								<span className="flex items-center gap-2 text-base font-semibold md:justify-end">
									Próximo artigo
									<ArrowRight
										aria-hidden="true"
										className="size-5"
										strokeWidth={2.5}
									/>
								</span>
								<span className="subtitulo-condensado text-2xl group-hover:underline">
									{proximo.titulo}
								</span>
							</Link>
						) : (
							<Link
								to="/trilhas/$trilha"
								params={{ trilha: trilha.slug }}
								activeOptions={{ exact: true }}
								className="group border-tinta grid content-start gap-1 border-t-2 pt-3 no-underline md:col-start-2 md:text-right"
							>
								<span className="flex items-center gap-2 text-base font-semibold md:justify-end">
									Último artigo da trilha
								</span>
								<span className="subtitulo-condensado text-2xl group-hover:underline">
									Voltar para {trilha.titulo}
								</span>
							</Link>
						)}
					</nav>
				</article>

				{/* A rolagem da coluna cortaria o anel de foco dos links: o respiro de 8 px
				    em volta (com a margem negativa, a coluna fica no lugar) dá espaço a ele. */}
				<div className="mt-14 lg:sticky lg:top-6 lg:-mx-2 lg:mt-0 lg:max-h-[calc(100svh-3rem)] lg:self-start lg:overflow-y-auto lg:px-2 lg:pb-2">
					<NestaTrilha
						trilha={trilha}
						atual={artigo.slug}
						lidos={lidos}
						marcarAgora={leuAgora ? artigo.slug : undefined}
					/>
				</div>
			</div>
		</div>
	);
}
