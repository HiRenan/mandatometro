import {
	type FormEvent,
	type InputHTMLAttributes,
	useEffect,
	useState,
} from "react";
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
import { pedirInscricao } from "@/lib/newsletter";
import { BOTAO_CONTINUAR } from "./botao-continuar";

export const titulos = {
	login: "Entrar na conta",
	cadastro: "Criar conta",
	confirmar: "Confirmar e-mail",
	recuperar: "Recuperar senha",
	redefinir: "Definir nova senha",
	reenvio: "Reenviar confirmação",
	excluir: "Excluir conta",
};
type Modo = keyof typeof titulos;
const conclusoes: Record<Exclude<Modo, "login">, string> = {
	cadastro: "Confira sua caixa de entrada para confirmar o cadastro.",
	confirmar: "Seu e-mail foi confirmado.",
	recuperar:
		"Se houver uma conta confirmada, você receberá um link para redefinir a senha.",
	redefinir: "Sua senha foi alterada. Entre novamente para continuar.",
	reenvio: "Se houver um cadastro pendente, você receberá outro link.",
	excluir: "Sua conta foi excluída. O comprovante será enviado por e-mail.",
};
const campo =
	"block w-full rounded-none border border-tinta bg-papel px-3 py-2 text-tinta";
function Campo({
	rotulo,
	erro,
	...props
}: InputHTMLAttributes<HTMLInputElement> & { rotulo: string; erro?: string }) {
	return (
		<div className="grid gap-1">
			<label>
				{rotulo}
				<input
					className={campo}
					{...props}
					aria-invalid={erro ? true : undefined}
					aria-describedby={erro ? `erro-${props.name}` : undefined}
				/>
			</label>
			{erro && (
				<span id={`erro-${props.name}`} className="text-red-700">
					{erro}
				</span>
			)}
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

export function FormularioConta({ modo }: { modo: Modo }) {
	const cadastro = modo === "cadastro";
	const pedeSenha = cadastro || modo === "redefinir";
	const [termo, setTermo] = useState<Termo>();
	const [genero, setGenero] = useState("");
	const [mensagem, setMensagem] = useState("");
	const [erros, setErros] = useState<Record<string, string>>({});
	const [tentouEnviar, setTentouEnviar] = useState(false);
	const [ocupado, setOcupado] = useState(false);
	const [concluido, setConcluido] = useState(false);
	const [interativo, setInterativo] = useState(false);
	useEffect(() => {
		setInterativo(true);
		if (!cadastro) return;
		const abortar = new AbortController();
		termoConta({ signal: abortar.signal }).then(({ data }) => {
			if (abortar.signal.aborted) return;
			if (data) setTermo(data);
			else setMensagem("O cadastro está indisponível no momento.");
		});
		return () => abortar.abort();
	}, [cadastro]);

	async function enviar(evento: FormEvent<HTMLFormElement>) {
		evento.preventDefault();
		if (ocupado) return;
		const form = evento.currentTarget;
		const dados = new FormData(form);
		const valor = (nome: string) => String(dados.get(nome) ?? "");
		const email = valor("email");
		const senha = valor("senha");
		const confirmar_senha = valor("confirmar_senha");
		const pendentes = validar(form);
		setTentouEnviar(true);
		setErros(pendentes);
		const primeiro = Object.keys(pendentes)[0];
		if (primeiro) {
			setMensagem("");
			(form.elements.namedItem(primeiro) as HTMLInputElement).focus();
			return;
		}
		const token = window.location.hash.slice(1);
		setOcupado(true);
		setMensagem("");
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
								genero: (genero || null) as Cadastro["genero"],
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
				if (resposta?.status === 429)
					setMensagem("Muitas tentativas. Aguarde um minuto.");
				else if (modo === "login" && resposta?.status === 401)
					setMensagem("Confira o e-mail, a senha e a confirmação do cadastro.");
				else if (modo === "excluir" && resposta?.status === 401)
					setMensagem("Entre novamente e confira sua senha.");
				else if (
					["confirmar", "redefinir"].includes(modo) &&
					[401, 422].includes(resposta?.status ?? 0)
				)
					setMensagem("O link expirou ou é inválido. Solicite outro abaixo.");
				else if (resposta?.status === 409)
					setMensagem(
						"O termo mudou. Recarregue a página para ler a versão atual.",
					);
				else
					setMensagem(
						"Não foi possível concluir. Confira os dados e tente novamente.",
					);
				return;
			}
			if (modo === "login") {
				window.location.replace("/perfil");
				return;
			}
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
			setMensagem("Confira sua conexão e tente novamente.");
		} finally {
			setOcupado(false);
		}
	}
	return (
		<section className="px-margem-celular text-tinta mx-auto grid max-w-xl gap-6 py-12">
			<h1 className="titulo-condensado letra-com-teto [--palavra:6]">
				{titulos[modo]}
			</h1>
			{!concluido && (
				<form
					method="post"
					noValidate
					onSubmit={enviar}
					onChange={(e) => {
						if (tentouEnviar) setErros(validar(e.currentTarget));
					}}
					className="grid gap-5"
				>
					<noscript>Ative o JavaScript para usar este formulário.</noscript>
					{cadastro && (
						<Campo
							rotulo="Nome completo"
							name="nome"
							erro={erros.nome}
							autoComplete="name"
							required
							maxLength={160}
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
							/>
							<Campo
								rotulo="Confirmar senha"
								name="confirmar_senha"
								erro={erros.confirmar_senha}
								type="password"
								autoComplete="new-password"
								maxLength={128}
								required
							/>
						</>
					)}
					{cadastro && (
						<>
							<fieldset className="grid gap-4 border-y py-4">
								<legend className="font-bold">Campos opcionais</legend>
								<p>
									Essas informações ajudam a entender quem usa o Mandatômetro.
								</p>
								<label>
									Gênero
									<select
										name="genero"
										className={campo}
										value={genero}
										onChange={(e) => setGenero(e.target.value)}
									>
										<option value="">Selecione, se quiser</option>
										<option value="mulher">Mulher</option>
										<option value="homem">Homem</option>
										<option value="nao_binario">Pessoa não binária</option>
										<option value="autodescricao">Quero me descrever</option>
										<option value="prefiro_nao_informar">
											Prefiro não informar
										</option>
									</select>
								</label>
								{genero === "autodescricao" && (
									<Campo
										rotulo="Como você se identifica?"
										name="autodescricao"
										maxLength={100}
									/>
								)}
								<label>
									Estado de residência
									<select className={campo} name="estado">
										<option value="">Selecione, se quiser</option>
										{estados.map((uf) => (
											<option key={uf}>{uf}</option>
										))}
										<option value="EX">Moro no exterior</option>
									</select>
								</label>
								<Campo
									rotulo="Data de nascimento"
									type="date"
									name="nascimento"
									erro={erros.nascimento}
									autoComplete="bday"
									max={new Date().toLocaleDateString("en-CA")}
								/>
							</fieldset>
							<div className="grid gap-1">
								<label>
									<input
										type="checkbox"
										name="aceite"
										required
										aria-invalid={erros.aceite ? true : undefined}
										aria-describedby={erros.aceite ? "erro-aceite" : undefined}
									/>{" "}
									Li e aceito{" "}
									{termo ? (
										<a
											href={termo.url}
											target="_blank"
											rel="noreferrer"
											className="underline"
										>
											o termo de consentimento
										</a>
									) : (
										"o termo de consentimento"
									)}
									.
								</label>
								{erros.aceite && (
									<span id="erro-aceite" className="text-red-700">
										{erros.aceite}
									</span>
								)}
							</div>
							<label>
								<input type="checkbox" name="newsletter" /> Quero receber a
								newsletter semanal.
							</label>
						</>
					)}
					{modo === "excluir" && (
						<p>
							A exclusão é permanente. Sua conta e o progresso associado serão
							apagados. Sua inscrição na newsletter é independente.
						</p>
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
						/>
					)}
					<button
						type="submit"
						className={BOTAO_CONTINUAR}
						disabled={!interativo || ocupado || (cadastro && !termo)}
					>
						{ocupado ? "Aguarde…" : modo === "login" ? "Entrar" : titulos[modo]}
					</button>
				</form>
			)}
			<p role="status">{mensagem}</p>
			{((cadastro && concluido) ||
				modo === "login" ||
				(modo === "confirmar" && !concluido)) && (
				<a className="acao-de-texto" href="/cadastro/reenvio">
					Solicitar outro e-mail de confirmação
				</a>
			)}
			{modo === "redefinir" && !concluido && (
				<a className="acao-de-texto" href="/cadastro/recuperar">
					Solicitar outro link
				</a>
			)}
			{modo === "login" && (
				<a className="acao-de-texto" href="/cadastro">
					Criar conta
				</a>
			)}
			{(cadastro || modo === "login") && (
				<a className="acao-de-texto" href="/cadastro/recuperar">
					Esqueci minha senha
				</a>
			)}
			{concluido && (modo === "confirmar" || modo === "redefinir") && (
				<a className="acao-de-texto" href="/login">
					Entrar na conta
				</a>
			)}
		</section>
	);
}
