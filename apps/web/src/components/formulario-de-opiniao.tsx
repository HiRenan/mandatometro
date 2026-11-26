import { ArrowRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { comMilhares } from "@/lib/formatar";
import {
	ENVIANDO_OPINIAO,
	LIMITE_DO_TEXTO,
	MUITAS_OPINIOES,
	OPINIAO_ENVIADA,
	OPINIAO_FORA_DO_AR,
	PARTES_DA_OPINIAO,
	type ParteDaOpiniao,
	type PedidoDaOpiniao,
	TEXTO_INVALIDO,
} from "@/lib/opiniao";
import { enviarOpiniao } from "@/lib/opiniao.functions";
import { sinalComPrazo } from "@/lib/prazo";
import { AcaoDeTexto } from "./acao-de-texto";
import { Aviso, useAviso } from "./aviso";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "./botao-continuar";

const NOTAS = [1, 2, 3, 4, 5];
const MENSAGENS = {
	enviada: OPINIAO_ENVIADA,
	"texto-invalido": TEXTO_INVALIDO,
	limite: MUITAS_OPINIOES,
	"fora-do-ar": OPINIAO_FORA_DO_AR,
};

export function FormularioDeOpiniao() {
	const [texto, setTexto] = useState("");
	const [nota, setNota] = useState<number | null>(null);
	const [partes, setPartes] = useState<ParteDaOpiniao[]>([]);
	const [mensagem, setMensagem] = useState<{
		tipo: keyof typeof MENSAGENS;
	}>();
	const [esperando, setEsperando] = useState(false);
	const { aviso, avisar } = useAviso();
	const enviando = useRef(false);
	const campo = useRef<HTMLTextAreaElement>(null);
	const volta = useRef<HTMLAnchorElement>(null);
	const id = useId();
	const erroNoTexto = mensagem?.tipo === "texto-invalido";
	const caracteres = [...texto].length;

	useEffect(() => {
		if (mensagem?.tipo === "texto-invalido") campo.current?.focus();
		if (mensagem?.tipo === "enviada") volta.current?.focus();
	}, [mensagem]);

	function mostrar(tipo: keyof typeof MENSAGENS) {
		setMensagem({ tipo });
		avisar(MENSAGENS[tipo]);
	}

	// Como na newsletter, a ação devolve o controle ao React antes da resposta.
	function enviar(dados: FormData) {
		if (enviando.current) return;
		const textoDigitado = String(dados.get("texto") ?? "");
		const textoAparado = textoDigitado.trim();
		const notaEscolhida =
			NOTAS.find((valor) => String(valor) === dados.get("nota")) ?? null;
		const escolhidas = dados.getAll("partes");
		const partesEscolhidas = PARTES_DA_OPINIAO.map(([parte]) => parte).filter(
			(parte) => escolhidas.includes(parte),
		);
		setTexto(textoDigitado);
		setNota(notaEscolhida);
		setPartes(partesEscolhidas);
		if (!textoAparado || [...textoDigitado].length > LIMITE_DO_TEXTO) {
			mostrar("texto-invalido");
			return;
		}
		void entregar({
			texto: textoAparado,
			nota: notaEscolhida,
			partes: partesEscolhidas,
			site: String(dados.get("site") ?? ""),
		});
	}

	async function entregar(pedido: PedidoDaOpiniao) {
		enviando.current = true;
		setEsperando(true);
		setMensagem(undefined);
		avisar(ENVIANDO_OPINIAO);
		const resultado = await enviarOpiniao({
			data: pedido,
			signal: sinalComPrazo(12_000),
			fetch: (entrada, opcoes) =>
				fetch(entrada, { ...opcoes, credentials: "omit" }),
		}).catch(() => "fora-do-ar" as const);
		enviando.current = false;
		setEsperando(false);
		if (resultado === "enviada") setTexto("");
		mostrar(resultado);
	}

	return (
		<>
			{mensagem?.tipo !== "enviada" && (
				<p
					className="dica-da-opiniao privacidade-da-opiniao"
					id={`${id}-privacidade`}
				>
					O site não pede nome nem e-mail e não guarda o IP. Deixe seus dados
					pessoais fora do texto. Se quiser uma resposta, escreva para{" "}
					<AcaoDeTexto
						href="mailto:contato@mandatometro.com.br"
						texto="contato@mandatometro.com.br"
					/>
					.
				</p>
			)}
			{mensagem?.tipo === "enviada" ? (
				<div className="opiniao-enviada">
					<p className="lide">{OPINIAO_ENVIADA}</p>
					<AcaoDeTexto href="/" ref={volta} texto="Voltar ao início" />
				</div>
			) : (
				<form
					action={enviar}
					onSubmit={(evento) => {
						// O reset automático da ação também limparia os rádios e as caixas.
						evento.preventDefault();
						enviar(new FormData(evento.currentTarget));
					}}
					className="formulario-de-opiniao"
					noValidate
				>
					<fieldset aria-describedby={`${id}-escala`} disabled={esperando}>
						<legend className="rotulo">Como foi usar o site? (opcional)</legend>
						<div className="notas-da-opiniao">
							{NOTAS.map((valor) => (
								<label key={valor} className="nota-da-opiniao">
									<input
										className="sr-only"
										type="radio"
										name="nota"
										value={valor}
										checked={nota === valor}
										onChange={() => setNota(valor)}
									/>
									<span>{valor}</span>
								</label>
							))}
						</div>
						<p className="dica-da-opiniao" id={`${id}-escala`}>
							1 é muito ruim e 5 é muito bom.
						</p>
					</fieldset>
					<fieldset disabled={esperando}>
						<legend className="rotulo">O que você usou? (opcional)</legend>
						<div className="partes-da-opiniao">
							{PARTES_DA_OPINIAO.map(([parte, nome]) => (
								<label className="marcar" key={parte}>
									<input
										type="checkbox"
										name="partes"
										value={parte}
										checked={partes.includes(parte)}
										onChange={({ currentTarget: { checked } }) =>
											setPartes((anteriores) =>
												checked
													? [...anteriores, parte]
													: anteriores.filter((outra) => outra !== parte),
											)
										}
									/>
									<span>{nome}</span>
								</label>
							))}
						</div>
					</fieldset>
					<div className="campo-com-rotulo">
						<label className="rotulo" htmlFor={`${id}-texto`}>
							O que funcionou e o que pode melhorar?
						</label>
						<textarea
							ref={campo}
							className="campo texto-da-opiniao"
							id={`${id}-texto`}
							name="texto"
							rows={5}
							required
							value={texto}
							onChange={(evento) => {
								const letras = [...evento.currentTarget.value];
								setTexto(letras.slice(0, LIMITE_DO_TEXTO).join(""));
							}}
							readOnly={esperando}
							aria-invalid={erroNoTexto || undefined}
							aria-describedby={`${erroNoTexto ? `${id}-erro ` : ""}${id}-contagem ${id}-privacidade`}
						/>
						{erroNoTexto && (
							<p className="falta-no-campo" id={`${id}-erro`}>
								{TEXTO_INVALIDO}
							</p>
						)}
						<p className="rotulo contagem-da-opiniao" id={`${id}-contagem`}>
							{comMilhares(caracteres)} de {comMilhares(LIMITE_DO_TEXTO)}{" "}
							caracteres
						</p>
					</div>
					<label hidden>
						Seu site
						<input name="site" tabIndex={-1} autoComplete="off" />
					</label>
					<button
						type="submit"
						className={BOTAO_CONTINUAR}
						aria-disabled={esperando || undefined}
					>
						Enviar opinião{" "}
						<ArrowRight
							aria-hidden="true"
							className={SETA_DO_BOTAO}
							strokeWidth={2.5}
						/>
					</button>
					{esperando && (
						<p className="rotulo contagem-da-opiniao">{ENVIANDO_OPINIAO}</p>
					)}
					{mensagem && !erroNoTexto && (
						<p className="ainda-nao">{MENSAGENS[mensagem.tipo]}</p>
					)}
				</form>
			)}
			<noscript>
				<p className="ainda-nao">
					Para enviar sua opinião, ligue o JavaScript do navegador.
				</p>
			</noscript>
			<Aviso texto={aviso} />
		</>
	);
}
