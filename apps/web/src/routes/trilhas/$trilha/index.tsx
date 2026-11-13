// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Aviso, useAviso } from "@/components/aviso";
import { AzulejoGrande, Painel } from "@/components/azulejo";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "@/components/botao-continuar";
import { Caminho } from "@/components/caminho";
import { ChamadaDoQuiz } from "@/components/chamada-do-quiz";
import { Infografico } from "@/components/infografico";
import { LugarDoBotao } from "@/components/lugar-do-botao";
import { MarcaDeLido } from "@/components/marca-de-lido";
import { Palavras } from "@/components/palavras";
import { azulejoDaPosicao, sementeDe } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { semCliqueDuplo } from "@/lib/clique";
import { buscarTrilha } from "@/lib/conteudo";
import { classeDaFita, fraseDoProgresso, plural } from "@/lib/formatar";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";
import {
	contarLidos,
	idDoArtigo,
	lerLidos,
	primeiroNaoLido,
	recomecarTrilha,
	restaurarLidos,
	useArtigosLidos,
} from "@/lib/progresso";

export const Route = createFileRoute("/trilhas/$trilha/")({
	loader: ({ params }) => buscarTrilha({ data: { trilha: params.trilha } }),
	head: ({ loaderData: trilha, match }) => ({
		meta: trilha
			? metaDaPagina({ titulo: trilha.titulo, descricao: trilha.descricao })
			: metaSemPagina(match),
	}),
	component: PaginaDaTrilha,
});

// Os textos do botão de continuar: o da primeira visita e o de quem já leu algum
// artigo da trilha.
const COMECAR = "Começar pelo primeiro artigo";
const continuarEm = (titulo: string) => `Continuar de onde parou: ${titulo}`;

function PaginaDaTrilha() {
	const trilha = Route.useLoaderData();
	const lidos = useArtigosLidos();
	// As marcas que o "Recomeçar a trilha" apagou, para o "Desfazer". Valem até a
	// pessoa sair da página.
	const [apagadas, setApagadas] = useState<string[] | null>(null);
	const { aviso, avisar } = useAviso();
	const total = trilha.artigos.length;
	const quantosLidos = contarLidos(trilha.artigos, lidos);
	const ondeParou = primeiroNaoLido(trilha.artigos, lidos);
	const minutos = trilha.artigos.reduce(
		(soma, artigo) => soma + artigo.minutos,
		0,
	);
	// Os textos que o botão de continuar pode ter nesta trilha: o servidor manda
	// o primeiro, e o navegador troca pelo do artigo em que a pessoa parou.
	const textosDoBotao = [
		COMECAR,
		...trilha.artigos.map((artigo) => continuarEm(artigo.titulo)),
	];
	const progresso =
		quantosLidos === 0 && apagadas
			? "Você recomeçou a trilha."
			: fraseDoProgresso(quantosLidos, total);

	function recomecar() {
		setApagadas(recomecarTrilha(trilha.slug));
		avisar("Você recomeçou a trilha.");
	}

	function desfazer() {
		restaurarLidos(apagadas ?? []);
		setApagadas(null);
		avisar(fraseDoProgresso(contarLidos(trilha.artigos, lerLidos()), total));
	}

	// O mesmo botão faz as duas coisas, e o foco fica nele quando uma vira a outra.
	// Num clique duplo, o segundo clique fica de fora (lib/clique.ts).
	const acao = apagadas
		? { texto: "Desfazer", fazer: desfazer }
		: quantosLidos > 0
			? { texto: "Recomeçar a trilha", fazer: recomecar }
			: undefined;

	return (
		// A partir de 1400 px, o caminho da trilha fica numa coluna à direita dos
		// artigos. Abaixo disso, ele vem depois deles, que é também a ordem do HTML.
		<div
			className={classes(
				"pagina-da-trilha",
				trilha.infografico && "com-caminho",
			)}
		>
			<section className="cartaz cartaz-medio">
				{/* Cada trilha tem o seu painel: a semente sai do endereço dela. */}
				<Painel
					semente={sementeDe(trilha.slug)}
					colunas={4}
					quantas={64}
					className="mural"
					sozinho
				/>
				<Caminho trilha={trilha} naTrilha />
				{/* Com a letra grande, o título cresce até "CONSTITUIÇÃO", a palavra
				    mais larga dos títulos das trilhas, encostar nas margens (o
				    letra-com-teto do index.css). As palavras tombam no lugar uma a uma:
				    o leitor de tela lê o título corrido, pelo aria-label. */}
				<h1
					aria-label={trilha.titulo}
					className="titulo-condensado letra-com-teto [--palavra:5.66]"
				>
					<span aria-hidden="true" className="caixa">
						<Palavras texto={trilha.titulo} />
					</span>
				</h1>
				<div className="cartaz-pe">
					<p className="abertura">{trilha.descricao}</p>
					{/* O "Recomeçar a trilha" fica embaixo da descrição, com a linha
					    reservada desde o HTML do servidor. Ali, ele não muda de lugar
					    quando vira "Desfazer", e nada aparece no lugar dele: o botão de
					    continuar, que muda de texto e some com a trilha terminada, fica
					    na outra coluna e, no celular, embaixo. Num clique duplo, o segundo
					    clique fica de fora (lib/clique.ts) e, se passasse, cairia no mesmo
					    botão. */}
					<p className="recomeco">
						{acao && (
							<button
								type="button"
								onClick={semCliqueDuplo(acao.fazer)}
								className="acao-de-texto"
							>
								{acao.texto}
							</button>
						)}
					</p>
					<div className="cartaz-acao">
						{/* A linha do progresso tem a altura reservada desde o HTML do
						    servidor: quando o progresso aparece, depois da hidratação, o
						    botão fica no lugar. */}
						<p className="progresso rotulo">{progresso}</p>
						{/* O lugar do botão guarda a altura do texto mais alto que ele pode
						    ter: no celular, a faixa e a lista dos artigos não sobem quando
						    o botão some, com a trilha terminada, nem descem quando o texto
						    dele ganha uma linha. */}
						<LugarDoBotao textos={textosDoBotao}>
							{ondeParou && (
								<Link
									to="/trilhas/$trilha/$artigo"
									params={{ trilha: trilha.slug, artigo: ondeParou.slug }}
									className={BOTAO_CONTINUAR}
								>
									{quantosLidos > 0 ? continuarEm(ondeParou.titulo) : COMECAR}
									{/* O espaço antes da seta: com a letra grande, quando ela
									    desce sozinha, começa alinhada com o texto (o
									    SETA_DO_BOTAO). */}{" "}
									<ArrowRight
										aria-hidden="true"
										className={SETA_DO_BOTAO}
										strokeWidth={2.5}
									/>
								</Link>
							)}
						</LugarDoBotao>
					</div>
				</div>
				<p className="faixa rotulo">
					<span>{plural(total, "artigo", "artigos")}</span>
					<span>{minutos} min de leitura</span>
					<span>Fonte oficial em cada explicação</span>
				</p>
				<Aviso texto={aviso} />
			</section>

			<section aria-label="Artigos da trilha" className="artigos">
				<ol role="list" className="linhas">
					{trilha.artigos.map((artigo, indice) => {
						const posicao = indice + 1;
						const lido = lidos.has(idDoArtigo(artigo));
						const parouAqui =
							quantosLidos > 0 && ondeParou?.slug === artigo.slug;
						const estado = parouAqui ? "Continue daqui" : lido ? "Lido" : "";
						return (
							<li
								key={artigo.slug}
								className={classes("linha revelar", classeDaFita(posicao))}
							>
								<span aria-hidden="true" className="numeral">
									{posicao}
									{lido && <MarcaDeLido className="visto-no-numero" />}
								</span>
								<div className="linha-texto">
									{/* Com a letra grande, o título cresce até "FUNDAMENTAIS?", a
									    palavra mais larga dos títulos dos artigos, encostar nas
									    bordas da folha (o letra-com-teto do index.css). A folha
									    inteira leva ao artigo: a área do link cobre a folha. */}
									<h2 className="titulo-de-folha letra-com-teto [--palavra:6.34]">
										<Link
											to="/trilhas/$trilha/$artigo"
											params={{ trilha: trilha.slug, artigo: artigo.slug }}
										>
											{artigo.titulo}
										</Link>
									</h2>
									<p>{artigo.resumo}</p>
									{/* Cada parte fica inteira: a linha só quebra entre elas. */}
									<p className="rotulo">
										<span className="whitespace-nowrap">
											Leitura de {artigo.minutos} min ·
										</span>{" "}
										<span className="whitespace-nowrap">
											{plural(
												artigo.fontes.length,
												"fonte oficial",
												"fontes oficiais",
											)}
										</span>
									</p>
									{/* A etiqueta pende do fio de cima da folha, fora do fluxo do
									    texto: quando ela aparece, depois da hidratação, nada muda
									    de lugar. No HTML, vem depois do título. */}
									{estado && <p className="estado rotulo">{estado}</p>}
								</div>
								<AzulejoGrande
									pecas={azulejoDaPosicao(posicao)}
									className="da-linha"
								/>
							</li>
						);
					})}
				</ol>
				{trilha.quiz && (
					<ChamadaDoQuiz
						trilha={trilha.slug}
						quiz={trilha.quiz}
						className="revelar"
					/>
				)}
			</section>

			{trilha.infografico && (
				<Infografico
					infografico={trilha.infografico}
					trilha={trilha}
					className="revelar"
				/>
			)}
		</div>
	);
}
