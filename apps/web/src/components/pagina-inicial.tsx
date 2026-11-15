import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { PaginaInicial as Dados } from "@/lib/conteudo";
import { fraseDoProgresso, tamanhoDaTrilha } from "@/lib/formatar";
import { contarLidos, primeiroNaoLido, useArtigosLidos } from "@/lib/progresso";
import { Painel } from "./azulejo";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "./botao-continuar";
import { InfograficoEmLinha } from "./infografico-em-linha";
import { Palavras } from "./palavras";

// O título em duas linhas: a de cima, na letra do cartaz; a de baixo, em letra de
// máquina, com a tira das cinco fitas riscada embaixo.
const TITULO = "Entenda a política brasileira,";
const FRASE = "um passo de cada vez.";

/**
 * A página inicial: o cartaz, com o título gigante, o painel de azulejos, o que
 * é o Mandatômetro e para quem ele é, e o botão que começa ou continua a trilha;
 * depois, o caminho de um projeto de lei, passo a passo. A partir do lg, o
 * painel fica à direita, de cima a baixo; antes disso, é uma faixa de duas
 * fileiras no alto. Abaixo do md, o "para quem" vem depois do botão (`ParaQuem`).
 */
export function PaginaInicial({ pagina }: { pagina: Dados }) {
	const { trilha, caminho } = pagina;
	const lidos = useArtigosLidos();
	const quantosLidos = contarLidos(trilha.artigos, lidos);
	const ondeParou = primeiroNaoLido(trilha.artigos, lidos);
	// O espaço antes da seta, e não uma margem: com a letra grande, quando ela desce
	// sozinha para a linha de baixo, começa alinhada com o texto (o SETA_DO_BOTAO).
	const seta = (
		<>
			{" "}
			<ArrowRight
				aria-hidden="true"
				className={SETA_DO_BOTAO}
				strokeWidth={2.5}
			/>
		</>
	);

	return (
		<>
			<section className="cartaz">
				{/* Quatro colunas de azulejos, com fileiras de sobra para cobrir o cartaz
				    em qualquer janela: a parte que não cabe fica cortada. */}
				<Painel
					semente={7}
					colunas={4}
					quantas={96}
					className="mural"
					sozinho
				/>
				{/* Com a letra grande, o título cresce até "BRASILEIRA," encostar nas
				    margens (o letra-com-teto do index.css). As palavras tombam no lugar
				    uma a uma: o leitor de tela lê o título corrido, pelo aria-label. */}
				<h1
					aria-label={`${TITULO} ${FRASE}`}
					className="titulo-condensado letra-com-teto [--palavra:4.72]"
				>
					<span aria-hidden="true" className="caixa">
						<Palavras texto={TITULO} />
					</span>{" "}
					<em aria-hidden="true">
						<Palavras texto={FRASE} de={4} />
					</em>
				</h1>
				<div className="cartaz-pe">
					<p className="abertura">
						O Mandatômetro explica como funciona a política no Brasil, em
						artigos curtos e em linguagem simples. A trilha do processo
						legislativo mostra como uma ideia vira lei.
					</p>
					<ParaQuem className="hidden md:block" />
					<div className="cartaz-acao">
						{/* A linha acima do botão diz o tamanho da trilha e, depois que a
						    pessoa lê um artigo, o progresso. Ela tem a altura reservada desde
						    o HTML do servidor: quando o progresso aparece, depois da
						    hidratação, o botão fica no lugar, e só os textos e o destino dele
						    mudam. */}
						<p className="progresso rotulo">
							{fraseDoProgresso(quantosLidos, trilha.artigos.length) ||
								tamanhoDaTrilha(trilha.artigos)}
						</p>
						<p>
							{ondeParou ? (
								<Link
									to="/trilhas/$trilha/$artigo"
									params={{ trilha: trilha.slug, artigo: ondeParou.slug }}
									className={BOTAO_CONTINUAR}
								>
									{quantosLidos > 0 ? "Continuar a trilha" : "Começar a trilha"}
									{seta}
								</Link>
							) : (
								<Link
									to="/trilhas/$trilha"
									params={{ trilha: trilha.slug }}
									className={BOTAO_CONTINUAR}
								>
									Ver a trilha
									{seta}
								</Link>
							)}
						</p>
					</div>
					<ParaQuem className="md:hidden" />
				</div>
			</section>
			{caminho && <InfograficoEmLinha caminho={caminho} trilha={trilha} />}
		</>
	);
}

/**
 * Para quem é o site. Abaixo do md, ele vem depois do botão, para o botão caber
 * na primeira tela do celular; a partir do md, antes da linha do progresso. São
 * duas cópias, e o CSS mostra uma de cada vez: a ordem do HTML, que o leitor de
 * tela e o Tab seguem, é a da tela em cada largura. O `order` do CSS mudaria só
 * a tela.
 */
function ParaQuem({ className }: { className: string }) {
	return (
		<p className={`para-quem ${className}`}>
			É para quem vota e quer entender o que acontece depois do voto. Cada
			explicação traz a fonte oficial, e você não precisa criar conta.
		</p>
	);
}
