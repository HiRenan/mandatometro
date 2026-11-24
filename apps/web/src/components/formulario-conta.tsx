import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
	type FormEvent,
	type InputHTMLAttributes,
	type SelectHTMLAttributes,
	useEffect,
	useRef,
	useState,
} from "react";
import { flushSync } from "react-dom";
import {
	type Cadastro,
	cadastrarConta,
	confirmarConta,
	entrarConta,
	excluirConta,
	recuperarConta,
	redefinirSenha,
	reenviarConfirmacao,
	type Termo,
	termoConta,
} from "@/client";
import { AcaoDeTexto } from "@/components/acao-de-texto";
import { ENV } from "@/env";
import { classes } from "@/lib/classes";
import { semSegundoClique } from "@/lib/clique";
import { pedirInscricao } from "@/lib/newsletter";
import {
	anotarEntradaNaConta,
	encerrarProgressoNaConta,
} from "@/lib/progresso";
import { VERSAO_DO_TERMO } from "@/lib/termo";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "./botao-continuar";
import { CartazDaConta } from "./cartaz-da-conta";
import { Reservas } from "./reservas";

/** O título de cada tela, que também dá o nome do botão e o título da aba. */
export const titulos = {
	login: "Entrar",
	cadastro: "Criar conta",
	confirmar: "Confirmar e-mail",
	recuperar: "Recuperar senha",
	redefinir: "Definir nova senha",
	reenvio: "Reenviar confirmação",
	excluir: "Excluir conta",
};
type Modo = keyof typeof titulos;
type ModoQueConclui = Exclude<Modo, "login">;

/** O título depois da conclusão. O login não conclui: vai para o perfil. */
const titulosDaConclusao: Record<ModoQueConclui, string> = {
	cadastro: "Confira o e-mail",
	confirmar: "E-mail confirmado",
	reenvio: "Confira o e-mail",
	recuperar: "Confira o e-mail",
	redefinir: "Senha alterada",
	excluir: "Conta excluída",
};

/** A frase embaixo do título, no lado do pé. */
const aberturas: Record<Modo, string> = {
	login:
		"A sua conta guarda os artigos que você leu. Comece uma trilha no celular e continue no computador, de onde parou.",
	cadastro:
		"A conta é opcional. Com ela, os artigos que você leu ficam guardados.",
	confirmar: "Falta um passo: confirme o seu e-mail para ativar a conta.",
	reenvio:
		"Escreva o e-mail do cadastro para receber outro link de confirmação.",
	recuperar:
		"Escreva o e-mail da conta para receber um link e criar uma senha nova.",
	redefinir: "Escolha a senha nova. Depois, entre de novo em cada aparelho.",
	excluir:
		"A exclusão é permanente. Sua conta e o progresso associado serão apagados. Sua inscrição na newsletter é independente.",
};

const avisoDeSpam =
	"Se o e-mail não aparecer, procure também no spam ou no lixo eletrônico.";
const conclusoes: Record<ModoQueConclui, string> = {
	cadastro: `Confira sua caixa de entrada para confirmar o cadastro. ${avisoDeSpam}`,
	confirmar: "Seu e-mail foi confirmado.",
	recuperar: `Se houver uma conta confirmada, você receberá um link para redefinir a senha. ${avisoDeSpam}`,
	redefinir: "Sua senha foi alterada. Entre novamente para continuar.",
	reenvio: `Se houver um cadastro pendente, você receberá outro link. ${avisoDeSpam}`,
	excluir: `Sua conta foi excluída. O comprovante será enviado por e-mail. ${avisoDeSpam}`,
};

const AGUARDE = "Aguarde…";
const VERIFICANDO = "Verificando sua sessão…";
const SEM_API = "A conta ainda não funciona neste endereço do site.";
const SEM_SCRIPT = "A conta precisa do JavaScript do navegador ligado.";
const CADASTRO_FECHADO = "O cadastro está indisponível no momento.";
const MUITAS_TENTATIVAS = "Muitas tentativas. Aguarde um minuto.";
const LOGIN_RECUSADO = "Confira o e-mail, a senha e a confirmação do cadastro.";
const SENHA_RECUSADA = "Entre novamente e confira sua senha.";
const LINK_VENCIDO = "O link expirou ou é inválido. Solicite outro abaixo.";
const TEXTO_DO_ACEITE = "Tenho 12 anos ou mais e li e aceito";
const TERMO_DO_ACEITE = "o termo de consentimento";
const TERMO_MUDOU =
	"O termo mudou. Recarregue a página para ler a versão atual.";
const NAO_CONCLUIU =
	"Não foi possível concluir. Confira os dados e tente novamente.";
const SEM_CONEXAO = "Confira sua conexão e tente novamente.";
/** Os erros que a linha das mensagens pode mostrar, para guardar o lugar deles. */
const ERROS = [
	CADASTRO_FECHADO,
	MUITAS_TENTATIVAS,
	LOGIN_RECUSADO,
	SENHA_RECUSADA,
	LINK_VENCIDO,
	TERMO_MUDOU,
	NAO_CONCLUIU,
	SEM_CONEXAO,
];

type LinkDaTela = {
	texto: string;
	para: string;
	/** O link ainda não vale: fica guardado, invisível, no lugar dele. */
	guardado?: boolean;
};

const ENTRAR_NA_CONTA = { texto: "Entrar na conta", para: "/login" };
const OUTRO_EMAIL = {
	texto: "Solicitar outro e-mail de confirmação",
	para: "/cadastro/reenvio",
};

/** Os links de cada tela para as outras, antes e depois da conclusão. */
function linksDa(
	modo: Modo,
	concluido: boolean,
	loginRecusado: boolean,
): LinkDaTela[] {
	switch (modo) {
		case "login":
			// O do reenvio vale depois do 401; antes, fica guardado, e o login
			// recusado não sobe o formulário no computador (conta.css).
			return [
				{ texto: "Esqueci minha senha", para: "/cadastro/recuperar" },
				{ texto: "Criar conta", para: "/cadastro" },
				{ ...OUTRO_EMAIL, guardado: !loginRecusado },
			];
		case "cadastro":
			return concluido ? [OUTRO_EMAIL, ENTRAR_NA_CONTA] : [ENTRAR_NA_CONTA];
		case "confirmar":
			return [concluido ? ENTRAR_NA_CONTA : OUTRO_EMAIL];
		case "redefinir":
			return [
				concluido
					? ENTRAR_NA_CONTA
					: { texto: "Solicitar outro link", para: "/cadastro/recuperar" },
			];
		case "excluir":
			return [
				concluido
					? { texto: "Ir para o início", para: "/" }
					: { texto: "Voltar ao perfil", para: "/perfil" },
			];
		default:
			return [ENTRAR_NA_CONTA];
	}
}

/**
 * O campo de texto do site, com o rótulo em Label em cima e o erro embaixo,
 * ligado a ele pelo aria-describedby.
 */
function Campo({
	rotulo,
	erro,
	...props
}: InputHTMLAttributes<HTMLInputElement> & {
	rotulo: string;
	erro?: string;
	name: string;
}) {
	return (
		<div className="campo-com-rotulo">
			<label htmlFor={`campo-${props.name}`} className="rotulo">
				{rotulo}
			</label>
			<input
				id={`campo-${props.name}`}
				className="campo"
				{...props}
				aria-invalid={erro ? true : undefined}
				aria-describedby={erro ? `erro-${props.name}` : undefined}
			/>
			{erro && (
				<p id={`erro-${props.name}`} className="falta-no-campo">
					{erro}
				</p>
			)}
		</div>
	);
}

function impedirAtivacao(evento: { preventDefault: () => void }) {
	evento.preventDefault();
}

/** Uma lista do site, com o rótulo em Label em cima. */
function Lista({
	rotulo,
	ocupada,
	...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
	rotulo: string;
	name: string;
	ocupada: boolean;
}) {
	return (
		<div className="campo-com-rotulo">
			<label htmlFor={`campo-${props.name}`} className="rotulo">
				{rotulo}
			</label>
			<select
				id={`campo-${props.name}`}
				className="campo"
				{...props}
				aria-disabled={ocupada || undefined}
				onClick={ocupada ? impedirAtivacao : undefined}
				onPointerDown={(evento) => {
					if (!ocupada) return;
					evento.preventDefault();
					evento.currentTarget.focus();
				}}
				onKeyDown={(evento) => {
					// A lista nativa não tem readOnly. Preserve Tab e os atalhos
					// do navegador, mas impeça a seleção e a abertura da lista.
					if (
						ocupada &&
						((evento.key.length === 1 && !evento.ctrlKey && !evento.metaKey) ||
							/^(ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Home|End|PageUp|PageDown|Enter|F4)$/.test(
								evento.key,
							))
					) {
						evento.preventDefault();
					}
				}}
			/>
		</div>
	);
}

/** O texto do botão e a seta, como no perfil. */
function ComSeta({ children }: { children: string }) {
	return (
		<>
			{children}{" "}
			<ArrowRight
				aria-hidden="true"
				className={SETA_DO_BOTAO}
				strokeWidth={2.5}
			/>
		</>
	);
}

/**
 * Ao lado do formulário do cadastro: o que a conta guarda, com as palavras do
 * perfil, e o termo, numa aba nova, para o formulário não se perder.
 */
function OQueAContaGuarda() {
	return (
		<div className="conta-guarda">
			<h2 className="rotulo">O que a conta guarda</h2>
			<p className="conta-guarda-texto">
				O seu nome, o seu e-mail, um código da sua senha (nunca a senha), os
				dados opcionais que você escolher dar e os artigos que você ler. As
				respostas dos quizzes ficam só no seu navegador, e a newsletter é uma
				inscrição à parte.
			</p>
			<p>
				<AcaoDeTexto
					href="/termo#o-que-guarda"
					target="_blank"
					rel="noopener"
					texto="Ler o termo da conta"
					complemento="(abre em outra aba)"
					icone={
						<ArrowUpRight
							aria-hidden="true"
							className="conta-outra-aba"
							strokeWidth={2.5}
						/>
					}
				/>
			</p>
		</div>
	);
}

function validar(form: HTMLFormElement) {
	const erros: Record<string, string> = {};
	const dados = new FormData(form);
	for (const input of form.querySelectorAll("input")) {
		const { name, validity, value } = input;
		if (validity.valueMissing || (name === "nome" && !value.trim())) {
			erros[name] =
				name === "aceite"
					? "Aceite o termo para criar sua conta."
					: "Preencha este campo.";
		} else if (validity.typeMismatch) {
			erros[name] = "Informe um e-mail válido.";
		} else if (
			input.minLength > 0 &&
			Array.from(value).length < input.minLength
		) {
			erros[name] = "Use pelo menos 12 caracteres.";
		} else if (name === "confirmar_senha" && value !== dados.get("senha")) {
			erros[name] = "As senhas devem coincidir.";
		} else if (validity.rangeOverflow || validity.badInput) {
			erros[name] = "Informe uma data válida até hoje.";
		}
	}
	return erros;
}
const estados =
	"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(
		" ",
	);

/**
 * As sete telas da conta (DESIGN.md, "Telas da conta"), no cartaz das páginas
 * de dentro (CartazDaConta): o título, a frase, o formulário, a linha das
 * mensagens e os links entre as telas.
 *
 * - Enquanto envia, o botão fica com o aria-disabled, e não com o disabled,
 *   que tirava o foco dele; os campos ficam só de leitura, e "Aguarde…"
 *   aparece embaixo do botão. Um segundo envio não sai (a guarda por ref).
 * - Os erros da API e da rede ficam embaixo do botão, na região role="status"
 *   que nunca sai da página. No computador, a linha guarda o lugar de todos
 *   os erros, e o login guarda o link que o 401 traz: o cartaz prende o título
 *   embaixo, e o que crescesse no pé subiria o formulário e o botão.
 * - Na conclusão, o formulário sai, o título muda e recebe o foco, a região
 *   lê a frase de conclusão, e os links ficam no lugar do botão.
 * - O login confere a sessão antes de mostrar o formulário (`sessao`). O
 *   formulário já vem no HTML do servidor, invisível e inerte, na mesma célula
 *   da espera: nada se mexe quando ele aparece.
 * - Sem a API (o build sem o API_URL), a tela não pede nada: diz que a conta
 *   não funciona ali e leva às trilhas.
 * - Sem JavaScript, o formulário, a espera e a linha das mensagens saem pelo
 *   conta.css, e o noscript explica. Os links continuam.
 */
export function FormularioConta({
	modo,
	sessao = "visitante",
}: {
	modo: Modo;
	/** No login, o que a conferência da sessão já disse. */
	sessao?: "verificando" | "visitante" | "indisponivel";
}) {
	const cadastro = modo === "cadastro";
	const pedeSenha = cadastro || modo === "redefinir";
	const semApi = !ENV.API_URL;
	const [termo, setTermo] = useState<Termo>();
	const [genero, setGenero] = useState("");
	const [mensagem, setMensagem] = useState("");
	const [erros, setErros] = useState<Record<string, string>>({});
	const [tentouEnviar, setTentouEnviar] = useState(false);
	const [loginRecusado, setLoginRecusado] = useState(false);
	const [ocupado, setOcupado] = useState(false);
	const [concluido, setConcluido] = useState(false);
	const [interativo, setInterativo] = useState(false);
	const enviando = useRef(false);
	const titulo = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		setInterativo(true);
		// Sem a API, a tela não pede nada, nem o termo do cadastro.
		if (!cadastro || semApi) return;
		const abortar = new AbortController();
		termoConta({ signal: abortar.signal }).then(({ data }) => {
			if (abortar.signal.aborted) return;
			// A versão que a API pede tem que ser a da página do termo: com outra, a
			// pessoa aceitaria um texto que não leu (lib/termo.ts).
			if (data?.versao === VERSAO_DO_TERMO) setTermo(data);
			else setMensagem(CADASTRO_FECHADO);
		});
		return () => abortar.abort();
	}, [cadastro, semApi]);

	// O formulário sai na conclusão: o foco vai para o título novo.
	useEffect(() => {
		if (concluido) titulo.current?.focus();
	}, [concluido]);

	async function enviar(evento: FormEvent<HTMLFormElement>) {
		evento.preventDefault();
		if (enviando.current) return;
		setLoginRecusado(false);
		const form = evento.currentTarget;
		const dados = new FormData(form);
		const valor = (nome: string) => String(dados.get(nome) ?? "");
		const email = valor("email");
		const senha = valor("senha");
		const confirmar_senha = valor("confirmar_senha");
		const pendentes = validar(form);
		setTentouEnviar(true);
		const primeiro = Object.keys(pendentes)[0];
		if (primeiro) {
			// A descrição precisa estar no DOM quando o navegador mudar o foco.
			flushSync(() => {
				setErros(pendentes);
				setMensagem("");
			});
			(form.elements.namedItem(primeiro) as HTMLInputElement).focus();
			return;
		}
		setErros(pendentes);
		const token = window.location.hash.slice(1);
		enviando.current = true;
		setOcupado(true);
		setMensagem("");
		// Depois do login, o botão fica ocupado até o perfil abrir.
		let saindo = false;
		try {
			const signal = AbortSignal.timeout(20000);
			let resposta: Response | undefined;
			switch (modo) {
				case "login":
					resposta = (
						await entrarConta({
							signal,
							credentials: "include",
							body: { email, senha },
						})
					).response;
					break;
				case "cadastro":
					if (!termo) return;
					resposta = (
						await cadastrarConta({
							signal,
							body: {
								nome: valor("nome"),
								email,
								senha,
								confirmar_senha,
								aceite: true,
								termo: termo.versao,
								genero: (valor("genero") || null) as Cadastro["genero"],
								autodescricao: valor("autodescricao") || null,
								estado: valor("estado") || null,
								nascimento: valor("nascimento") || null,
							},
						})
					).response;
					break;
				case "confirmar":
					resposta = (await confirmarConta({ signal, body: { token } }))
						.response;
					break;
				case "reenvio":
					resposta = (await reenviarConfirmacao({ signal, body: { email } }))
						.response;
					break;
				case "recuperar":
					resposta = (await recuperarConta({ signal, body: { email } }))
						.response;
					break;
				case "redefinir":
					resposta = (
						await redefinirSenha({
							signal,
							body: { token, senha, confirmar_senha },
						})
					).response;
					break;
				case "excluir":
					resposta = (
						await excluirConta({
							signal,
							credentials: "include",
							body: { senha },
						})
					).response;
					break;
			}
			if (!resposta?.ok) {
				// Sem resposta, o pedido não chegou à API: a rede caiu ou o tempo
				// acabou. O cliente gerado devolve o erro, sem lançar, e o catch
				// embaixo não o vê.
				if (!resposta) setMensagem(SEM_CONEXAO);
				else if (resposta?.status === 429) setMensagem(MUITAS_TENTATIVAS);
				else if (modo === "login" && resposta?.status === 401) {
					setLoginRecusado(true);
					setMensagem(LOGIN_RECUSADO);
				} else if (modo === "excluir" && resposta?.status === 401)
					setMensagem(SENHA_RECUSADA);
				else if (
					["confirmar", "redefinir"].includes(modo) &&
					[401, 422].includes(resposta?.status ?? 0)
				)
					setMensagem(LINK_VENCIDO);
				else if (resposta?.status === 409) setMensagem(TERMO_MUDOU);
				else setMensagem(NAO_CONCLUIU);
				return;
			}
			if (modo === "login") {
				anotarEntradaNaConta();
				saindo = true;
				window.location.replace("/perfil");
				return;
			}
			if (modo === "excluir") encerrarProgressoNaConta();
			setConcluido(true);
			setMensagem(conclusoes[modo]);
			if (token)
				window.history.replaceState(null, "", window.location.pathname);
			if (cadastro && dados.has("newsletter")) {
				const resultado = await pedirInscricao(email);
				if (resultado.tipo !== "inscrita")
					setMensagem(
						conclusoes.cadastro +
							" A inscrição na newsletter precisa ser tentada novamente.",
					);
			}
		} catch {
			setMensagem(SEM_CONEXAO);
		} finally {
			if (!saindo) {
				enviando.current = false;
				setOcupado(false);
			}
		}
	}

	const tituloDaConclusao =
		modo === "login" ? undefined : titulosDaConclusao[modo];
	const titulosDaTela =
		semApi || !tituloDaConclusao
			? [titulos[modo]]
			: [titulos[modo], tituloDaConclusao];
	// Na tela mais comprida, o painel precisa de mais fileiras.
	const azulejos = cadastro ? 200 : 96;

	if (semApi) {
		return (
			<CartazDaConta
				titulo={titulos[modo]}
				titulos={titulosDaTela}
				azulejos={azulejos}
				lado={<p className="abertura">{SEM_API}</p>}
			>
				<Link to="/trilhas" className={BOTAO_CONTINUAR}>
					<ComSeta>Ver as trilhas</ComSeta>
				</Link>
			</CartazDaConta>
		);
	}

	const verificando = modo === "login" && sessao !== "visitante";
	const linha = mensagem || (ocupado ? AGUARDE : "");
	const formulario = (
		<form
			method="post"
			noValidate
			inert={verificando}
			onSubmit={enviar}
			onChange={(e) => {
				if (tentouEnviar && !enviando.current)
					setErros(validar(e.currentTarget));
			}}
			className={classes(
				"conta-formulario",
				modo === "login" && "col-start-1 row-start-1",
				verificando && "invisible",
			)}
		>
			{cadastro && (
				<Campo
					rotulo="Nome completo"
					name="nome"
					erro={erros.nome}
					autoComplete="name"
					required
					maxLength={160}
					readOnly={ocupado}
				/>
			)}
			{(cadastro ||
				modo === "login" ||
				modo === "reenvio" ||
				modo === "recuperar") && (
				<Campo
					rotulo="E-mail"
					name="email"
					erro={erros.email}
					type="email"
					autoComplete={modo === "login" ? "username" : "email"}
					required
					readOnly={ocupado}
				/>
			)}
			{pedeSenha && (
				<>
					<Campo
						rotulo="Senha (12 a 128 caracteres)"
						erro={erros.senha}
						name="senha"
						type="password"
						autoComplete="new-password"
						minLength={12}
						maxLength={128}
						required
						readOnly={ocupado}
					/>
					<Campo
						rotulo="Confirmar senha"
						name="confirmar_senha"
						erro={erros.confirmar_senha}
						type="password"
						autoComplete="new-password"
						maxLength={128}
						required
						readOnly={ocupado}
					/>
				</>
			)}
			{cadastro && (
				<>
					<fieldset className="conta-opcionais">
						<legend className="rotulo">Campos opcionais</legend>
						<p className="dica-do-campo">
							Essas informações ajudam a entender quem usa o Mandatômetro.
						</p>
						<Lista
							rotulo="Gênero"
							name="genero"
							ocupada={ocupado}
							value={genero}
							onChange={(e) => setGenero(e.target.value)}
						>
							<option value="">Selecione, se quiser</option>
							<option value="mulher">Mulher</option>
							<option value="homem">Homem</option>
							<option value="nao_binario">Pessoa não binária</option>
							<option value="autodescricao">Quero me descrever</option>
							<option value="prefiro_nao_informar">Prefiro não informar</option>
						</Lista>
						{genero === "autodescricao" && (
							<Campo
								rotulo="Como você se identifica?"
								name="autodescricao"
								maxLength={100}
								readOnly={ocupado}
							/>
						)}
						<Lista
							rotulo="Estado de residência"
							name="estado"
							ocupada={ocupado}
						>
							<option value="">Selecione, se quiser</option>
							{estados.map((uf) => (
								<option key={uf}>{uf}</option>
							))}
							<option value="EX">Moro no exterior</option>
						</Lista>
						<Campo
							rotulo="Data de nascimento"
							type="date"
							name="nascimento"
							erro={erros.nascimento}
							autoComplete="bday"
							max={new Date().toLocaleDateString("en-CA")}
							readOnly={ocupado}
						/>
					</fieldset>
					<div className="campo-com-rotulo">
						<label className="marcar">
							<input
								type="checkbox"
								name="aceite"
								required
								aria-label={`${TEXTO_DO_ACEITE} ${TERMO_DO_ACEITE}.`}
								aria-disabled={ocupado || undefined}
								aria-invalid={erros.aceite ? true : undefined}
								aria-describedby={erros.aceite ? "erro-aceite" : undefined}
								onClick={ocupado ? impedirAtivacao : undefined}
							/>
							<span>
								{TEXTO_DO_ACEITE}{" "}
								{termo ? (
									<a href={termo.url} target="_blank" rel="noreferrer">
										{TERMO_DO_ACEITE}
									</a>
								) : (
									TERMO_DO_ACEITE
								)}
								.
							</span>
						</label>
						{erros.aceite && (
							<p id="erro-aceite" className="falta-no-campo">
								{erros.aceite}
							</p>
						)}
					</div>
					<label className="marcar">
						<input
							type="checkbox"
							name="newsletter"
							aria-disabled={ocupado || undefined}
							onClick={ocupado ? impedirAtivacao : undefined}
						/>
						<span>Quero receber a newsletter semanal.</span>
					</label>
				</>
			)}
			{(modo === "login" || modo === "excluir") && (
				<Campo
					rotulo={modo === "login" ? "Senha" : "Senha atual"}
					erro={erros.senha}
					type="password"
					name="senha"
					autoComplete="current-password"
					required
					maxLength={128}
					readOnly={ocupado}
				/>
			)}
			<button
				type="submit"
				className={BOTAO_CONTINUAR}
				disabled={!interativo || (cadastro && !termo)}
				aria-disabled={ocupado || undefined}
			>
				<ComSeta>{titulos[modo]}</ComSeta>
			</button>
		</form>
	);

	return (
		<CartazDaConta
			titulo={
				concluido && tituloDaConclusao ? tituloDaConclusao : titulos[modo]
			}
			titulos={titulosDaTela}
			refDoTitulo={titulo}
			azulejos={azulejos}
			lado={
				concluido ? null : (
					<>
						<p className="abertura">{aberturas[modo]}</p>
						{cadastro && <OQueAContaGuarda />}
					</>
				)
			}
		>
			{!concluido && (
				<noscript>
					<p className="ainda-nao">{SEM_SCRIPT}</p>
				</noscript>
			)}
			{modo === "login" ? (
				<div className="conta-sessao">
					{sessao === "verificando" && (
						<p
							role="status"
							className="rotulo conta-aguarde conta-verificando col-start-1 row-start-1"
						>
							{VERIFICANDO}
						</p>
					)}
					{sessao === "indisponivel" && (
						<div
							role="alert"
							className="conta-indisponivel col-start-1 row-start-1"
						>
							<p className="ainda-nao">Não foi possível consultar sua conta.</p>
							<AcaoDeTexto href="/login" texto="Tentar novamente" />
						</div>
					)}
					{formulario}
				</div>
			) : (
				!concluido && formulario
			)}
			{/* A linha das mensagens, embaixo do botão. Guarda o lugar do "Aguarde…",
			    que aparece em todo envio e não mexe em nada, e, no computador, o dos
			    erros (conta.css). Na conclusão, é ela que lê a frase, no lugar do
			    formulário. */}
			<div className="conta-mensagem text-pretty">
				{!concluido && (
					<>
						<Reservas frases={[AGUARDE]} className="rotulo conta-aguarde" />
						<Reservas
							frases={ERROS}
							className="ainda-nao conta-erro-guardado"
						/>
					</>
				)}
				{/* Só a conclusão pode esperar a inscrição na newsletter. */}
				<p
					role="status"
					aria-busy={(cadastro && concluido && ocupado) || undefined}
					className={classes(
						"col-start-1 row-start-1",
						concluido
							? "abertura"
							: mensagem
								? "ainda-nao"
								: "rotulo conta-aguarde",
					)}
				>
					{linha}
				</p>
			</div>
			<ul className="conta-links">
				{linksDa(modo, concluido, loginRecusado).map(
					({ texto, para, guardado }) => (
						<li
							key={para}
							className={guardado ? "conta-link-guardado" : undefined}
							aria-hidden={guardado || undefined}
							inert={guardado}
						>
							<AcaoDeTexto
								href={para}
								onClick={semSegundoClique}
								texto={texto}
							/>
						</li>
					),
				)}
			</ul>
		</CartazDaConta>
	);
}
