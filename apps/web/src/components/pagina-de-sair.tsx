import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { sementeDe } from "@/lib/azulejos";
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

const CONFIRMANDO = "Confirmando a saída…";
const INCOMPLETO =
	"Este link está incompleto. Abra de novo o link de saída que vem no fim de cada e-mail da newsletter.";
const SAIR = "Sair da newsletter";
const SAIU = "Você saiu da newsletter.";
const FORA_DA_LISTA =
	"O seu e-mail não está mais na lista, e as próximas edições não vão chegar.";
const ERROS: Partial<Record<Estado, string>> = {
	"fora-do-ar":
		"Não conseguimos confirmar a saída agora. Espere alguns minutos e tente de novo.",
	"sem-conexao":
		"Não deu para confirmar a saída. Confira a internet e tente de novo.",
};

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
 * o "Inscrever-se de novo" fica no lugar do botão, com o foco.
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
	const inicio = useRef<HTMLAnchorElement>(null);

	const saiu = estado === "saiu";
	const incompleto = estado === "link-invalido" || !codigoValido(codigo);
	const comBotao = comApi && !incompleto && !saiu;
	const esperando = estado === "esperando";
	// Só com a API e o código bem formado a saída pode acontecer e o título mudar.
	const tituloPodeMudar = comApi && codigoValido(codigo);

	// O botão some depois da saída e do código recusado: o foco vai para o que
	// fica no lugar dele.
	useEffect(() => {
		if (estado === "saiu") {
			deNovo.current?.focus();
		} else if (estado === "link-invalido") {
			inicio.current?.focus();
		}
	}, [estado]);

	function confirmar() {
		if (enviando.current || !codigoValido(codigo)) {
			return;
		}
		void enviar(codigo);
	}

	async function enviar(codigoDaSaida: string) {
		enviando.current = true;
		setEstado("esperando");
		// O aviso muda a cada envio: a mesma resposta, de novo, é lida de novo.
		avisar(CONFIRMANDO);
		const resultado = await pedirSaida(codigoDaSaida).catch(
			(): ResultadoDaSaida => ({ tipo: "sem-conexao" }),
		);
		enviando.current = false;
		setEstado(resultado.tipo);
		avisar(
			resultado.tipo === "saiu"
				? `${SAIU} ${FORA_DA_LISTA}`
				: resultado.tipo === "link-invalido"
					? INCOMPLETO
					: (ERROS[resultado.tipo] ?? ""),
		);
	}

	const abertura = !comApi
		? "A newsletter ainda não funciona neste endereço do site."
		: saiu
			? FORA_DA_LISTA
			: incompleto
				? INCOMPLETO
				: "Com o botão, o seu e-mail sai da lista e as edições de domingo param de chegar. Antes dele, nada muda.";
	const erro = ERROS[estado];

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
				{tituloPodeMudar && <Reservas frases={[SAIR, SAIU]} />}
				<span className="col-start-1 row-start-1 self-end">
					{saiu ? SAIU : SAIR}
				</span>
			</h1>
			<div className="cartaz-pe">
				<p className="abertura">{abertura}</p>
				<div className="cartaz-acao">
					<ul className="acoes-da-pagina">
						{comBotao && (
							<li>
								<form action={confirmar}>
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
										Confirmar a saída
									</button>
								</form>
							</li>
						)}
						{saiu && (
							<li>
								{/* Ele surge onde estava o botão: o segundo clique de um
								    clique duplo não o segue (o detail, como no
								    lib/clique.ts). */}
								<Link
									ref={deNovo}
									to="/"
									hash="newsletter"
									onClick={(evento) => {
										if (evento.detail > 1) {
											evento.preventDefault();
										}
									}}
									className="acao-de-texto"
								>
									<span>Inscrever-se de novo</span>
								</Link>
							</li>
						)}
						<li>
							<Link ref={inicio} to="/" className="acao-de-texto">
								<span>Ir para o início</span>
							</Link>
						</li>
					</ul>
					{esperando && (
						<p className="rotulo saida-confirmando">{CONFIRMANDO}</p>
					)}
					{erro && <p className="ainda-nao">{erro}</p>}
					{comBotao && (
						<noscript>
							<p className="ainda-nao">
								Para confirmar a saída, o navegador precisa do JavaScript
								ligado. Sem ele, use a opção de cancelar a inscrição do seu
								programa de e-mail.
							</p>
						</noscript>
					)}
				</div>
			</div>
			<Aviso texto={aviso} />
		</section>
	);
}
