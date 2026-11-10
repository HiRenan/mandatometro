import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { PaginaInicial as Dados } from "@/lib/conteudo";
import { fraseDoProgresso } from "@/lib/formatar";
import { contarLidos, primeiroNaoLido, useArtigosLidos } from "@/lib/progresso";
import { InfograficoEmLinha } from "./infografico-em-linha";

const BOTAO =
	"bg-tinta text-papel inline-flex items-center gap-3 px-5 py-3 text-lg font-bold no-underline hover:underline";

/**
 * A página inicial: o que é o Mandatômetro e para quem ele é, o botão que
 * começa ou continua a trilha, e o caminho de um projeto de lei, com os
 * artigos que explicam cada parada. A partir do xl, o título fica à esquerda,
 * e o texto e o botão à direita.
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
		<div className="mx-auto max-w-[1440px] px-5 pt-10 pb-20 md:px-16 lg:pt-14">
			<div className="xl:grid xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:gap-x-16">
				<h1 className="titulo-condensado folha:text-[5.5rem] text-[2.75rem] md:text-[4.5rem] xl:text-[5rem]">
					Entenda a política brasileira, um passo de cada vez.
				</h1>
				<div className="mt-6 xl:mt-2">
					<p className="max-w-[40ch] font-serif text-xl leading-snug font-medium lg:text-[1.5625rem] lg:leading-[1.4] xl:text-[1.375rem]">
						O Mandatômetro explica como funciona a política no Brasil, em
						artigos curtos e em linguagem simples. A primeira trilha mostra como
						uma ideia vira lei.
					</p>
					<p className="mt-4 max-w-[52ch] text-[1.0625rem]">
						É para quem vota e quer entender o que acontece depois do voto. Cada
						explicação traz a fonte oficial, e você não precisa criar conta.
					</p>
					{/* A linha do progresso tem a altura reservada desde o HTML do
					    servidor: quando o progresso aparece, depois da hidratação, o
					    botão fica no lugar, e só o texto e o destino dele mudam. */}
					<p className="mt-5 min-h-7 text-xl font-bold">
						{fraseDoProgresso(quantosLidos, trilha.artigos.length)}
					</p>
					<p className="mt-2">
						{ondeParou ? (
							<Link
								to="/trilhas/$trilha/$artigo"
								params={{ trilha: trilha.slug, artigo: ondeParou.slug }}
								className={BOTAO}
							>
								{quantosLidos > 0 ? "Continuar a trilha" : "Começar a trilha"}
								{seta}
							</Link>
						) : (
							<Link
								to="/trilhas/$trilha"
								params={{ trilha: trilha.slug }}
								className={BOTAO}
							>
								Ver a trilha
								{seta}
							</Link>
						)}
					</p>
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
