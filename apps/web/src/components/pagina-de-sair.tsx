import { Link } from "@tanstack/react-router";
import {
	type KeyboardEvent,
	type MouseEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { sementeDe } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import {
	codigoValido,
	pedirSaida,
	type ResultadoDaSaida,
} from "@/lib/newsletter";
import { Aviso, useAviso } from "./aviso";
import { Painel } from "./azulejo";
import { BOTAO_CONTINUAR } from "./botao-continuar";
import { Reservas } from "./reservas";

/** Onde a saída está: antes do botão, esperando a API ou o que ela respondeu. */
type Estado = "pronta" | "esperando" | ResultadoDaSaida["tipo"];

const CONFIRMAR = "Confirmar a saída";
const CONFIRMANDO = "Confirmando a saída…";
const INCOMPLETO =
	"Este link está incompleto. Abra de novo o link de saída que vem no fim de cada e-mail da newsletter.";
const SAIR = "Sair da newsletter";
const SAIU = "Você saiu da newsletter.";
const EXPLICA =
	"Com o botão, o seu e-mail sai da lista e as edições de domingo param de chegar. Antes dele, nada muda.";
const ANTES_DE_EDICOES =
	"O seu e-mail não está mais na lista, e as próximas edições não vão chegar. Elas continuam no site, em ";
const EDICOES = "Edições";
const DEPOIS_DE_EDICOES = ", para ler quando quiser.";
const FORA_DO_AR =
	"Não conseguimos confirmar a saída agora. Espere alguns minutos e tente de novo.";
const SEM_CONEXAO =
	"Não deu para confirmar a saída. Confira a internet e tente de novo.";
const ERROS: Partial<Record<Estado, string>> = {
	"fora-do-ar": FORA_DO_AR,
	"sem-conexao": SEM_CONEXAO,
};

/**
 * Meio segundo, o tempo do clique duplo do Windows. É a guarda do Enter no link
 * que nasce no lugar do botão e o tempo mínimo da espera na tela quando o erro
 * volta na nova tentativa.
 */
const MEIO_SEGUNDO = 500;

function esperar(ms: number) {
	return new Promise<void>((pronto) => setTimeout(pronto, ms));
}

/**
 * O segundo clique de um clique duplo e o terceiro de um clique triplo não
 * seguem os links da página (o detail acima de 1, como no lib/clique.ts):
 * depois da saída, o "Inscrever-se de novo" surge onde estava o botão, e, com o
 * código recusado, o "Ir para o início". Um clique novo, de propósito, segue o
 * link.
 */
function semSegundoClique(evento: MouseEvent) {
	if (evento.detail > 1) {
		evento.preventDefault();
	}
}

/**
 * A página para sair da newsletter, aberta pelo link do fim de cada edição: o
 * cartaz das páginas de dentro, como o da página não encontrada, com o botão
 * que confirma a saída. Só o botão apaga a inscrição: programas de e-mail e
 * antivírus abrem os links sozinhos, e abrir a página não muda nada.
 *
 * O botão fica num formulário com uma função no `action`, do React 19: sem o
 * JavaScript, ele não envia nada, e o noscript explica. A função não espera a
 * API: ela dispara o pedido, e a página mostra o "Confirmando" enquanto espera
 * (como na inscrição, components/inscricao-na-newsletter.tsx). Depois da saída,
 * o "Inscrever-se de novo" fica no lugar do botão, com o foco, e nada sai do
 * lugar: o título e o pé guardam a altura de antes. Com o código recusado, quem
 * fica no lugar do botão é o "Ir para o início". O erro fica no lugar da frase
 * de abertura, e a linha da espera tem o lugar dela: entre o clique e a
 * resposta, o botão também não sai de baixo do ponteiro.
 */
export function PaginaDeSair({
	codigo,
	comApi,
}: {
	/** O código de saída, do link do e-mail. */
	codigo: string | undefined;
	/** Se o site tem o endereço da API (o API_URL do build). */
	comApi: boolean;
}) {
	const [estado, setEstado] = useState<Estado>("pronta");
	const { aviso, avisar } = useAviso();
	const enviando = useRef(false);
	const deNovo = useRef<HTMLAnchorElement>(null);
	const edicoes = useRef<HTMLAnchorElement>(null);
	const inicio = useRef<HTMLAnchorElement>(null);
	// O link que nasceu no lugar do botão, no primeiro meio segundo (semPressa e
	// semEnterApressado).
	const recemNascido = useRef(false);

	const saiu = estado === "saiu";
	const incompleto = estado === "link-invalido" || !codigoValido(codigo);
	const comBotao = comApi && !incompleto && !saiu;
	const esperando = estado === "esperando";
	// Só com a API e o código bem formado a saída pode acontecer e a tela mudar:
	// só aí o título, a abertura e o lugar do botão guardam a altura de antes.
	const telaPodeMudar = comApi && codigoValido(codigo);
	// Com o código recusado, o "Ir para o início" é a ação que sobra e sobe para
	// o lugar do botão. Só com o lugar guardado: sem ele, fica no item dele.
	const recusado = telaPodeMudar && estado === "link-invalido";

	// O botão some depois da saída e do código recusado: o foco vai para o link
	// que fica no lugar dele, o "Inscrever-se de novo" ou o "Ir para o início".
	// O meio segundo da guarda do Enter conta daqui, da troca.
	useEffect(() => {
		if (estado !== "saiu" && estado !== "link-invalido") {
			return;
		}
		(estado === "saiu" ? deNovo : inicio).current?.focus();
		recemNascido.current = true;
		const relogio = setTimeout(() => {
			recemNascido.current = false;
		}, MEIO_SEGUNDO);
		return () => clearTimeout(relogio);
	}, [estado]);

	/**
	 * No primeiro meio segundo depois da troca, semPressa bloqueia o clique com
	 * detail 0 que chega ao link novo sem keydown. No Chromium e no Firefox,
	 * semEnterApressado segura o segundo Enter no keydown, antes que ele gere um
	 * clique. No Firefox, o clique do Enter num link vem com detail 1, como o
	 * do mouse. Quem sai do link e volta depois desse meio segundo segue com o
	 * Enter.
	 */
	function semPressa(evento: MouseEvent) {
		if (evento.detail > 1 || (evento.detail === 0 && recemNascido.current)) {
			evento.preventDefault();
		}
	}

	/**
	 * A guarda do teclado no link que nasce no lugar do botão: o Enter no
	 * primeiro meio segundo depois da troca (no Firefox, o clique do Enter vem
	 * com o detail 1, e a guarda do clique, em semPressa, não o reconhece) e a
	 * repetição do Enter segurado. No Firefox, cada repetição ativa o link (no
	 * Chromium, não), e quem segurava o Enter no botão saía da página assim que
	 * o meio segundo acabava. Depois do meio segundo, um Enter novo segue o link.
	 */
	function semEnterApressado(evento: KeyboardEvent) {
		if (evento.key === "Enter" && (evento.repeat || recemNascido.current)) {
			evento.preventDefault();
		}
	}

	// A abertura vem antes das ações no HTML. Depois da saída, encaixe o
	// "Edições" entre elas no Tab, com a saída do grupo pela ordem nativa.
	function percorrerLinksDaSaida(evento: KeyboardEvent<HTMLAnchorElement>) {
		if (
			evento.key !== "Tab" ||
			evento.altKey ||
			evento.ctrlKey ||
			evento.metaKey
		) {
			return;
		}
		const { currentTarget, shiftKey } = evento;
		const destino =
			currentTarget === edicoes.current
				? shiftKey
					? deNovo.current
					: inicio.current
				: currentTarget === (shiftKey ? inicio.current : deNovo.current)
					? edicoes.current
					: null;
		if (destino) {
			evento.preventDefault();
			destino.focus();
		}
	}

	function confirmar() {
		if (enviando.current || !codigoValido(codigo)) {
			return;
		}
		void enviar(codigo);
	}

	async function enviar(codigoDaSaida: string) {
		// Na nova tentativa depois de um erro, um erro pode voltar na hora (a rede
		// caída): a página voltava a ele no mesmo quadro, e nada mostrava que a
		// tentativa aconteceu. A espera fica pelo menos meio segundo na tela, com
		// a explicação, a linha da espera e o aviso, que lê o erro de novo.
		const espera = ERROS[estado] ? esperar(MEIO_SEGUNDO) : undefined;
		enviando.current = true;
		setEstado("esperando");
		// O aviso muda a cada envio: a mesma resposta, de novo, é lida de novo.
		avisar(CONFIRMANDO);
		const resultado = await pedirSaida(codigoDaSaida).catch(
			(): ResultadoDaSaida => ({ tipo: "sem-conexao" }),
		);
		if (espera && ERROS[resultado.tipo]) {
			await espera;
		}
		enviando.current = false;
		setEstado(resultado.tipo);
		avisar(
			resultado.tipo === "saiu"
				? `${SAIU} ${ANTES_DE_EDICOES}${EDICOES}${DEPOIS_DE_EDICOES}`
				: resultado.tipo === "link-invalido"
					? INCOMPLETO
					: (ERROS[resultado.tipo] ?? ""),
		);
	}

	const abertura = !comApi
		? "A newsletter ainda não funciona neste endereço do site."
		: incompleto
			? INCOMPLETO
			: EXPLICA;
	const erro = ERROS[estado];
	const irParaOInicio = (
		<Link
			ref={inicio}
			to="/"
			onClick={recusado ? semPressa : semSegundoClique}
			onKeyDown={
				recusado ? semEnterApressado : saiu ? percorrerLinksDaSaida : undefined
			}
			className="acao-de-texto"
		>
			<span>Ir para o início</span>
		</Link>
	);

	return (
		<section className="cartaz cartaz-medio">
			<Painel
				semente={sementeDe("sair")}
				colunas={4}
				quantas={64}
				className="mural"
				sozinho
			/>
			{/* Com a letra grande, o título cresce até "NEWSLETTER." encostar nas
			    margens (o letra-com-teto do index.css). Enquanto pode mudar, ele
			    guarda a altura do mais alto dos dois: a 768 px, "Sair da
			    newsletter" cabe numa linha, e "Você saiu da newsletter." quebra em
			    duas. Assim, as ações não descem com a saída, e o "Inscrever-se de
			    novo" nasce no lugar do botão. O título da vez fica embaixo, apoiado
			    no fio, como em todo cartaz. */}
			<h1 className="titulo-condensado letra-com-teto grid [--palavra:5.25]">
				{telaPodeMudar && <Reservas frases={[SAIR, SAIU]} />}
				<span className="col-start-1 row-start-1 self-end">
					{saiu ? SAIU : SAIR}
				</span>
			</h1>
			{/* O pé guarda a altura de antes da saída. A abertura reserva o lugar
			    da frase mais alta, e a da vez fica no alto, junto do fio. O lugar
			    do botão guarda uma cópia dele, para o "Inscrever-se de novo"
			    nascer no meio dele. Com o código recusado, o "Ir para o início"
			    sobe para o lugar do botão, e o vão fica no fim do pé, no item dele.
			    A grade da abertura fica num div em volta do parágrafo: o Chromium
			    tira da árvore de acessibilidade um <p> em grade, e quem anda pelos
			    parágrafos pulava a frase. As guardadas quebram as linhas como ela,
			    com o text-pretty que o <p> já tem.
			    O erro fica no lugar da frase, em negrito, e a abertura guarda os
			    dois, com o desenho deles: embaixo das ações, com duas colunas, ele
			    empurrava o botão até 65 px para cima, e o "Ir para o início" ficava
			    embaixo do ponteiro. Com as frases na mesma célula, o erro entra
			    sem mexer em nada. */}
			<div className="cartaz-pe">
				<div className="abertura grid text-pretty">
					{telaPodeMudar && (
						<>
							<Reservas frases={[EXPLICA]} />
							<span
								aria-hidden="true"
								className="invisible col-start-1 row-start-1"
							>
								{ANTES_DE_EDICOES}
								{/* biome-ignore lint/a11y/useValidAnchor: a cópia invisível do link só guarda a altura da frase. */}
								<a>{EDICOES}</a>
								{DEPOIS_DE_EDICOES}
							</span>
							<Reservas
								frases={[FORA_DO_AR, SEM_CONEXAO]}
								className="ainda-nao"
							/>
						</>
					)}
					<p
						className={classes("col-start-1 row-start-1", erro && "ainda-nao")}
					>
						{saiu ? (
							<>
								{ANTES_DE_EDICOES}
								<Link
									ref={edicoes}
									to="/edicoes"
									tabIndex={-1}
									onClick={semSegundoClique}
									onKeyDown={percorrerLinksDaSaida}
								>
									{EDICOES}
								</Link>
								{DEPOIS_DE_EDICOES}
							</>
						) : (
							(erro ?? abertura)
						)}
					</p>
				</div>
				<div className="cartaz-acao">
					<ul className="acoes-da-pagina">
						{telaPodeMudar && (
							<li className="grid items-center justify-items-start">
								{/* A cópia do botão, com o mesmo desenho, invisível e fora
								    do leitor de tela: quando ele some, o lugar continua
								    com o tamanho dele. */}
								<span
									aria-hidden="true"
									className="invisible col-start-1 row-start-1"
								>
									<span className={BOTAO_CONTINUAR}>{CONFIRMAR}</span>
								</span>
								{comBotao && (
									<form action={confirmar} className="col-start-1 row-start-1">
										<button
											type="submit"
											aria-disabled={esperando || undefined}
											onClick={(evento) => {
												if (enviando.current) {
													evento.preventDefault();
												}
											}}
											className={BOTAO_CONTINUAR}
										>
											{CONFIRMAR}
										</button>
									</form>
								)}
								{/* No meio do lugar do botão, na mesma altura do "Ir
								    para o início" quando os dois ficam lado a lado. */}
								{saiu && (
									<div className="col-start-1 row-start-1">
										<Link
											ref={deNovo}
											to="/"
											hash="newsletter"
											onClick={semPressa}
											onKeyDown={(evento) => {
												semEnterApressado(evento);
												percorrerLinksDaSaida(evento);
											}}
											className="acao-de-texto"
										>
											<span>Inscrever-se de novo</span>
										</Link>
									</div>
								)}
								{recusado && (
									<div className="col-start-1 row-start-1">{irParaOInicio}</div>
								)}
							</li>
						)}
						{recusado ? (
							// O item do "Ir para o início" guarda a altura dele com
							// uma cópia, invisível e fora do leitor de tela. A cópia é
							// o mesmo link, sem o endereço, e segue as regras dele: na
							// #152, quando o Firefox ainda quebrava o link em duas
							// linhas, um span, fora da regra do a.acao-de-texto, ficava
							// numa, com o pé mais baixo. Sem o href, ela não é link,
							// não recebe o foco, e o invisible a tira do ponteiro.
							<li aria-hidden="true" className="invisible">
								{/* biome-ignore lint/a11y/useValidAnchor: a cópia invisível do link só guarda a altura dele, fora do leitor de tela, do teclado e do ponteiro. */}
								<a className="acao-de-texto">
									<span>Ir para o início</span>
								</a>
							</li>
						) : (
							<li>{irParaOInicio}</li>
						)}
					</ul>
					{comBotao && (
						<noscript>
							<p className="ainda-nao">
								Para confirmar a saída, o navegador precisa do JavaScript
								ligado. Sem ele, use a opção de cancelar a inscrição do seu
								programa de e-mail.
							</p>
						</noscript>
					)}
					{/* A linha da espera tem o lugar guardado no fim das ações, desde o
					    HTML do servidor, enquanto a tela pode mudar: ela não empurra
					    nada quando aparece nem deixa buraco quando sai. Fica depois
					    do noscript: sem o JavaScript, o vão é o fim do pé. */}
					{telaPodeMudar && (
						<div className="rotulo saida-confirmando grid">
							<Reservas frases={[CONFIRMANDO]} />
							{esperando && (
								<p className="col-start-1 row-start-1">{CONFIRMANDO}</p>
							)}
						</div>
					)}
				</div>
			</div>
			<Aviso texto={aviso} />
		</section>
	);
}
