import { ArrowRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { azulejoGrande } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { plural } from "@/lib/formatar";
import {
	emailValido,
	pedirInscricao,
	type ResultadoDaInscricao,
	type Situacao,
} from "@/lib/newsletter";
import { Aviso, useAviso } from "./aviso";
import { AzulejoGrande } from "./azulejo";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "./botao-continuar";

/**
 * O que a folha diz depois do envio. O erro do e-mail fica no campo, com o fio
 * vermelho; o do serviço, embaixo do botão, em palavras e sem cor. Cada mensagem
 * é um objeto novo: a mesma mensagem, de novo, ainda leva o foco ao campo.
 */
type Mensagem = { tipo: "feita" | "do-campo" | "do-servico"; texto: string };

const ENVIANDO = "Enviando a inscrição…";
const CONFIRA = "Confira o e-mail: falta alguma parte, como o @ ou o domínio.";

const INSCRITA: Record<Situacao, string> = {
	edicao_enviada:
		"Inscrição realizada. Enviamos para o seu e-mail a última edição publicada.",
	aguardando_edicao:
		"Inscrição realizada. A primeira edição ainda não saiu: ela chega no seu e-mail quando for publicada.",
	envio_indisponivel:
		"Inscrição realizada. Não conseguimos confirmar o envio da última edição agora. Se ela não chegar, tente de novo mais tarde.",
};

/** O que falta no e-mail antes de chamar a API, ou nada. */
function faltaNoEmail(texto: string): Mensagem | undefined {
	if (!texto.trim()) {
		return {
			tipo: "do-campo",
			texto: "Escreva o seu e-mail para receber a newsletter.",
		};
	}
	return emailValido(texto) ? undefined : { tipo: "do-campo", texto: CONFIRA };
}

function mensagemDoEnvio(resultado: ResultadoDaInscricao): Mensagem {
	switch (resultado.tipo) {
		case "inscrita":
			return { tipo: "feita", texto: INSCRITA[resultado.situacao] };
		case "email-invalido":
			return { tipo: "do-campo", texto: CONFIRA };
		case "limite": {
			const espera = resultado.segundos
				? plural(resultado.segundos, "segundo", "segundos")
				: "um minuto";
			return {
				tipo: "do-servico",
				texto: `Muitas inscrições neste minuto. Espere ${espera} e tente de novo.`,
			};
		}
		case "fora-do-ar":
			return {
				tipo: "do-servico",
				texto:
					"Não conseguimos registrar a inscrição agora. Espere alguns minutos e tente de novo.",
			};
		case "sem-conexao":
			return {
				tipo: "do-servico",
				texto:
					"Não deu para enviar a inscrição. Confira a internet e tente de novo.",
			};
	}
}

/**
 * A inscrição na newsletter, no fim da página inicial: uma folha com o título, o
 * que é o jornal legislativo, o campo do e-mail, o botão e seis azulejos. A
 * inscrição pede só o e-mail, e quem se inscreve recebe a última edição.
 *
 * O formulário leva uma função no `action`, do React 19: no HTML do servidor, o
 * React troca a função por um `javascript:` que não envia nada, e guarda o envio
 * feito antes de o JavaScript carregar, para refazer depois. Sem o JavaScript,
 * nada sai, e o noscript explica. O e-mail vai só no corpo do POST
 * (lib/newsletter.ts): nunca na URL, no armazenamento do navegador ou no console.
 * O campo esvazia só quando a inscrição dá certo.
 *
 * A função do `action` não espera a API: ela confere o e-mail e dispara o pedido.
 * Uma função que esperasse prenderia à espera dela as outras transições da
 * página, como a troca de página do roteador (o React 19 junta as ações
 * pendentes). Enquanto o pedido espera, o botão fica com o desenho do desligado,
 * sem perder o foco (o aria-disabled, e não o disabled), e o campo fica só de
 * leitura.
 */
export function InscricaoNaNewsletter({ className }: { className?: string }) {
	const [email, setEmail] = useState("");
	const [mensagem, setMensagem] = useState<Mensagem>();
	const [esperando, setEsperando] = useState(false);
	const { aviso, avisar } = useAviso();
	const campo = useRef<HTMLInputElement>(null);
	// Um envio de cada vez: o segundo clique e o Enter, enquanto o primeiro
	// espera a API, não mandam outro pedido.
	const enviando = useRef(false);
	const id = useId();
	const idDoCampo = `${id}-email`;
	const idDaMensagem = `${id}-mensagem`;
	const erroNoCampo = !esperando && mensagem?.tipo === "do-campo";

	// Num erro do e-mail, o foco vai para o campo, já com a mensagem ligada a ele.
	useEffect(() => {
		if (mensagem?.tipo === "do-campo") {
			campo.current?.focus();
		}
	}, [mensagem]);

	function mostrar(nova: Mensagem) {
		setMensagem(nova);
		avisar(nova.texto);
	}

	function inscrever(dados: FormData) {
		if (enviando.current) {
			return;
		}
		const texto = String(dados.get("email") ?? "");
		const falta = faltaNoEmail(texto);
		if (falta) {
			mostrar(falta);
			return;
		}
		void enviar(texto);
	}

	async function enviar(texto: string) {
		enviando.current = true;
		setEsperando(true);
		// O aviso muda a cada envio: a mesma resposta, de novo, é lida de novo.
		avisar(ENVIANDO);
		const resultado = await pedirInscricao(texto).catch(
			(): ResultadoDaInscricao => ({ tipo: "sem-conexao" }),
		);
		enviando.current = false;
		setEsperando(false);
		if (resultado.tipo === "inscrita") {
			setEmail("");
		}
		mostrar(mensagemDoEnvio(resultado));
	}

	return (
		<section
			aria-labelledby="newsletter"
			className={classes("newsletter-folha", className)}
		>
			<div className="newsletter-texto">
				<h2
					id="newsletter"
					className="titulo-condensado letra-com-teto [--palavra:4.94]"
				>
					O jornal legislativo
				</h2>
				<p className="faixa rotulo">
					<span>Todo domingo</span>
					<span>Câmara e Senado</span>
					<span>Link oficial em cada item</span>
				</p>
				<p className="newsletter-abertura">
					O que o Congresso votou na semana, explicado em linguagem simples.
					Quem se inscreve recebe na hora a última edição publicada.
				</p>
				<form action={inscrever} noValidate className="newsletter-formulario">
					<label htmlFor={idDoCampo} className="rotulo">
						Seu e-mail
					</label>
					<div className="newsletter-linha">
						<input
							ref={campo}
							id={idDoCampo}
							type="email"
							name="email"
							autoComplete="email"
							spellCheck={false}
							value={email}
							onChange={(evento) => setEmail(evento.target.value)}
							readOnly={esperando}
							aria-invalid={erroNoCampo || undefined}
							aria-describedby={erroNoCampo ? idDaMensagem : undefined}
							className="campo"
						/>
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
							Receber a newsletter{" "}
							<ArrowRight
								aria-hidden="true"
								className={SETA_DO_BOTAO}
								strokeWidth={2.5}
							/>
						</button>
					</div>
					{esperando ? (
						<p className="rotulo newsletter-enviando">{ENVIANDO}</p>
					) : (
						mensagem && (
							<p
								id={idDaMensagem}
								className={classes(
									"newsletter-mensagem",
									mensagem.tipo === "do-campo" && "falta-no-campo",
									mensagem.tipo === "do-servico" && "ainda-nao",
								)}
							>
								{mensagem.texto}
							</p>
						)
					)}
				</form>
				<noscript>
					<p className="ainda-nao">
						A inscrição precisa do JavaScript do navegador ligado.
					</p>
				</noscript>
				<p className="newsletter-nota">
					O e-mail serve só para mandar a newsletter. Para sair, use o link no
					fim de cada edição.
				</p>
			</div>
			<span aria-hidden="true" className="chamada-azulejos">
				{Array.from({ length: 6 }, (_, posicao) => (
					<AzulejoGrande
						// biome-ignore lint/suspicious/noArrayIndexKey: seis azulejos fixos, na ordem das fitas.
						key={posicao}
						pecas={azulejoGrande(posicao + 2, posicao)}
					/>
				))}
			</span>
			<Aviso texto={aviso} />
		</section>
	);
}
