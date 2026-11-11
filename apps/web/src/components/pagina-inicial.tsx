import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { PaginaInicial as Dados } from "@/lib/conteudo";
import { fraseDoProgresso, tamanhoDaTrilha } from "@/lib/formatar";
import { contarLidos, primeiroNaoLido, useArtigosLidos } from "@/lib/progresso";
import { BOTAO_CONTINUAR } from "./botao-continuar";
import { InfograficoEmLinha } from "./infografico-em-linha";

/**
 * A página inicial: o que é o Mandatômetro e para quem ele é, o botão que
 * começa ou continua a trilha, e o caminho de um projeto de lei, com os
 * artigos que explicam cada parada. A partir do xl, o título fica à esquerda,
 * e o texto e o botão à direita. Abaixo do md, o "para quem" vem depois do
 * botão (`ParaQuem`).
 */
export function PaginaInicial({ pagina }: { pagina: Dados }) {
	const { trilha, caminho } = pagina;
	const lidos = useArtigosLidos();
	const quantosLidos = contarLidos(trilha.artigos, lidos);
	const ondeParou = primeiroNaoLido(trilha.artigos, lidos);
	const seta = (
		<ArrowRight
			aria-hidden="true"
			className="size-5 shrink-0"
			strokeWidth={2.5}
		/>
	);

	return (
		<div className="px-margem-celular mx-auto max-w-[1440px] pt-10 pb-20 md:px-16 lg:pt-14">
			<div className="xl:grid xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:gap-x-16">
				{/* Com a letra grande, o título cresce até "brasileira," encostar nas
				    margens (o letra-com-teto do index.css). */}
				<h1 className="titulo-condensado letra-com-teto [--letra:2.75rem] [--palavra:3.8] md:text-[4.75rem]">
					Entenda a política brasileira, um passo de cada vez.
				</h1>
				<div className="mt-6 xl:mt-2">
					<p className="max-w-[40ch] font-serif text-xl leading-snug font-medium lg:text-[1.5625rem] lg:leading-[1.4] xl:text-[1.375rem]">
						O Mandatômetro explica como funciona a política no Brasil, em
						artigos curtos e em linguagem simples. A primeira trilha mostra como
						uma ideia vira lei.
					</p>
					<ParaQuem className="mt-4 hidden md:block" />
					{/* A linha acima do botão diz o tamanho da trilha e, depois que a
					    pessoa lê um artigo, o progresso. Ela tem a altura reservada desde
					    o HTML do servidor: quando o progresso aparece, depois da
					    hidratação, o botão fica no lugar, e só os textos e o destino dele
					    mudam. */}
					<p className="mt-5 min-h-7 text-xl font-bold">
						{fraseDoProgresso(quantosLidos, trilha.artigos.length) ||
							tamanhoDaTrilha(trilha.artigos)}
					</p>
					<p className="mt-2">
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
					<ParaQuem className="mt-5 md:hidden" />
				</div>
			</div>
			{caminho && (
				<InfograficoEmLinha
					caminho={caminho}
					trilha={trilha}
					className="mt-16 lg:mt-20"
				/>
			)}
		</div>
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
		<p className={`max-w-[52ch] text-[1.0625rem] ${className}`}>
			É para quem vota e quer entender o que acontece depois do voto. Cada
			explicação traz a fonte oficial, e você não precisa criar conta.
		</p>
	);
}
