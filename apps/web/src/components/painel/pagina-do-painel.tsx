import { Link, useBlocker } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { classes } from "@/lib/classes";
import { formatarPeriodo, plural } from "@/lib/formatar";
import {
	type CamposDoItem,
	emLista,
	estadoDoItem,
	frasesDoQueFalta,
	oQueFalta,
	prontaParaPublicar,
	revisaoAlterada,
} from "@/lib/painel/arquivo";
import {
	type Aberta,
	ID_DA_FALTA_NA_EDICAO,
	ID_DA_MENSAGEM_DO_PE,
	ID_DO_RESULTADO,
	ID_DO_TITULO_DA_EDICAO,
	type Revisao,
	useRevisao,
} from "@/lib/painel/use-revisao";
import { Aviso, useAviso } from "../aviso";
import { BOTAO_CONTINUAR } from "../botao-continuar";
import { FaixaDeInformacoes } from "../faixa-de-informacoes";
import { FichaDoItem } from "./ficha-do-item";
import { FolhaPorCima } from "./folha-por-cima";
import { IndiceDaRevisao, type LinhaDoIndice } from "./indice-da-revisao";
import { VerificandoSessao } from "./verificando-sessao";

export const TEXTO_DE_PUBLICAR =
	"A edição fica pública no site na hora e não volta a ser rascunho. Os inscritos a recebem por e-mail no envio de domingo, às 10h37. Publicada depois desse horário, ela só vai por e-mail num envio feito à mão.";

/**
 * A revisão da edição da semana, em /painel, só para a administradora: a folha
 * da edição, com o título, a cobertura, o índice e uma ficha por item, e o pé
 * com "Salvar a revisão" e "Publicar a edição". O rascunho fica só na memória
 * da página (lib/painel/use-revisao.ts). Com alterações por salvar, o
 * navegador avisa ao fechar ou recarregar a aba, e uma folha do site avisa nos
 * links do site.
 */
export function PaginaDoPainel() {
	const { revisao, foco, carregar, editar, salvar, publicar, temAlteracoes } =
		useRevisao();
	const { aviso, avisar } = useAviso();
	const [confirmando, setConfirmando] = useState(false);

	const alterada =
		revisao.tipo === "aberta" &&
		revisaoAlterada(revisao.arquivo, revisao.campos);
	const saida = useBlocker({
		shouldBlockFn: temAlteracoes,
		enableBeforeUnload: temAlteracoes,
		withResolver: true,
	});

	// Depois de uma resposta, o foco vai para a frase ou o campo de que ela fala.
	useEffect(() => {
		if (foco) {
			document.getElementById(foco.alvo)?.focus();
		}
	}, [foco]);

	const operacao = revisao.tipo === "aberta" ? revisao.operacao : null;
	const salva = revisao.tipo === "aberta" && revisao.salva;
	const frase = revisao.tipo === "aberta" ? fraseDoPe(revisao, alterada) : "";
	// O leitor de tela ouve o começo de cada envio e o salvar que deu certo. A
	// falha leva o foco à frase dela, que ele lê.
	// biome-ignore lint/correctness/useExhaustiveDependencies: a frase é lida quando o envio começa ou termina, e não a cada letra.
	useEffect(() => {
		if (operacao === "salvando") {
			avisar("Salvando a revisão…");
		} else if (operacao === "publicando") {
			avisar("Publicando a edição…");
		} else if (salva) {
			avisar(frase);
		}
	}, [operacao, salva, avisar]);

	if (revisao.tipo === "saiu") {
		return <VerificandoSessao />;
	}

	return (
		<div className="pagina-do-painel">
			<div className="parede">
				<div className="artigo-grade">
					<article className="folha artigo-folha caixa-do-teto">
						<nav aria-label="Caminho" className="migalhas rotulo">
							<ol>
								<li>
									<Link to="/perfil">Conta</Link>
								</li>
							</ol>
						</nav>
						{/* A folha é a caixa do teto dos títulos de dentro, como na edição: o
						    título mede a letra pela largura dela, com a palavra mais
						    larga ("Revisão", na régua de lib/conteudo/regua.ts). */}
						<h1 className="titulo-condensado letra-com-teto teto-pela-caixa [--palavra:3.3]">
							Revisão da edição
						</h1>
						<CorpoDaRevisao
							revisao={revisao}
							alterada={alterada}
							frase={frase}
							carregar={carregar}
							editar={editar}
							salvar={salvar}
							pedirPublicacao={() => setConfirmando(true)}
						/>
					</article>
					{revisao.tipo === "aberta" && (
						<div className="ao-lado-do-artigo">
							<IndiceDaRevisao
								linhas={linhasDoIndice(revisao)}
								paraPublicar={paraPublicar(revisao, alterada)}
								onde="ao-lado"
							/>
						</div>
					)}
				</div>
			</div>
			<FolhaPorCima
				aberta={confirmando && revisao.tipo === "aberta"}
				titulo="Publicar a edição?"
				texto={TEXTO_DE_PUBLICAR}
				confirmar="Publicar agora"
				voltar="Voltar à revisão"
				aoConfirmar={() => {
					setConfirmando(false);
					void publicar();
				}}
				aoVoltar={() => setConfirmando(false)}
			/>
			<FolhaPorCima
				aberta={saida.status === "blocked"}
				titulo="Sair sem salvar?"
				texto="As alterações desta revisão ainda não foram salvas. Se você sair, elas se perdem."
				confirmar="Sair sem salvar"
				voltar="Continuar a revisão"
				aoConfirmar={() => saida.proceed?.()}
				aoVoltar={() => saida.reset?.()}
			/>
			<Aviso texto={aviso} />
		</div>
	);
}

function CorpoDaRevisao({
	revisao,
	alterada,
	frase,
	carregar,
	editar,
	salvar,
	pedirPublicacao,
}: {
	revisao: Exclude<Revisao, { tipo: "saiu" }>;
	alterada: boolean;
	frase: string;
	carregar: () => Promise<void>;
	editar: ReturnType<typeof useRevisao>["editar"];
	salvar: () => Promise<void>;
	pedirPublicacao: () => void;
}) {
	switch (revisao.tipo) {
		case "carregando":
			return (
				<p role="status" className="carregando-o-rascunho rotulo">
					Carregando o rascunho da semana…
				</p>
			);
		case "sem-api":
			return (
				<p className="lide">
					O painel de revisão não funciona neste endereço do site.
				</p>
			);
		case "sem-rascunho":
			return (
				<div className="estado-da-revisao">
					<p className="lide">Não há rascunho para revisar.</p>
					<p className="prosa">
						A agenda de sábado prepara o rascunho com as votações e os atos da
						semana. Quando ele chegar, aparece aqui.
					</p>
					<Link to="/edicoes" className={BOTAO_CONTINUAR}>
						Ver as edições publicadas
					</Link>
				</div>
			);
		case "falhou":
			return (
				<div className="estado-da-revisao">
					<p className="lide">O rascunho não carregou.</p>
					<p className="ainda-nao">{revisao.mensagem}</p>
					<button
						type="button"
						className={BOTAO_CONTINUAR}
						onClick={() => void carregar()}
					>
						Tentar de novo
					</button>
				</div>
			);
		case "salva-sem-releitura":
			return (
				<div className="estado-da-revisao">
					<div id={ID_DO_RESULTADO} tabIndex={-1} className="resultado">
						<p className="lide">A revisão foi salva.</p>
						<p className="ainda-nao">
							Mas a versão nova do rascunho não carregou.
						</p>
					</div>
					<button
						type="button"
						className={BOTAO_CONTINUAR}
						onClick={() => void carregar()}
					>
						Carregar o rascunho
					</button>
				</div>
			);
		case "publicada":
			return (
				<div className="estado-da-revisao">
					<div id={ID_DO_RESULTADO} tabIndex={-1} className="resultado">
						<p className="lide">
							{revisao.jaEstava
								? "Esta edição já estava publicada."
								: "Edição publicada."}
						</p>
						<p className="prosa">
							Ela já está no site e vai por e-mail aos inscritos no envio de
							domingo.
						</p>
					</div>
					<Link
						to="/edicoes/$id"
						params={{ id: String(revisao.edicaoId) }}
						className={BOTAO_CONTINUAR}
					>
						Ver a edição publicada
					</Link>
				</div>
			);
		case "trocada":
			return (
				<div className="estado-da-revisao">
					<div id={ID_DO_RESULTADO} tabIndex={-1} className="resultado">
						<p className="lide">
							Esta edição foi publicada ou trocada enquanto você revisava.
						</p>
						<p className="ainda-nao">O que não foi salvo ficou de fora.</p>
					</div>
					<button
						type="button"
						className={BOTAO_CONTINUAR}
						onClick={() => void carregar()}
					>
						Carregar o rascunho atual
					</button>
				</div>
			);
		case "aberta":
			return (
				<FormularioDaRevisao
					revisao={revisao}
					alterada={alterada}
					frase={frase}
					editar={editar}
					salvar={salvar}
					pedirPublicacao={pedirPublicacao}
				/>
			);
	}
}

function FormularioDaRevisao({
	revisao,
	alterada,
	frase,
	editar,
	salvar,
	pedirPublicacao,
}: {
	revisao: Aberta;
	alterada: boolean;
	frase: string;
	editar: ReturnType<typeof useRevisao>["editar"];
	salvar: () => Promise<void>;
	pedirPublicacao: () => void;
}) {
	const { arquivo, leituras, campos, erros, avisos, operacao } = revisao;
	const pe = useRef<HTMLDivElement>(null);
	const ocupada = operacao !== null;
	const pronta = prontaParaPublicar(oQueFalta(arquivo, leituras), alterada);
	const itens = arquivo.itens.map((item, indice) => ({
		item,
		posicao: indice + 1,
		leitura: leituras[indice],
	}));
	const votacoes = itens.filter(({ leitura }) => leitura.tipo === "votacao");
	const atos = itens.filter(({ leitura }) => leitura.tipo === "ato");
	const erroDaEdicao = erros.edicao;

	useLayoutEffect(() => {
		const rodape = pe.current;
		if (!rodape) {
			return;
		}
		const raiz = document.documentElement;
		const folha = rodape.closest("article");

		function mostrar(alvo: EventTarget | null) {
			if (
				!(alvo instanceof HTMLElement) ||
				!alvo.closest(".pagina-do-painel") ||
				alvo.closest("dialog") ||
				(alvo.tabIndex < 0 && !alvo.matches(".falta-no-campo, .frase-do-pe"))
			) {
				return;
			}
			const estilo = getComputedStyle(alvo);
			const anel =
				estilo.outlineStyle === "none"
					? 0
					: Math.max(
							0,
							Number.parseFloat(estilo.outlineWidth) +
								Number.parseFloat(estilo.outlineOffset),
						);
			const { top, bottom } = alvo.getBoundingClientRect();
			const limite =
				folha?.contains(alvo) &&
				!rodape.contains(alvo) &&
				getComputedStyle(rodape).position === "sticky"
					? Math.min(raiz.clientHeight, rodape.getBoundingClientRect().top)
					: raiz.clientHeight;
			if (top < anel) {
				window.scrollBy(0, Math.floor(top - anel));
			} else if (bottom + anel > limite) {
				window.scrollBy(0, Math.ceil(bottom + anel - limite));
			}
		}

		// A altura muda quando a frase quebra ou o estado muda. O Tab também pode
		// parar num campo que o navegador já considera visível, atrás do pé preso.
		function ajustar() {
			const { height } = rodape.getBoundingClientRect();
			raiz.style.setProperty("--altura-do-pe-da-revisao", `${height}px`);
			const ativo = document.activeElement;
			const caixa = ativo?.getBoundingClientRect();
			if (caixa && caixa.bottom > 0 && caixa.top < raiz.clientHeight) {
				mostrar(ativo);
			}
		}
		const aoFocar = (evento: FocusEvent) => mostrar(evento.target);
		const observador = new ResizeObserver(ajustar);
		observador.observe(rodape, { box: "border-box" });
		ajustar();
		document.addEventListener("focusin", aoFocar);
		window.addEventListener("resize", ajustar);
		return () => {
			observador.disconnect();
			raiz.style.removeProperty("--altura-do-pe-da-revisao");
			document.removeEventListener("focusin", aoFocar);
			window.removeEventListener("resize", ajustar);
		};
	}, []);

	function editarItem(posicao: number) {
		return (mudar: (campos: CamposDoItem) => CamposDoItem) =>
			editar((todos) => ({
				...todos,
				itens: todos.itens.map((item, indice) =>
					indice === posicao - 1 ? mudar(item) : item,
				),
			}));
	}

	const secao = (id: string, titulo: string, daSecao: typeof itens) =>
		daSecao.length > 0 && (
			<section aria-labelledby={id} className="secao-da-revisao">
				<h2 id={id} className="rotulo text-tinta-suave">
					{titulo}
				</h2>
				{daSecao.map(({ item, posicao, leitura }) => (
					<FichaDoItem
						key={item.id}
						posicao={posicao}
						item={item}
						leitura={leitura}
						campos={campos.itens[posicao - 1]}
						artigos={arquivo.artigos_disponiveis}
						avisos={avisos.itens.get(posicao) ?? []}
						erro={erros.itens.get(posicao)}
						ocupada={ocupada}
						editar={editarItem(posicao)}
					/>
				))}
			</section>
		);

	return (
		<>
			<FaixaDeInformacoes>
				<span>{formatarPeriodo(arquivo.inicio, arquivo.fim)}</span>
				<span>{plural(arquivo.itens.length, "item", "itens")}</span>
				<span>Rascunho</span>
			</FaixaDeInformacoes>
			<p className="lide">
				Confira cada item com o texto oficial, ajuste o texto e salve. Quando
				nada faltar, publique a edição.
			</p>
			<form
				className="revisao"
				noValidate
				onSubmit={(evento) => {
					evento.preventDefault();
					void salvar();
				}}
			>
				<section aria-labelledby="a-edicao" className="cabeca-da-revisao">
					<h2 id="a-edicao" className="rotulo text-tinta-suave">
						A edição
					</h2>
					<div className="campo-com-rotulo">
						<label htmlFor={ID_DO_TITULO_DA_EDICAO} className="rotulo">
							Título da edição
						</label>
						<input
							id={ID_DO_TITULO_DA_EDICAO}
							className="campo"
							value={campos.edicao.titulo}
							maxLength={180}
							readOnly={ocupada}
							aria-invalid={erroDaEdicao ? true : undefined}
							aria-describedby={
								erroDaEdicao ? ID_DA_FALTA_NA_EDICAO : undefined
							}
							onChange={(evento) => {
								const titulo = evento.currentTarget.value;
								editar((todos) => ({
									...todos,
									edicao: { ...todos.edicao, titulo },
								}));
							}}
						/>
						{erroDaEdicao && (
							<p
								id={ID_DA_FALTA_NA_EDICAO}
								tabIndex={-1}
								className="falta-no-campo"
							>
								{erroDaEdicao.mensagem}
							</p>
						)}
					</div>
					{avisos.edicao.length > 0 && (
						<ul className="avisos-do-item">
							{avisos.edicao.map((texto) => (
								<li key={texto}>
									<span className="rotulo">Aviso</span> {texto}
								</li>
							))}
						</ul>
					)}
					<div>
						<label className="marcar">
							<input
								type="checkbox"
								checked={campos.edicao.cobertura}
								disabled={ocupada}
								aria-describedby="cobertura-dica"
								onChange={(evento) => {
									const cobertura = evento.currentTarget.checked;
									editar((todos) => ({
										...todos,
										edicao: { ...todos.edicao, cobertura },
									}));
								}}
							/>
							<span>Confirmo a cobertura da semana</span>
						</label>
						<p id="cobertura-dica" className="dica-do-campo">
							Marque depois de conferir, nos resumos das coletas, que as
							votações e os atos da semana chegaram. Uma coleta que falhou deixa
							a edição incompleta.
						</p>
					</div>
				</section>
				<IndiceDaRevisao
					linhas={linhasDoIndice(revisao)}
					paraPublicar={paraPublicar(revisao, alterada)}
					onde="na-folha"
				/>
				{secao("congresso", "O que o Congresso votou", votacoes)}
				{secao("diario-oficial", "O que saiu no Diário Oficial", atos)}
				<div className="pe-da-revisao" ref={pe}>
					<p
						id={ID_DA_MENSAGEM_DO_PE}
						tabIndex={-1}
						className={classes(
							"frase-do-pe",
							(revisao.falha || revisao.nota) && "chama-atencao",
						)}
					>
						{frase}
					</p>
					<div className="acoes-do-pe">
						<button
							type="submit"
							className={BOTAO_CONTINUAR}
							aria-disabled={ocupada || undefined}
						>
							Salvar a revisão
						</button>
						<button
							type="button"
							className={classes(BOTAO_CONTINUAR, "vazado")}
							aria-disabled={!pronta || ocupada || undefined}
							aria-describedby={pronta ? undefined : ID_DA_MENSAGEM_DO_PE}
							onClick={() => {
								if (pronta && !ocupada) {
									pedirPublicacao();
								}
							}}
						>
							Publicar a edição
						</button>
					</div>
				</div>
			</form>
		</>
	);
}

/** O que falta para publicar, em palavras, a partir do que foi gravado. */
function oQueFaltaEmPalavras(revisao: Aberta): string {
	const frases = frasesDoQueFalta(oQueFalta(revisao.arquivo, revisao.leituras));
	return frases.length === 0
		? "A edição está pronta para publicar."
		: `Para publicar, falta ${emLista(frases)}.`;
}

/**
 * A frase do pé, pela ordem: o envio em andamento, a falha do último envio, o
 * aviso do rascunho que mudou, as alterações por salvar e, por fim, o que falta
 * para publicar, que começa por "Revisão salva." logo depois do salvar.
 */
function fraseDoPe(revisao: Aberta, alterada: boolean): string {
	if (revisao.operacao === "salvando") {
		return "Salvando a revisão…";
	}
	if (revisao.operacao === "publicando") {
		return "Publicando a edição…";
	}
	if (revisao.falha) {
		return revisao.falha;
	}
	if (revisao.nota) {
		return revisao.nota;
	}
	if (alterada) {
		return "Você tem alterações por salvar.";
	}
	return `${revisao.salva ? "Revisão salva. " : ""}${oQueFaltaEmPalavras(revisao)}`;
}

/** O fim do índice: o que falta para publicar, curto. */
function paraPublicar(revisao: Aberta, alterada: boolean): string {
	if (alterada) {
		return "salve as alterações.";
	}
	const frases = frasesDoQueFalta(oQueFalta(revisao.arquivo, revisao.leituras));
	return frases.length === 0 ? "nada falta." : `falta ${emLista(frases)}.`;
}

function linhasDoIndice(revisao: Aberta): LinhaDoIndice[] {
	return revisao.arquivo.itens
		.map((item, indice) => ({
			posicao: indice + 1,
			titulo: revisao.campos.itens[indice].titulo.trim() || "Item sem título",
			estado: estadoDoItem(
				item,
				revisao.campos.itens[indice],
				revisao.leituras[indice],
			),
			tipo: revisao.leituras[indice].tipo,
		}))
		.sort((a, b) =>
			a.tipo === b.tipo ? a.posicao - b.posicao : a.tipo === "votacao" ? -1 : 1,
		);
}
