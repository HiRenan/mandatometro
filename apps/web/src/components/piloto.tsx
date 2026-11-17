// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { classes } from "@/lib/classes";
import { semCliqueDuplo } from "@/lib/clique";
import type { QuizNaPagina } from "@/lib/conteudo";
import { classeDaFita } from "@/lib/formatar";
import {
	comecarComoOutraPessoa,
	comecarPiloto,
	concluirEtapa,
	etapaFeita,
	type NomeDaEtapa,
	type Piloto,
	QUIZ_DO_ANTES,
	TRILHA_DO_PILOTO,
	usePiloto,
} from "@/lib/piloto";
import {
	esquecerEnvio,
	type SituacaoDoEnvio,
	situacaoDoEnvio,
	tentarDeNovo,
	useEnvioDoPiloto,
} from "@/lib/reenvio-do-piloto";
import { idDoQuizFinal } from "@/lib/respostas-do-quiz";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "./botao-continuar";
import { LugarDoBotao } from "./lugar-do-botao";
import { MarcaDeLido } from "./marca-de-lido";
import { type PartesDoQuiz, Quiz, Reservas } from "./quiz";

/*
 * O piloto na tela (docs/medicao-do-piloto.md): a página /piloto, com o antes,
 * e o quiz final, que vira o depois para quem fez o antes neste navegador. As
 * duas usam o palco do quiz (components/quiz.tsx). O que o navegador guarda do
 * piloto fica em lib/piloto.ts.
 *
 * Só o site com a API (o API_URL do build) tem o piloto: sem ela, a página
 * avisa, e o quiz final é o de sempre. A tela nunca mostra o total de acertos,
 * e o código do piloto não aparece nela.
 */

const ABERTURA =
	"Responda 12 perguntas sobre como nasce uma lei antes de ler a trilha. No fim dela, você responde as mesmas perguntas de novo. O site envia só quantas você acertou em cada vez: sem nome, sem e-mail e sem conta.";

const NOTAS = [
	"Nesta etapa, a resposta certa não aparece: ela fica para o quiz final, no fim da trilha.",
	"O piloto é para quem tem 18 anos ou mais. Quem tem menos pode ler a trilha e fazer o quiz final, que não envia nada.",
	"Num computador usado por mais gente, abra uma janela anônima antes de começar e deixe ela aberta até o quiz final.",
] as const;

const CONCLUIDO = "Este navegador já participou do piloto. Obrigado!";
const ENCERRADO =
	"O piloto não está recebendo respostas agora. As perguntas continuam no quiz final, no fim da trilha.";
const SEM_API = "O piloto ainda não funciona neste endereço do site.";
const OUTRA_PESSOA =
	"Outra pessoa usou este navegador? Comece do zero: o site apaga daqui os artigos lidos, as respostas dos quizzes e o piloto.";
const PRONTO = "Pronto: este navegador começou do zero.";
const FIM_DO_ANTES =
	"Agora leia a trilha: seis artigos curtos. No fim do último, o quiz final traz as mesmas perguntas, com a resposta certa, a explicação e a fonte de cada uma.";
const SEGUNDA_ETAPA =
	"Piloto, segunda etapa: são as mesmas 12 perguntas do começo. Vale a primeira resposta de cada uma. No fim, o site envia quantas você acertou, sem o seu nome.";

/** A linha do envio de cada etapa, com o que a API respondeu. */
const ENVIANDO = {
	antes: "Enviando a primeira etapa…",
	depois: "Enviando a segunda etapa…",
} as const;
const RECEBIDA = {
	antes: "Recebemos a primeira etapa.",
	depois: "Recebemos a segunda etapa. Obrigado por participar do piloto.",
} as const;
// O texto da Atena, de 16/11: o 410 vem antes de o piloto ligar e depois de ele
// acabar, e a frase serve para os dois.
const ENCERRADO_NO_ENVIO =
	"O piloto não está recebendo respostas agora, e esta etapa não foi enviada. As perguntas continuam aqui para você aprender.";
const FORA_DO_AR =
	"Não conseguimos enviar agora. O site guarda a etapa neste navegador e tenta de novo daqui a pouco.";
const SEM_CONEXAO =
	"Sem conexão, a etapa não foi enviada. Ela fica guardada neste navegador e sai quando a internet voltar.";
const RECUSADO =
	"Não deu para enviar esta etapa, e o site não vai tentar de novo. As suas respostas continuam aqui.";

function textoDoEnvio(etapa: NomeDaEtapa, situacao: SituacaoDoEnvio): string {
	switch (situacao.tipo) {
		case "enviando":
			return ENVIANDO[etapa];
		case "recebida":
			return RECEBIDA[etapa];
		case "encerrado":
			return ENCERRADO_NO_ENVIO;
		case "recusado":
			return RECUSADO;
		case "fora-do-ar":
			return FORA_DO_AR;
		case "sem-conexao":
			return SEM_CONEXAO;
		case "limite": {
			const { segundos } = situacao;
			const quando =
				segundos === undefined
					? "um minuto"
					: segundos === 1
						? "1 segundo"
						: `${segundos} segundos`;
			return `Muitos envios neste minuto. O site tenta de novo em ${quando}.`;
		}
	}
}

/**
 * A linha do envio de uma etapa, embaixo do título, como a da folha da
 * newsletter: "Enviando…" na letra pequena, a resposta numa frase e o erro em
 * negrito. O leitor de tela ouve cada mudança pelo aviso do palco, e o foco não
 * sai de onde está. Sem resposta da API, o "Tentar de novo" manda na hora.
 * Depois da falha, ele fica no lugar, desligado, enquanto um pedido espera, o
 * do botão ou o que o site manda sozinho: não pisca a cada tentativa nem perde
 * o foco. Quando ele sai com o foco, o foco passa para a frase, logo acima.
 */
function LinhaDoEnvio({
	etapa,
	situacao,
	avisar,
}: {
	etapa: NomeDaEtapa;
	situacao: SituacaoDoEnvio;
	avisar: (texto: string) => void;
}) {
	const texto = textoDoEnvio(etapa, situacao);
	const frase = useRef<HTMLParagraphElement>(null);
	const enviando = situacao.tipo === "enviando";
	const semResposta =
		situacao.tipo === "fora-do-ar" || situacao.tipo === "sem-conexao";
	// Se o pedido que espera agora vem depois de uma falha. A resposta da API e
	// o limite, que não tem "Tentar de novo", apagam a falha.
	const [depoisDaFalha, setDepoisDaFalha] = useState(false);
	if (semResposta && !depoisDaFalha) {
		setDepoisDaFalha(true);
	} else if (!semResposta && !enviando && depoisDaFalha) {
		setDepoisDaFalha(false);
	}

	useEffect(() => {
		avisar(texto);
	}, [avisar, texto]);

	// O botão sai quando a API responde: com o foco nele, o foco vai para a frase.
	const guardarOFoco = useCallback((botao: HTMLButtonElement | null) => {
		if (!botao) {
			return;
		}
		return () => {
			if (document.activeElement === botao) {
				frase.current?.focus();
			}
		};
	}, []);

	return (
		<div className="piloto-envio">
			<p
				ref={frase}
				tabIndex={-1}
				className={
					enviando
						? "rotulo piloto-enviando"
						: situacao.tipo === "recebida"
							? "piloto-linha"
							: "ainda-nao"
				}
			>
				{texto}
			</p>
			{/* Desligado, ele não manda outro pedido: o envio já não sai duas
			    vezes ao mesmo tempo (lib/reenvio-do-piloto.ts). */}
			{(semResposta || (enviando && depoisDaFalha)) && (
				<button
					ref={guardarOFoco}
					type="button"
					aria-disabled={enviando || undefined}
					onClick={semCliqueDuplo(tentarDeNovo)}
					className="acao-de-texto"
				>
					Tentar de novo
				</button>
			)}
		</div>
	);
}

/** Os textos do botão da abertura. O lugar dele guarda a altura do mais alto. */
const TEXTOS_DO_BOTAO = ["Começar", "Continuar", "Ir para a trilha"] as const;

/** As três etapas, na ordem: o antes, a trilha e o depois, no quiz final. */
const PASSOS = ["Antes da trilha", "Os seis artigos", "O quiz final"] as const;

const AGORA = "Você está aqui";
const FEITO = "Feito";

/**
 * O estado de cada passo, em palavras. Sem a API e com o piloto encerrado, os
 * passos só explicam o piloto, sem estado.
 */
function estadosDosPassos(
	piloto: Piloto,
	comApi: boolean,
): readonly (string | undefined)[] {
	if (!comApi || piloto.fase === "encerrado") {
		return [];
	}
	if (
		piloto.fase === "concluido" ||
		(piloto.fase === "participando" && etapaFeita(piloto.depois))
	) {
		return [FEITO, FEITO, FEITO];
	}
	if (piloto.fase === "participando" && etapaFeita(piloto.antes)) {
		return [FEITO, AGORA];
	}
	return [AGORA];
}

/**
 * Os três passos do piloto, numa lista entre fios, como a das folhas da trilha
 * (components/folhas-da-trilha.tsx): o número pequeno na fita da posição, o
 * nome em maiúsculas e o estado em palavras. O feito leva o visto no número, e
 * o da vez, o fio grosso de tinta do lado. A linha do estado guarda a altura
 * da frase, e nada muda de altura quando ela chega, depois que o JavaScript
 * carrega.
 */
function Passos({ estados }: { estados: readonly (string | undefined)[] }) {
	return (
		<ol role="list" aria-label="Etapas do piloto" className="piloto-passos">
			{PASSOS.map((nome, indice) => (
				<li
					key={nome}
					className={classes(
						classeDaFita(indice + 1),
						estados[indice] === AGORA && "aqui",
					)}
				>
					<span aria-hidden="true" className="numeral">
						{indice + 1}
						{estados[indice] === FEITO && (
							<MarcaDeLido className="visto-no-numero" />
						)}
					</span>
					<span className="titulo">{nome}</span>
					<strong className="detalhe grid">
						<Reservas frases={[AGORA, FEITO]} />
						<span className="col-start-1 row-start-1">
							{estados[indice] ?? ""}
						</span>
					</strong>
				</li>
			))}
		</ol>
	);
}

/**
 * A página do piloto, /piloto: a primeira etapa, antes da trilha. É o palco do
 * quiz, com as perguntas do quiz final sem a resposta certa, a abertura com os
 * passos e as notas, e o fim que chama para a trilha. Uma pessoa que senta
 * depois de outra no mesmo computador pode começar do zero.
 */
export function PaginaDoPiloto({
	pagina,
	comApi,
}: {
	/** O quiz final da trilha do piloto, com as perguntas e a certa de cada uma. */
	pagina: QuizNaPagina;
	/** Se o site tem o endereço da API (o API_URL do build). */
	comApi: boolean;
}) {
	const piloto = usePiloto();
	const envio = useEnvioDoPiloto(comApi);
	// Se a pessoa acabou de apagar tudo: o "Pronto" fica no lugar do botão.
	const [zerou, setZerou] = useState(false);
	const pronto = useRef<HTMLSpanElement>(null);
	const { trilha } = pagina;
	const encerrado = piloto.fase === "encerrado";
	const envioDoAntes = comApi
		? situacaoDoEnvio("antes", piloto, envio)
		: undefined;
	// Na abertura, o envio do antes aparece enquanto ele não sai e, nesta visita,
	// com a resposta da API. O piloto encerrado tem a frase própria.
	const envioNaAbertura =
		piloto.fase === "participando" &&
		(piloto.antes.situacao === "pendente" ||
			envio.desfechos.antes !== undefined);
	const respondeOAntes =
		comApi &&
		(piloto.fase === "fora" ||
			(piloto.fase === "participando" && !etapaFeita(piloto.antes)));
	const estado = !comApi
		? SEM_API
		: piloto.fase === "concluido"
			? CONCLUIDO
			: encerrado
				? ENCERRADO
				: undefined;

	// O foco vai para o "Pronto", que toma o lugar do botão que sumiu.
	useEffect(() => {
		if (zerou) {
			pronto.current?.focus();
		}
	}, [zerou]);

	function abertura({ comecar, respondidas, hidratado, avisar }: PartesDoQuiz) {
		// Fora do piloto, o "Começar" sorteia o código; com o antes começado,
		// ele só continua.
		function comecarOAntes() {
			setZerou(false);
			comecarPiloto();
			comecar();
		}

		// O envio desta visita é da pessoa anterior: um pedido dela que ainda
		// espera a API não segura o da próxima.
		function zerar() {
			comecarComoOutraPessoa();
			esquecerEnvio();
			setZerou(true);
			avisar(PRONTO);
		}

		return (
			<>
				<p className="abertura">{ABERTURA}</p>
				<p className="faixa rotulo">
					<span>12 perguntas</span>
					<span>Duas etapas</span>
					<span>Sem nome e sem e-mail</span>
				</p>
				<Passos estados={estadosDosPassos(piloto, comApi)} />
				<div className="piloto-notas">
					{NOTAS.map((nota) => (
						<p key={nota}>{nota}</p>
					))}
				</div>
				{estado ? (
					<p className={estado === CONCLUIDO ? "piloto-situacao" : "ainda-nao"}>
						{estado}
					</p>
				) : (
					envioNaAbertura &&
					envioDoAntes && (
						<LinhaDoEnvio
							etapa="antes"
							situacao={envioDoAntes}
							avisar={avisar}
						/>
					)
				)}
				{/* O botão só aparece depois que o JavaScript carrega: o servidor
				    não sabe em que etapa a pessoa está. O lugar dele guarda a
				    altura do texto mais alto que ele pode ter. */}
				<LugarDoBotao textos={TEXTOS_DO_BOTAO} className="quiz-comeco">
					{hidratado &&
						(respondeOAntes ? (
							<button
								type="button"
								onClick={semCliqueDuplo(comecarOAntes)}
								className={BOTAO_CONTINUAR}
							>
								{piloto.fase === "participando" && respondidas > 0
									? "Continuar"
									: "Começar"}{" "}
								<ArrowRight
									aria-hidden="true"
									className={SETA_DO_BOTAO}
									strokeWidth={2.5}
								/>
							</button>
						) : (
							<Link
								to="/trilhas/$trilha"
								params={{ trilha: trilha.slug }}
								className={BOTAO_CONTINUAR}
							>
								Ir para a trilha{" "}
								<ArrowRight
									aria-hidden="true"
									className={SETA_DO_BOTAO}
									strokeWidth={2.5}
								/>
							</Link>
						))}
				</LugarDoBotao>
				<noscript>
					<p className="ainda-nao">
						O piloto precisa do JavaScript do navegador ligado. Sem ele, nada é
						enviado.
					</p>
				</noscript>
				<p className="piloto-outra-pessoa">{OUTRA_PESSOA}</p>
				{/* A linha guarda a altura do botão, que só aparece com JavaScript.
				    Depois do clique, o "Pronto" fica no lugar dele, com o foco. */}
				<p className="recomeco piloto-recomeco">
					{zerou ? (
						<span ref={pronto} tabIndex={-1} className="piloto-pronto">
							{PRONTO}
						</span>
					) : (
						hidratado && (
							<button
								type="button"
								onClick={semCliqueDuplo(zerar)}
								className="acao-de-texto"
							>
								Começar como outra pessoa
							</button>
						)
					)}
				</p>
			</>
		);
	}

	function fim({ comecar, avisar }: PartesDoQuiz) {
		return (
			<div className="quiz-fim">
				{/* Com a letra grande, o título cresce até "TERMINOU" encostar nas
				    margens, no tamanho do fim do quiz (o letra-com-teto do
				    index.css). */}
				<h2
					tabIndex={-1}
					className="titulo-condensado letra-com-teto [--palavra:4.8]"
				>
					Você terminou a primeira etapa.
				</h2>
				{envioDoAntes && (
					<LinhaDoEnvio etapa="antes" situacao={envioDoAntes} avisar={avisar} />
				)}
				<p className="quiz-fim-texto">{FIM_DO_ANTES}</p>
				<p className="quiz-fim-acoes">
					<Link
						to="/trilhas/$trilha/$artigo"
						params={{ trilha: trilha.slug, artigo: trilha.artigos[0].slug }}
						className={BOTAO_CONTINUAR}
					>
						Começar a trilha{" "}
						<ArrowRight
							aria-hidden="true"
							className={SETA_DO_BOTAO}
							strokeWidth={2.5}
						/>
					</Link>
					{/* Com o piloto encerrado, não há mais o que medir: a pessoa pode
					    rever as respostas, com a certa de cada pergunta. */}
					{encerrado && (
						<button
							type="button"
							onClick={semCliqueDuplo(comecar)}
							className={classes(BOTAO_CONTINUAR, "vazado")}
						>
							Rever as respostas{" "}
							<ArrowRight
								aria-hidden="true"
								className={SETA_DO_BOTAO}
								strokeWidth={2.5}
							/>
						</button>
					)}
				</p>
			</div>
		);
	}

	return (
		<Quiz
			{...pagina}
			titulo="Antes da trilha"
			quiz={QUIZ_DO_ANTES}
			etapa={encerrado ? undefined : "antes"}
			aoTerminar={(acertos) => concluirEtapa("antes", acertos)}
			abertura={abertura}
			fim={fim}
			soOPalco
		/>
	);
}

/**
 * O quiz final. Para quem fez o antes neste navegador, ele é o depois: uma
 * linha embaixo do título diz que é a segunda etapa, vale a primeira resposta
 * de cada pergunta, e a última resposta conclui a etapa, que sai para a API.
 * Depois, a linha diz como foi o envio. Com o antes pela metade, a linha manda
 * terminar o antes, e o quiz não mede nada. Para todo o resto, é o quiz de
 * sempre.
 */
export function QuizFinal({
	pagina,
	comApi,
}: {
	pagina: QuizNaPagina;
	/** Se o site tem o endereço da API (o API_URL do build). */
	comApi: boolean;
}) {
	const piloto = usePiloto();
	const doPiloto = comApi && pagina.trilha.slug === TRILHA_DO_PILOTO;
	// Daqui também sai o antes que ainda não foi enviado, antes do depois.
	const envio = useEnvioDoPiloto(doPiloto);
	const participando =
		doPiloto && piloto.fase === "participando" ? piloto : undefined;
	const noDepois =
		participando !== undefined &&
		etapaFeita(participando.antes) &&
		!etapaFeita(participando.depois);
	const antesPelaMetade =
		participando !== undefined && !etapaFeita(participando.antes);
	const envioDoDepois = doPiloto
		? situacaoDoEnvio("depois", piloto, envio)
		: undefined;
	// O envio do depois aparece enquanto ele não sai e, nesta visita, com a
	// resposta da API. O 410 do antes, mandado daqui, também encerra o depois.
	const comEnvio =
		envioDoDepois !== undefined &&
		(participando?.depois.situacao === "pendente" ||
			envio.desfechos.depois !== undefined ||
			envio.desfechos.antes === "encerrado");

	const linha = noDepois ? (
		<p className="piloto-linha">{SEGUNDA_ETAPA}</p>
	) : antesPelaMetade ? (
		<p className="piloto-linha">
			Piloto: termine primeiro a primeira etapa,{" "}
			<Link to="/piloto">na página do piloto</Link>.
		</p>
	) : comEnvio ? (
		({ avisar }: PartesDoQuiz) => (
			<LinhaDoEnvio etapa="depois" situacao={envioDoDepois} avisar={avisar} />
		)
	) : undefined;

	// A chave zera o quiz quando a pessoa passa para o de outra trilha.
	return (
		<Quiz
			key={pagina.trilha.slug}
			{...pagina}
			titulo="Quiz final"
			quiz={idDoQuizFinal(pagina.trilha.slug)}
			etapa={noDepois ? "depois" : undefined}
			aoTerminar={
				noDepois ? (acertos) => concluirEtapa("depois", acertos) : undefined
			}
			linha={linha}
		/>
	);
}
