// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
	type CSSProperties,
	type FormEvent,
	type ReactNode,
	useEffect,
	useId,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { azulejoGrande } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { semCliqueDuplo } from "@/lib/clique";
import type { PerguntaNaPagina, QuizNaPagina } from "@/lib/conteudo";
import { plural, semQuebrarCitacao } from "@/lib/formatar";
import { movimentoReduzido, virar } from "@/lib/painel-vivo";
import {
	acertou,
	avisoDaResposta,
	colunasDoMosaico,
	contarAcertos,
	contarRespondidas,
	FRASE_DO_RECOMECO,
	fraseDoAndamento,
	frasesDoAndamento,
	opcaoRespondida,
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
import { AzulejoGrande } from "./azulejo";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "./botao-continuar";
import { Caminho } from "./caminho";
import { ListaDeFontes } from "./fontes";
import { LugarDoBotao } from "./lugar-do-botao";
import { OutrosArtigos } from "./outros-artigos";
import { Reservas } from "./reservas";

/*
 * A tela do quiz (DESIGN.md): uma pergunta por vez. A abertura tem o título
 * gigante e o mosaico, com um azulejo por pergunta; cada pergunta mostra as
 * opções, e a resposta chega numa folha, com a explicação e a fonte; o fim diz
 * o que rever. O mosaico e os quadradinhos do andamento ganham cor a cada
 * pergunta respondida, e não a cada acerto: o quiz não dá nota.
 *
 * A correção e as frases ficam em lib/quiz.ts, e o que o navegador guarda, em
 * lib/respostas-do-quiz.ts. O desenho está em estilos/quiz.css.
 *
 * O piloto (components/piloto.tsx) usa este mesmo palco nas duas etapas: o
 * antes, na página /piloto, com a abertura e o fim dela e sem a resposta
 * certa, e o depois, no próprio quiz final, em que vale a primeira resposta.
 */

/** As telas do quiz. A resposta de uma pergunta aparece na tela da pergunta. */
type Tela = "abertura" | "pergunta" | "fim";

/** Quanto a tela demora para sair, em ms: é o tempo da animação de saída dela. */
const SAIDA: Record<Tela, number> = { abertura: 520, pergunta: 440, fim: 440 };

/** A letra de cada opção, que é só desenho: o leitor de tela diz a posição. */
const LETRAS = "ABCDEFGHIJ";

/**
 * Os textos do botão que leva às perguntas: sem resposta, com o quiz pela
 * metade e com o quiz terminado. O lugar do botão guarda a altura do mais alto.
 */
const TEXTOS_DO_COMECO = [
	"Começar",
	"Continuar",
	"Rever as respostas",
] as const;

/** O título de cada tela, que recebe o foco quando ela aparece. */
const TITULOS = {
	enunciado: ".quiz-enunciado",
	veredito: ".quiz-veredito",
	fim: ".quiz-fim h2",
};

/**
 * A etapa do piloto que as respostas medem agora. No antes, a resposta certa
 * não aparece: o "Responder" guarda a resposta e passa à próxima pergunta. No
 * depois, vale a primeira resposta de cada pergunta, e o "Recomeçar o quiz" não
 * aparece. Concluída a etapa, o quiz volta a ser o de sempre.
 */
export type EtapaDoQuiz = "antes" | "depois";

/** O que a abertura e o fim de fora, os do piloto, recebem do quiz. */
export type PartesDoQuiz = {
	/** Leva às perguntas: à primeira sem resposta ou, com todas respondidas, à primeira. */
	comecar: () => void;
	/** Quantas perguntas já têm resposta. */
	respondidas: number;
	/** Se o JavaScript já carregou: antes dele, os botões não aparecem. */
	hidratado: boolean;
	/** Avisa o leitor de tela, na região de avisos do palco. */
	avisar: (texto: string) => void;
};

function semAssinatura(): () => void {
	return () => {};
}

/**
 * Se o JavaScript já carregou. No servidor e na hidratação, não: o HTML do
 * servidor fica sem o que só funciona com JavaScript, como o "Começar".
 */
export function useHidratado(): boolean {
	return useSyncExternalStore(
		semAssinatura,
		() => true,
		() => false,
	);
}

/**
 * O quiz da trilha ou o quiz final, a página inteira: o palco, com a abertura,
 * as perguntas e o fim, e, embaixo, o artigo anterior e o próximo. A resposta
 * fica só no navegador (lib/respostas-do-quiz.ts): responder não faz
 * requisição nenhuma. No piloto, quem usa o quiz recebe os acertos de cada
 * etapa no `aoTerminar` e manda à API (components/piloto.tsx).
 */
export function Quiz({
	trilha,
	anterior,
	proximo,
	perguntas,
	titulo = "Quiz da trilha",
	quiz = idDoQuiz(trilha.slug),
	etapa,
	aoTerminar,
	linha,
	abertura,
	fim,
	soOPalco = false,
}: QuizNaPagina & {
	/** O título da página: o do quiz da trilha, o do quiz final ou o do antes. */
	titulo?: string;
	/** Onde o navegador guarda as respostas (lib/respostas-do-quiz.ts). */
	quiz?: string;
	/** A etapa do piloto que as respostas medem agora, se medem. */
	etapa?: EtapaDoQuiz;
	/**
	 * Chamada quando a pessoa responde a última pergunta que faltava, com o
	 * total de acertos, que a tela não mostra.
	 */
	aoTerminar?: (acertos: number) => void;
	/**
	 * Uma linha do piloto, embaixo do título, na abertura e no fim do quiz. Como
	 * função, ela recebe as partes do quiz, como o aviso ao leitor de tela.
	 */
	linha?: ReactNode | ((partes: PartesDoQuiz) => ReactNode);
	/** A abertura do piloto, no lugar da do quiz. */
	abertura?: (partes: PartesDoQuiz) => ReactNode;
	/** O fim do piloto, no lugar do do quiz, numa .quiz-fim com o título num h2. */
	fim?: (partes: PartesDoQuiz) => ReactNode;
	/**
	 * Só o palco: sem as perguntas abertas do noscript e sem o artigo anterior e
	 * o próximo embaixo dele, como na página do piloto.
	 */
	soOPalco?: boolean;
}) {
	const respostas = useRespostasDoQuiz(quiz);
	const hidratado = useHidratado();
	const { aviso, avisar } = useAviso();
	const nome = useId();
	const [tela, setTela] = useState<Tela>("abertura");
	// Enquanto a tela de agora sai, antes de a próxima entrar.
	const [saindo, setSaindo] = useState(false);
	const [atual, setAtual] = useState(0);
	// A opção marcada agora, que a pessoa ainda pode não ter respondido.
	const [escolhida, setEscolhida] = useState<number>();
	// Se a resposta da pergunta da vez está à vista.
	const [aberta, setAberta] = useState(false);
	const [semEscolha, setSemEscolha] = useState(false);
	// Se a pessoa acabou de recomeçar o quiz, para o "Desfazer". Vale até ela
	// começar a responder de novo ou sair da página.
	const [recomecou, setRecomecou] = useState(false);

	const palco = useRef<HTMLElement>(null);
	const mosaico = useRef<HTMLDivElement>(null);
	const relogio = useRef<ReturnType<typeof setTimeout>>(undefined);
	const ondas = useRef<Array<() => void>>([]);
	// O título que recebe o foco depois da próxima troca de tela.
	const foco = useRef<keyof typeof TITULOS>(undefined);

	const total = perguntas.length;
	const colunas = colunasDoMosaico(total);
	const respondidas = contarRespondidas(perguntas, respostas);
	const pergunta = perguntas[atual];
	const respondida = opcaoRespondida(pergunta, respostas);
	const marcada = escolhida ?? respondida;
	// No depois do piloto, a resposta dada não muda mais: as opções travam.
	const travada = etapa === "depois" && respondida !== undefined;
	const naResposta = tela === "pergunta" && aberta && respondida !== undefined;
	const certa = naResposta && acertou(pergunta, respondida);
	// Na abertura, o mosaico é a capa, inteiro e em cor. Dali em diante, cada
	// peça tem cor quando a pergunta dela foi respondida.
	const naCapa = tela === "abertura" && !saindo;
	const andamento =
		respondidas === 0 && recomecou
			? FRASE_DO_RECOMECO
			: fraseDoAndamento(respondidas, total);

	useEffect(
		() => () => {
			clearTimeout(relogio.current);
			for (const desistir of ondas.current) {
				desistir();
			}
		},
		[],
	);

	// Depois de cada troca de tela, o foco vai para o título do que apareceu, e
	// quem usa o teclado ou o leitor de tela continua dali. A resposta entra na
	// tela, se estiver fora dela; a pergunta nova e o fim começam do alto.
	useEffect(() => {
		const alvo = foco.current;
		if (!alvo) {
			return;
		}
		foco.current = undefined;
		const titulo = palco.current?.querySelector<HTMLElement>(TITULOS[alvo]);
		titulo?.focus({ preventScroll: true });
		const behavior = movimentoReduzido() ? "auto" : "smooth";
		if (alvo !== "veredito") {
			window.scrollTo({ top: 0, behavior });
			return;
		}
		const folha = titulo?.closest(".quiz-retorno");
		// O jsdom dos testes não tem o scrollIntoView.
		if (typeof folha?.scrollIntoView === "function") {
			folha.scrollIntoView({ block: "nearest", behavior });
		}
	});

	/**
	 * Deixa a tela de agora sair (estilos/quiz.css) e só então faz a troca. Com o
	 * movimento reduzido, e onde o navegador não anima, a troca é na hora.
	 */
	function trocar(fazer: () => void) {
		const espera =
			movimentoReduzido() || typeof Element.prototype.animate !== "function"
				? 0
				: SAIDA[tela];
		if (espera === 0) {
			fazer();
			return;
		}
		setSaindo(true);
		relogio.current = setTimeout(() => {
			setSaindo(false);
			fazer();
		}, espera);
	}

	/**
	 * Abre uma pergunta. A que já tem resposta guardada abre com a resposta à
	 * vista, menos no antes do piloto, que nunca mostra a certa: lá, ela abre com a
	 * opção guardada marcada, como numa outra aba que respondeu primeiro.
	 */
	function abrirPergunta(indice: number) {
		setAtual(indice);
		setEscolhida(undefined);
		setSemEscolha(false);
		setAberta(
			etapa !== "antes" &&
				opcaoRespondida(perguntas[indice], lerRespostas(quiz)) !== undefined,
		);
		setTela("pergunta");
		foco.current = "enunciado";
	}

	/**
	 * Começa pela primeira pergunta sem resposta. Com o quiz terminado, começa da
	 * primeira, e a pessoa revê cada resposta. Dali em diante, o recomeço não se
	 * desfaz mais.
	 */
	function comecar() {
		if (saindo) {
			return;
		}
		setRecomecou(false);
		const guardadas = lerRespostas(quiz);
		const semResposta = perguntas.findIndex(
			(outra) => opcaoRespondida(outra, guardadas) === undefined,
		);
		trocar(() => abrirPergunta(Math.max(semResposta, 0)));
	}

	// Trocar de opção depois de responder fecha a resposta: vale a próxima.
	function escolher(opcao: number) {
		setEscolhida(opcao);
		setSemEscolha(false);
		setAberta(false);
	}

	function responderAgora(evento: FormEvent) {
		evento.preventDefault();
		if (naResposta || travada || saindo) {
			return;
		}
		if (marcada === undefined) {
			setSemEscolha(true);
			avisar("Escolha uma opção antes de responder.");
			return;
		}
		responder(quiz, pergunta.enunciado, pergunta.opcoes[marcada]);
		// A última pergunta que faltava: a etapa do piloto, se houver, termina
		// aqui, mesmo que a pessoa saia antes do "Terminar".
		const guardadas = lerRespostas(quiz);
		if (
			respondidas < total &&
			contarRespondidas(perguntas, guardadas) === total
		) {
			aoTerminar?.(contarAcertos(perguntas, guardadas));
		}
		if (etapa === "antes") {
			// No antes, a resposta certa fica para o quiz final: a resposta só é
			// guardada, e a próxima pergunta vem logo.
			avisar(`Pergunta ${atual + 1}: resposta guardada.`);
			seguir();
			return;
		}
		setAberta(true);
		avisar(avisoDaResposta(atual + 1, pergunta, marcada));
		foco.current = "veredito";
		// As peças já acesas do mosaico acompanham a que acende agora: a cada
		// pergunta respondida, a onda fica maior.
		ondas.current = [...(mosaico.current?.children ?? [])].flatMap(
			(grande, indice) => {
				const longe = Math.abs(indice - atual);
				if (
					longe === 0 ||
					opcaoRespondida(perguntas[indice], respostas) === undefined
				) {
					return [];
				}
				return [...grande.children].map((peca, qual) =>
					virar(peca, () => {}, 420 + longe * 120 + qual * 50),
				);
			},
		);
	}

	function seguir() {
		if (saindo) {
			return;
		}
		trocar(() => {
			if (atual + 1 < total) {
				abrirPergunta(atual + 1);
				return;
			}
			setTela("fim");
			foco.current = "fim";
			// No fim, o mosaico inteiro faz a onda: ela comemora ter chegado até
			// ali, com qualquer resposta.
			ondas.current = [...(mosaico.current?.querySelectorAll(".az") ?? [])].map(
				(peca, qual) =>
					virar(
						peca,
						() => {},
						200 + (qual % 4) * 60 + Math.floor(qual / 4) * 110,
					),
			);
		});
	}

	function recomecar() {
		recomecarQuiz(quiz);
		setRecomecou(true);
		avisar(FRASE_DO_RECOMECO);
	}

	function desfazer() {
		desfazerRecomeco(quiz);
		setRecomecou(false);
		avisar(
			fraseDoAndamento(contarRespondidas(perguntas, lerRespostas(quiz)), total),
		);
	}

	// O mesmo botão faz as duas coisas, e o foco fica nele quando uma vira a
	// outra. Ele fica numa linha só dele, que não muda de lugar com o recomeço, e
	// num clique duplo o segundo clique fica de fora (lib/clique.ts).
	const acao = recomecou
		? { texto: "Desfazer", fazer: desfazer }
		: respondidas > 0
			? { texto: "Recomeçar o quiz", fazer: recomecar }
			: undefined;
	const partes: PartesDoQuiz = { comecar, respondidas, hidratado, avisar };
	const linhaNaTela = typeof linha === "function" ? linha(partes) : linha;
	// Enquanto uma etapa do piloto mede as respostas, o botão não aparece, e a
	// linha dele não guarda lugar: na abertura do depois, a linha vazia só
	// empurrava o "Começar" para baixo da primeira tela do celular.
	const recomeco = etapa === undefined && (
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
	);

	// O botão que leva às perguntas, na abertura e no fim. Ele também deixa de
	// fora o segundo clique de um clique duplo: se o "Desfazer" sair do lugar, o
	// clique que sobrou não começa o quiz.
	const comeco = (vazado: boolean) => (
		<button
			type="button"
			onClick={semCliqueDuplo(comecar)}
			className={classes(BOTAO_CONTINUAR, vazado && "vazado")}
		>
			{respondidas === 0
				? TEXTOS_DO_COMECO[0]
				: respondidas < total
					? TEXTOS_DO_COMECO[1]
					: TEXTOS_DO_COMECO[2]}{" "}
			<ArrowRight
				aria-hidden="true"
				className={SETA_DO_BOTAO}
				strokeWidth={2.5}
			/>
		</button>
	);

	// Os artigos de onde saem as respostas, na ordem da trilha.
	const artigos = [
		...new Map(
			perguntas.map(({ artigo }) => [artigo.slug, artigo] as const),
		).values(),
	].sort((a, b) => a.posicao - b.posicao);
	const posicaoDe = (slug: string) =>
		trilha.artigos.findIndex((artigo) => artigo.slug === slug) + 1;

	return (
		<div className="pagina-do-quiz">
			{/* Com a linha do piloto, a abertura fica mais alta, e o pé dela não
			    prende embaixo (estilos/quiz.css): no celular pequeno, ele cobria o
			    "Começar". */}
			<section
				ref={palco}
				aria-labelledby="quiz-titulo"
				className="quiz"
				data-fase={naResposta ? "resposta" : tela}
				data-saindo={saindo || undefined}
				data-linha={Boolean(linhaNaTela) || undefined}
				data-resultado={naResposta ? (certa ? "certa" : "errada") : undefined}
				style={
					{
						"--colunas": colunas,
						"--fileiras": Math.ceil(total / colunas),
					} as CSSProperties
				}
			>
				<Caminho trilha={trilha} />
				{/* O mosaico: um azulejo por pergunta, na ordem delas. É só desenho, e
				    não diz nada sobre acertos. No celular, ele parte da linha embaixo
				    da migalha (estilos/quiz.css), e por isso vem depois dela. */}
				<div aria-hidden="true" className="quiz-cena">
					<div ref={mosaico} className="mosaico">
						{perguntas.map((outra, indice) => {
							const crua =
								!naCapa && opcaoRespondida(outra, respostas) === undefined;
							return (
								<AzulejoGrande
									key={outra.enunciado}
									pecas={azulejoGrande(indice, indice % 6)}
									cru={crua}
									// Ao começar e ao recomeçar, as peças perdem a cor em onda.
									passo={crua ? 60 : 90}
									atraso={crua ? indice * 90 : 0}
								/>
							);
						})}
					</div>
				</div>

				{/* Na abertura, o título é gigante. Nas outras telas, ele sai da vista
				    e fica para o leitor de tela, com o nome do palco (estilos/quiz.css),
				    e quem vê lê o nome do quiz no pé. Com a letra grande, ele cresce até
				    "TRILHA", a palavra mais larga dos títulos dos quizzes, encostar nas
				    margens (o letra-com-teto do index.css). */}
				<h1
					id="quiz-titulo"
					className="quiz-titulo titulo-condensado letra-com-teto [--palavra:2.74]"
				>
					{titulo}
				</h1>

				<div className="quiz-palco">
					{tela === "abertura" && (
						<div className="quiz-abertura">
							{abertura ? (
								abertura(partes)
							) : (
								<>
									{linhaNaTela}
									<p className="abertura">
										Em cada pergunta, escolha uma opção e responda. Você vê se
										acertou, a resposta certa, a explicação e a fonte oficial.
									</p>
									<p className="faixa rotulo">
										<span>{plural(total, "pergunta", "perguntas")}</span>
										<span>Fonte oficial em cada resposta</span>
									</p>
									{recomeco}
									{/* O "Começar" só funciona com JavaScript, e por isso só
									    aparece depois que ele carrega. O lugar dele guarda, desde
									    o HTML do servidor, a altura do texto mais alto que o
									    botão pode ter ("Rever as respostas" vai em duas linhas no
									    celular, com a letra grande), e nada sai do lugar. */}
									<LugarDoBotao
										textos={TEXTOS_DO_COMECO}
										className="quiz-comeco"
									>
										{hidratado && comeco(false)}
									</LugarDoBotao>
								</>
							)}
						</div>
					)}

					{tela === "pergunta" && (
						// A chave monta a pergunta de novo a cada troca: as opções entram
						// uma a uma, e nada da pergunta anterior fica marcado.
						<form
							key={atual}
							noValidate
							onSubmit={responderAgora}
							className="quiz-pergunta"
						>
							<div className="quiz-lado">
								{/* Sem o min-width: 0 (estilos/quiz.css), o fieldset não
								    encolhe, e a página rola de lado no celular com a letra
								    grande. Travado, no depois do piloto, ele desliga as
								    opções, e o leitor de tela diz que elas estão
								    indisponíveis. */}
								<fieldset disabled={travada || undefined}>
									<legend>
										<span className="quiz-contagem rotulo">{`Pergunta ${atual + 1} de ${total}`}</span>{" "}
										<h2 tabIndex={-1} className="quiz-enunciado">
											{pergunta.enunciado}
										</h2>
									</legend>
									<div className="quiz-opcoes">
										{pergunta.opcoes.map((opcao, indice) => {
											const marca = !naResposta
												? undefined
												: indice === pergunta.certa
													? "Resposta certa"
													: indice === respondida
														? "Sua resposta"
														: undefined;
											return (
												<label
													key={opcao}
													className="quiz-opcao"
													data-estado={
														!naResposta
															? undefined
															: indice === pergunta.certa
																? "certa"
																: indice === respondida
																	? "errada"
																	: "apagada"
													}
													style={{ "--j": indice } as CSSProperties}
												>
													<input
														type="radio"
														name={nome}
														checked={marcada === indice}
														onChange={() => escolher(indice)}
													/>
													<span aria-hidden="true" className="quiz-letra">
														{LETRAS[indice]}
													</span>
													<span className="quiz-texto">{opcao}</span>
													{marca && (
														<>
															{" "}
															<span className="quiz-marca rotulo">{marca}</span>
														</>
													)}
												</label>
											);
										})}
									</div>
								</fieldset>
								{!naResposta && (
									<div className="quiz-acao">
										<button type="submit" className={BOTAO_CONTINUAR}>
											Responder
										</button>
										{semEscolha && (
											<p className="quiz-falta">
												Escolha uma opção antes de responder.
											</p>
										)}
									</div>
								)}
							</div>

							{/* A folha da resposta: o foco vai para o resultado, e o leitor de
							    tela também ouve o aviso, com a resposta certa. */}
							{naResposta && (
								<div className="quiz-retorno folha">
									<p tabIndex={-1} className="quiz-veredito">
										{certa ? "Você acertou." : "Você errou."}
									</p>
									<Resposta
										trilha={trilha.slug}
										pergunta={pergunta}
										comACerta={!certa}
									/>
									<button
										type="button"
										onClick={semCliqueDuplo(seguir)}
										className={classes(BOTAO_CONTINUAR, "quiz-seguir")}
									>
										{atual + 1 < total ? "Próxima pergunta" : "Terminar"}{" "}
										<ArrowRight
											aria-hidden="true"
											className={SETA_DO_BOTAO}
											strokeWidth={2.5}
										/>
									</button>
								</div>
							)}
						</form>
					)}

					{tela === "fim" && fim?.(partes)}

					{tela === "fim" && !fim && (
						<div className="quiz-fim">
							{/* Com a letra grande, o título cresce até "RECOMEÇOU" encostar
							    nas margens (o letra-com-teto do index.css). Ele guarda o
							    tamanho da frase mais alta: o "Recomeçar o quiz", logo
							    embaixo, não sai do lugar quando a frase muda. */}
							<h2
								tabIndex={-1}
								className="titulo-condensado letra-com-teto grid [--palavra:4.8]"
							>
								<Reservas frases={frasesDoAndamento(total)} />
								<span className="col-start-1 row-start-1">
									{respondidas === 0
										? FRASE_DO_RECOMECO
										: fraseDoAndamento(respondidas, total)}
								</span>
							</h2>
							{linhaNaTela}
							{recomeco}
							<p className="quiz-fim-texto">
								{artigos.length === 1
									? "Para rever, o artigo do quiz:"
									: "Para rever, os artigos do quiz:"}
							</p>
							<ul role="list" className="quiz-fim-lista">
								{artigos.map((artigo) => (
									<li key={artigo.slug}>
										<Link
											to="/trilhas/$trilha/$artigo"
											params={{ trilha: trilha.slug, artigo: artigo.slug }}
										>
											<span className="rotulo">Artigo {artigo.posicao}</span>{" "}
											<span className="quiz-fim-artigo">{artigo.titulo}</span>
										</Link>
									</li>
								))}
							</ul>
							<p className="quiz-fim-acoes">
								<Link
									to="/trilhas/$trilha"
									params={{ trilha: trilha.slug }}
									activeOptions={{ exact: true }}
									className={BOTAO_CONTINUAR}
								>
									Voltar para {trilha.titulo}{" "}
									<ArrowRight
										aria-hidden="true"
										className={SETA_DO_BOTAO}
										strokeWidth={2.5}
									/>
								</Link>
								{comeco(true)}
							</p>
						</div>
					)}
				</div>

				{/* O andamento: um quadradinho por pergunta, que ganha cor quando ela é
				    respondida, e a frase, sem contar acertos. A linha da frase guarda o
				    tamanho da mais comprida desde o HTML do servidor: no celular com a
				    letra grande, ela quebra em duas linhas. No fim, a frase já está no
				    título da tela.
				    Fora da abertura, o nome do quiz vem antes da frase: é ali que quem
				    vê descobre em que quiz está, e não numa etiqueta acima do título (a
				    #136). O leitor de tela já tem o h1, e o nome fica fora dele. */}
				<div className="quiz-pe">
					<ol aria-hidden="true" className="quiz-andamento">
						{perguntas.map((outra, indice) => (
							<li
								key={outra.enunciado}
								data-estado={
									opcaoRespondida(outra, respostas) === undefined
										? "falta"
										: "feito"
								}
								data-agora={
									(tela === "pergunta" && indice === atual) || undefined
								}
							/>
						))}
					</ol>
					<div className="quiz-pe-linha">
						{tela !== "abertura" && (
							<span aria-hidden="true" className="quiz-nome rotulo">
								{titulo}
							</span>
						)}
						<p className="quiz-andamento-texto rotulo grid">
							<Reservas frases={frasesDoAndamento(total)} />
							<span className="col-start-1 row-start-1">
								{tela === "fim" ? "" : andamento}
							</span>
						</p>
					</div>
				</div>
				<Aviso texto={aviso} />
			</section>

			{!soOPalco && (
				<>
					<SemJavaScript trilha={trilha.slug} perguntas={perguntas} />

					<OutrosArtigos
						trilha={trilha}
						anterior={{ ...anterior, posicao: posicaoDe(anterior.slug) }}
						proximo={
							proximo && { ...proximo, posicao: posicaoDe(proximo.slug) }
						}
						nome="Artigos da trilha"
						fim="Fim da trilha"
					/>
				</>
			)}
		</div>
	);
}

/**
 * O que a pessoa lê depois de responder: a resposta certa, a explicação, o
 * artigo para rever e as fontes oficiais, com a data da consulta.
 */
function Resposta({
	trilha,
	pergunta,
	comACerta,
}: {
	/** O slug da trilha. */
	trilha: string;
	pergunta: PerguntaNaPagina;
	/** Quem acertou já vê a resposta certa marcada entre as opções. */
	comACerta: boolean;
}) {
	return (
		<>
			{comACerta && (
				<p className="quiz-certa">
					<strong>Resposta certa:</strong> {pergunta.opcoes[pergunta.certa]}
				</p>
			)}
			<p className="quiz-explicacao">
				{semQuebrarCitacao(pergunta.explicacao)}
			</p>
			<p className="quiz-rever">
				Para rever:{" "}
				<Link
					to="/trilhas/$trilha/$artigo"
					params={{ trilha, artigo: pergunta.artigo.slug }}
				>
					{`Artigo ${pergunta.artigo.posicao}: ${pergunta.artigo.titulo}`}
				</Link>
			</p>
			<div className="quiz-fontes">
				<p className="rotulo">
					{pergunta.fontes.length === 1 ? "Fonte oficial" : "Fontes oficiais"}
				</p>
				<ListaDeFontes fontes={pergunta.fontes} className="mt-3" />
			</div>
		</>
	);
}

/**
 * O quiz sem JavaScript: todas as perguntas na página, cada uma com as opções e
 * o "Ver a resposta" do navegador, que abre a resposta certa, a explicação e as
 * fontes. Vem no HTML do servidor, dentro do noscript: com JavaScript, o
 * navegador não monta nada disto.
 */
function SemJavaScript({
	trilha,
	perguntas,
}: {
	/** O slug da trilha. */
	trilha: string;
	perguntas: PerguntaNaPagina[];
}) {
	const nome = useId();
	return (
		<noscript>
			<ol className="quiz-sem-js">
				{perguntas.map((pergunta, indice) => (
					<li key={pergunta.enunciado} className="folha">
						<fieldset>
							<legend>
								<span className="quiz-contagem rotulo">{`Pergunta ${indice + 1} de ${perguntas.length}`}</span>{" "}
								<h2 className="quiz-enunciado">{pergunta.enunciado}</h2>
							</legend>
							<div className="quiz-opcoes">
								{pergunta.opcoes.map((opcao, qual) => (
									<label key={opcao} className="quiz-opcao">
										<input type="radio" name={`${nome}-${indice}`} />
										<span aria-hidden="true" className="quiz-letra">
											{LETRAS[qual]}
										</span>
										<span className="quiz-texto">{opcao}</span>
									</label>
								))}
							</div>
						</fieldset>
						<details>
							<summary className="acao-de-texto">Ver a resposta</summary>
							<div className="quiz-resposta">
								<Resposta trilha={trilha} pergunta={pergunta} comACerta />
							</div>
						</details>
					</li>
				))}
			</ol>
		</noscript>
	);
}
