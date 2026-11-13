import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useId, useState, useSyncExternalStore } from "react";
import { semCliqueDuplo } from "@/lib/clique";
import type { PerguntaNaPagina, QuizNaPagina } from "@/lib/conteudo";
import { semQuebrarCitacao } from "@/lib/formatar";
import {
	acertou,
	avisoDaResposta,
	contarRespondidas,
	FRASE_DO_RECOMECO,
	fraseDoAndamento,
	frasesDoAndamento,
	opcaoRespondida,
	type Respostas,
} from "@/lib/quiz";
import {
	desfazerRecomeco,
	idDoQuiz,
	lerRespostas,
	recomecarQuiz,
	responder,
	useRespostasDoQuiz,
} from "@/lib/respostas-do-quiz";
import { Aviso, useAviso } from "./aviso";
import { ListaDeFontes } from "./fontes";

/*
 * A tela do quiz é simples de propósito: só as peças que o site já tem, os
 * rádios e o "Ver a resposta" do navegador. O desenho fica com a #89.
 */

function semAssinatura(): () => void {
	return () => {};
}

/**
 * Se o JavaScript já carregou. No servidor e na hidratação, não: o HTML do
 * servidor fica sem o que só funciona com JavaScript, como o "Responder".
 */
function useHidratado(): boolean {
	return useSyncExternalStore(
		semAssinatura,
		() => true,
		() => false,
	);
}

/**
 * As perguntas do quiz, o andamento e o rodapé. A resposta fica só no
 * navegador (lib/respostas-do-quiz.ts): responder não faz requisição nenhuma.
 */
export function Quiz({ trilha, anterior, proximo, perguntas }: QuizNaPagina) {
	const quiz = idDoQuiz(trilha.slug);
	const respostas = useRespostasDoQuiz(quiz);
	const hidratado = useHidratado();
	const { aviso, avisar } = useAviso();
	// Se a pessoa recomeçou o quiz nesta visita, para o "Desfazer". Vale até ela
	// sair da página, como o "Recomeçar a trilha".
	const [recomecou, setRecomecou] = useState(false);
	// Recomeçar e desfazer zeram o que está marcado e aberto em cada pergunta.
	const [rodada, setRodada] = useState(0);
	const total = perguntas.length;
	const respondidas = contarRespondidas(perguntas, respostas);
	const andamento =
		respondidas === 0 && recomecou
			? FRASE_DO_RECOMECO
			: fraseDoAndamento(respondidas, total);

	function recomecar() {
		recomecarQuiz(quiz);
		setRecomecou(true);
		setRodada((anteriores) => anteriores + 1);
		avisar(FRASE_DO_RECOMECO);
	}

	function desfazer() {
		desfazerRecomeco(quiz);
		setRecomecou(false);
		setRodada((anteriores) => anteriores + 1);
		avisar(
			fraseDoAndamento(contarRespondidas(perguntas, lerRespostas(quiz)), total),
		);
	}

	// O mesmo botão faz as duas coisas, e o foco fica nele quando uma vira a outra.
	// Num clique duplo, o segundo clique fica de fora (lib/clique.ts).
	const acao = recomecou
		? { texto: "Desfazer", fazer: desfazer }
		: respondidas > 0
			? { texto: "Recomeçar o quiz", fazer: recomecar }
			: undefined;

	return (
		<>
			{/* As duas linhas têm a altura reservada desde o HTML do servidor: quando
			    o andamento aparece, depois da hidratação, as perguntas não descem.
			    Na do andamento, todas as frases ficam no mesmo lugar da grade,
			    invisíveis, e a linha tem a altura da mais alta: no celular com a
			    letra grande, a frase quebra em duas linhas. */}
			<p className="mt-6 grid text-xl font-bold">
				{frasesDoAndamento(total).map((frase) => (
					<span
						key={frase}
						aria-hidden="true"
						className="invisible col-start-1 row-start-1"
					>
						{frase}
					</span>
				))}
				<span className="col-start-1 row-start-1">{andamento}</span>
			</p>
			<div className="mt-3 flex min-h-13 flex-wrap items-center gap-x-6 gap-y-4">
				{acao && (
					<button
						type="button"
						onClick={semCliqueDuplo(acao.fazer)}
						className="acao-de-texto"
					>
						{acao.texto}
					</button>
				)}
			</div>
			<Aviso texto={aviso} />

			<ol key={rodada} className="border-tinta mt-8 border-t-2">
				{perguntas.map((pergunta, indice) => (
					<Pergunta
						key={pergunta.enunciado}
						quiz={quiz}
						trilha={trilha.slug}
						numero={indice + 1}
						total={total}
						pergunta={pergunta}
						respostas={respostas}
						hidratado={hidratado}
						avisar={avisar}
					/>
				))}
			</ol>

			<nav
				aria-label="Artigos da trilha"
				className="mt-12 grid gap-4 md:grid-cols-2"
			>
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
							Fim da trilha
						</span>
						<span className="subtitulo-condensado text-2xl group-hover:underline">
							Voltar para {trilha.titulo}
						</span>
					</Link>
				)}
			</nav>
		</>
	);
}

/**
 * Uma pergunta: o enunciado, as opções, o "Responder" e o "Ver a resposta". Sem
 * JavaScript, a pessoa marca uma opção e abre a resposta, que vem no HTML do
 * servidor; com JavaScript, o "Responder" guarda a resposta e abre a resposta,
 * começando por "Você acertou." ou "Você errou.".
 */
function Pergunta({
	quiz,
	trilha,
	numero,
	total,
	pergunta,
	respostas,
	hidratado,
	avisar,
}: {
	quiz: string;
	trilha: string;
	numero: number;
	total: number;
	pergunta: PerguntaNaPagina;
	respostas: Respostas;
	hidratado: boolean;
	avisar: (texto: string) => void;
}) {
	const nome = useId();
	const respondida = opcaoRespondida(pergunta, respostas);
	// A opção marcada agora, que a pessoa ainda pode não ter respondido.
	const [escolhida, setEscolhida] = useState<number>();
	const [aberta, setAberta] = useState(false);
	const [semEscolha, setSemEscolha] = useState(false);
	const marcada = escolhida ?? respondida;

	function escolher(opcao: number) {
		setEscolhida(opcao);
		setSemEscolha(false);
	}

	// O foco fica no botão, e o resultado vai para o leitor de tela pelo aviso.
	function responderAgora() {
		if (marcada === undefined) {
			setSemEscolha(true);
			avisar("Escolha uma opção antes de responder.");
			return;
		}
		responder(quiz, pergunta.enunciado, pergunta.opcoes[marcada]);
		setAberta(true);
		avisar(avisoDaResposta(numero, pergunta, marcada));
	}

	return (
		<li className="border-tinta border-b-2 border-dashed py-8">
			{/* Sem o min-w-0, o fieldset não encolhe, e a página rola de lado no
			    celular com a letra grande. */}
			<fieldset className="min-w-0">
				<legend className="text-[1.0625rem] font-semibold">
					<span className="block">{`Pergunta ${numero} de ${total}`}</span>{" "}
					<span className="subtitulo-condensado mt-2 block text-[1.75rem] md:text-[2rem]">
						{pergunta.enunciado}
					</span>
				</legend>
				<div className="mt-4 grid gap-1">
					{pergunta.opcoes.map((opcao, indice) => (
						<label
							key={opcao}
							className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 py-2.5 font-serif text-lg leading-snug"
						>
							<input
								type="radio"
								name={nome}
								checked={marcada === indice}
								onChange={() => escolher(indice)}
								className="mt-1 size-5"
							/>
							<span>{opcao}</span>
						</label>
					))}
				</div>
			</fieldset>

			<div className="mt-4 flex min-h-13 flex-wrap items-center gap-x-6 gap-y-2">
				{hidratado && (
					<button
						type="button"
						onClick={responderAgora}
						className="acao-de-texto"
					>
						Responder
					</button>
				)}
				{semEscolha && (
					<p className="text-[1.0625rem] font-semibold">
						Escolha uma opção antes de responder.
					</p>
				)}
			</div>

			<details
				open={aberta}
				onToggle={(evento) => setAberta(evento.currentTarget.open)}
				className="mt-2"
			>
				<summary className="acao-de-texto w-fit">Ver a resposta</summary>
				<div className="mt-5 grid gap-4">
					{respondida !== undefined && (
						<p className="text-xl font-bold">
							{acertou(pergunta, respondida) ? "Você acertou." : "Você errou."}
						</p>
					)}
					<p className="text-lg">
						<strong className="font-bold">Resposta certa:</strong>{" "}
						{pergunta.opcoes[pergunta.certa]}
					</p>
					<p className="max-w-[64ch] font-serif text-lg leading-snug">
						{semQuebrarCitacao(pergunta.explicacao)}
					</p>
					<p className="text-[1.0625rem]">
						Para rever:{" "}
						<Link
							to="/trilhas/$trilha/$artigo"
							params={{ trilha, artigo: pergunta.artigo.slug }}
							className="font-bold"
						>
							{`Artigo ${pergunta.artigo.posicao}: ${pergunta.artigo.titulo}`}
						</Link>
					</p>
					<div>
						<p className="text-[1.0625rem] font-bold">
							{pergunta.fontes.length === 1
								? "Fonte oficial"
								: "Fontes oficiais"}
						</p>
						<ListaDeFontes fontes={pergunta.fontes} className="mt-3" />
					</div>
				</div>
			</details>
		</li>
	);
}
