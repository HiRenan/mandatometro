import { useLayoutEffect, useRef, useState } from "react";
import { BOTAO_CONTINUAR } from "@/components/botao-continuar";
import { useHidratado } from "@/components/quiz";
import { classes } from "@/lib/classes";
import { semCliqueDuplo } from "@/lib/clique";
import type { JogoNaPagina, Passo } from "@/lib/jogo";
import {
	avancar,
	caminho,
	comecar,
	escolhaDa,
	escolher,
	type Partida,
	passoAtual,
	retratoDaVez,
} from "@/lib/jogo/partida";
import { tocar } from "@/lib/jogo/som";
import { movimentoReduzido } from "@/lib/painel-vivo";
import { BotaoDeSom } from "./botao-de-som";
import { CaixaDeDialogo } from "./caixa-de-dialogo";
import { CaminhoDoProjeto } from "./caminho-do-projeto";
import { Carimbo } from "./carimbos";
import { CartaoDoQueAconteceu } from "./cartao-do-que-aconteceu";
import { Decisao } from "./decisao";
import { FimDoJogo } from "./fim-do-jogo";
import { PainelDeVotos } from "./painel-de-votos";
import { RelogioDoPrazo } from "./relogio-do-prazo";

function falasSeguidas(passos: Passo[], indice: number): string[] {
	let inicio = indice;
	while (passos[inicio - 1]?.tipo === "fala") {
		inicio -= 1;
	}

	const falas = new Set<string>();
	for (const passo of passos.slice(inicio)) {
		if (passo.tipo !== "fala") {
			break;
		}
		falas.add(passo.texto);
	}
	return [...falas];
}

function rolarParaOPasso(bloco: Element) {
	const inicio = bloco.querySelector("[data-inicio-do-passo]") ?? bloco;
	const topo = inicio.getBoundingClientRect().top;
	const fim = bloco.getBoundingClientRect().bottom;
	const janela = window.visualViewport;
	const altura = janela?.height ?? window.innerHeight;
	const alto = janela?.offsetTop ?? 0;
	const baixo = alto + altura;
	const sobra = altura - (fim - topo);
	const respiro = 12;
	const margem = Math.min(respiro, Math.max(0, sobra / 2));

	let deslocamento = 0;
	if (sobra < 0) {
		deslocamento = topo - alto - respiro;
	} else if (topo < alto) {
		deslocamento = topo - alto - margem;
	} else if (fim > baixo) {
		deslocamento = fim - baixo + margem;
	}
	if (Math.abs(deslocamento) >= 1) {
		window.scrollTo({
			top: window.scrollY + deslocamento,
			behavior: movimentoReduzido() ? "auto" : "smooth",
		});
	}
}

/**
 * O palco do jogo: o cenário, o retrato de quem fala e, na frente, o passo da
 * vez — a fala, a decisão, o painel, o prazo ou o carimbo. A partida fica na
 * memória da página (lib/jogo/partida.ts) e não vai para o armazenamento do
 * navegador.
 *
 * O cenário, o retrato e o item de cena são desenho: ficam fora do leitor de
 * tela, e tudo o que importa está nas palavras da caixa de diálogo, como os
 * azulejos (DESIGN.md).
 */
export function Jogo({
	jogo,
	comApi,
}: {
	jogo: JogoNaPagina;
	/** Se o site tem o endereço da API (o API_URL do build). */
	comApi: boolean;
}) {
	const [partida, setPartida] = useState<Partida>(comecar);
	const frente = useRef<HTMLDivElement>(null);
	const hidratado = useHidratado();

	const cena = jogo.cenas[partida.cena];
	const passo = passoAtual(jogo, partida);
	const naCena = partida.fase === "cena";
	const escolha =
		passo?.tipo === "decisao" ? escolhaDa(partida, passo.id) : undefined;
	const tipo = escolha ? "resposta" : (passo?.tipo ?? partida.fase);
	const tipoAnterior = useRef(tipo);

	// O foco acompanha cada passo. A rolagem só enquadra o conteúdo quando
	// muda o tipo do passo, inclusive da pergunta para a resposta. Na primeira
	// abertura, o lugar da página é o da navegação do site.
	// biome-ignore lint/correctness/useExhaustiveDependencies: duas falas têm o mesmo tipo, mas cada uma precisa receber o foco quando a cena ou o passo muda.
	useLayoutEffect(() => {
		const mudouOTipo = tipoAnterior.current !== tipo;
		tipoAnterior.current = tipo;
		const bloco = frente.current?.firstElementChild;
		if (!bloco || (tipo === "abertura" && !mudouOTipo)) {
			return;
		}

		bloco
			.querySelector<HTMLElement>("[data-foco]")
			?.focus({ preventScroll: true });
		if (mudouOTipo) {
			rolarParaOPasso(bloco);
		}
	}, [tipo, partida.cena, partida.passo]);

	const cenario =
		naCena || partida.fase === "revelacao" ? cena.cenario : jogo.cenario;
	const fala = passo?.tipo === "fala" ? passo : undefined;
	// Quem falou por último fica na cena durante a decisão, o painel e o carimbo.
	const retrato = retratoDaVez(jogo, partida);

	function seguir() {
		setPartida((agora) => avancar(jogo, agora));
	}

	function escolherOpcao(opcao: string) {
		setPartida((agora) => escolher(jogo, agora, opcao));
	}

	return (
		<div
			className="jogo-palco"
			data-fase={partida.fase}
			// A fala fica em cima da cena, como numa visual novel; a decisão, o
			// painel e o cartão, que são altos, ficam embaixo dela.
			data-sobre-a-cena={fala ? "true" : undefined}
		>
			<div className="jogo-cena" aria-hidden="true">
				<img
					className="jogo-cenario"
					src={`/jogo/bg/${cenario}.webp`}
					alt=""
					width={1920}
					height={1080}
					fetchPriority="high"
				/>
				{retrato ? (
					<img
						key={retrato}
						className="jogo-retrato"
						src={`/jogo/personagens/${retrato}.webp`}
						alt=""
						width={1024}
						height={1536}
					/>
				) : null}
				{fala?.item ? (
					<div className="jogo-item" key={fala.item}>
						<img
							src={`/jogo/itens/${fala.item}.webp`}
							alt=""
							width={800}
							height={800}
						/>
						{fala.etiqueta ? (
							<p className="jogo-etiqueta-do-item">{fala.etiqueta}</p>
						) : null}
					</div>
				) : null}
			</div>

			<div className="jogo-frente" ref={frente}>
				{partida.fase === "abertura" ? (
					<div className="jogo-abertura">
						<p className="jogo-resumo" tabIndex={-1} data-foco="true">
							{jogo.resumo}
						</p>
						<p className="jogo-aviso">{jogo.aviso}</p>
						{hidratado ? (
							<div className="jogo-acoes">
								<button
									type="button"
									className={classes(BOTAO_CONTINUAR, "jogo-botao")}
									onClick={semCliqueDuplo(() => {
										tocar("campainha");
										seguir();
									})}
								>
									Começar pela primeira cena
								</button>
							</div>
						) : (
							<noscript>
								<p className="jogo-sem-script">
									O jogo precisa do JavaScript do navegador para rodar. As
									lições de cada cena estão nos artigos da trilha do processo
									legislativo.
								</p>
							</noscript>
						)}
					</div>
				) : null}

				{naCena && fala ? (
					<CaixaDeDialogo
						key={fala.id}
						id={fala.id}
						quem={fala.quem}
						nome={
							fala.quem === "narracao"
								? undefined
								: jogo.personagens[fala.quem].nome
						}
						texto={fala.texto}
						falasSeguidas={falasSeguidas(cena.passos, partida.passo)}
						aoAvancar={seguir}
					/>
				) : null}

				{naCena && passo?.tipo === "decisao" ? (
					<Decisao
						key={passo.id}
						decisao={passo}
						escolha={escolha}
						aoEscolher={escolherOpcao}
						aoAvancar={seguir}
					/>
				) : null}

				{naCena && passo?.tipo === "painel" ? (
					<PainelDeVotos
						key={`${partida.cena}-${partida.passo}`}
						painel={passo}
						aoAvancar={seguir}
					/>
				) : null}

				{naCena && passo?.tipo === "relogio" ? (
					<RelogioDoPrazo
						key={`${partida.cena}-${partida.passo}`}
						relogio={passo}
						aoAvancar={seguir}
					/>
				) : null}

				{naCena && passo?.tipo === "carimbo" ? (
					<div className="jogo-carimbo-solto">
						<Carimbo selo={passo.selo} />
						<p className="jogo-legenda" tabIndex={-1} data-foco="true">
							{passo.legenda}
						</p>
						<div className="jogo-acoes">
							<button
								type="button"
								className={classes(BOTAO_CONTINUAR, "jogo-botao")}
								onClick={semCliqueDuplo(seguir)}
							>
								Continuar
							</button>
						</div>
					</div>
				) : null}

				{partida.fase === "revelacao" ? (
					<CartaoDoQueAconteceu
						key={cena.slug}
						cena={cena}
						ultima={partida.cena + 1 >= jogo.cenas.length}
						aoAvancar={seguir}
					/>
				) : null}

				{partida.fase === "fim" ? (
					<FimDoJogo
						jogo={jogo}
						partida={partida}
						comApi={comApi}
						aoJogarDeNovo={() => setPartida(comecar())}
					/>
				) : null}
			</div>

			{partida.fase === "fim" ? null : (
				<div className="jogo-pe">
					<CaminhoDoProjeto casas={caminho(jogo, partida)} />
					{hidratado ? <BotaoDeSom /> : null}
					{naCena ? (
						<p className="jogo-onde">
							Cena {cena.cena} de {jogo.cenas.length}: {cena.titulo}
						</p>
					) : null}
				</div>
			)}
		</div>
	);
}
