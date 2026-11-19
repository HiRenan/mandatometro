import { Link, useRouter } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
	createContext,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	buscarIndiceDasEdicoes,
	buscarIndiceDoConteudo,
	type DocumentoPreparado,
	type PaginaNaBusca,
	type Pedaco,
	prepararIndice,
	procurar,
	type Resultado,
	termosDaBusca,
} from "@/lib/busca";
import { classes } from "@/lib/classes";
import { focarNoTitulo } from "@/lib/foco";
import {
	classeDaFita,
	diaEMes,
	formatarPeriodo,
	plural,
	posicaoDaSemana,
} from "@/lib/formatar";

// A busca do site (a #233): uma caixa por cima da página, aberta pelo Ctrl+K ou
// pela entrada do cabeçalho, que procura nas trilhas, nos artigos e nas edições
// publicadas, sem IA. Os índices vêm do servidor quando a busca abre, e a
// procura roda aqui, no navegador: o que a pessoa digita não sai da página, nem
// para o endereço, nem para o armazenamento, nem para o servidor.

type Indice = DocumentoPreparado<PaginaNaBusca>[];

/** Um índice pela visita: pedido uma vez, guardado na memória da página. */
type Carga =
	| { estado: "nada" }
	| { estado: "carregando" }
	| { estado: "pronto"; indice: Indice }
	| { estado: "erro" }
	| { estado: "sem-api" };

const NADA: Carga = { estado: "nada" };
const SEM_API: Carga = { estado: "sem-api" };

async function pedirConteudo(): Promise<Indice> {
	return prepararIndice(await buscarIndiceDoConteudo());
}

async function pedirEdicoes(): Promise<Indice | "sem-api"> {
	const indice = await buscarIndiceDasEdicoes();
	return indice.tipo === "sem-api" ? "sem-api" : prepararIndice(indice.paginas);
}

/**
 * Um índice e a função que o pede. Pedido de novo só depois de uma falha (o
 * "Tentar de novo"); sem `pedir`, como as edições sem a API, nada é pedido.
 */
function useIndice(pedir?: () => Promise<Indice | "sem-api">) {
	const [carga, setCarga] = useState<Carga>(pedir ? NADA : SEM_API);
	const atual = useRef(carga);
	atual.current = carga;
	const carregar = useCallback(() => {
		const { estado } = atual.current;
		if (!pedir || (estado !== "nada" && estado !== "erro")) {
			return;
		}
		atual.current = { estado: "carregando" };
		setCarga(atual.current);
		pedir().then(
			(indice) =>
				setCarga(indice === "sem-api" ? SEM_API : { estado: "pronto", indice }),
			() => setCarga({ estado: "erro" }),
		);
	}, [pedir]);
	return [carga, carregar] as const;
}

type ControleDaBusca = {
	/** Abre a caixa; com ela aberta, volta ao campo. */
	abrir: () => void;
	/** Pede os índices antes de a caixa abrir, quando o ponteiro ou o foco chega na entrada. */
	carregar: () => void;
};

const ContextoDaBusca = createContext<ControleDaBusca>({
	abrir: () => {},
	carregar: () => {},
});

/** A entrada do cabeçalho abre a caixa por aqui. */
export function useBusca(): ControleDaBusca {
	return useContext(ContextoDaBusca);
}

/** O atalho como o teclado da pessoa escreve: no Mac, o ⌘. */
function teclaDoAtalho(): string {
	return /mac|iphone|ipad/i.test(navigator.userAgent) ? "⌘ K" : "Ctrl K";
}

/**
 * A entrada da busca no cabeçalho, entre o nome e os links: a lupa, "Buscar no
 * site" e a tecla do atalho. O servidor escreve "Ctrl K", e o Mac troca por
 * "⌘ K" no mesmo espaço. Quando o ponteiro ou o foco chega nela, os índices já
 * vêm. Sem JavaScript, ela não abriria nada, e o CSS a esconde.
 */
export function EntradaDaBusca() {
	const { abrir, carregar } = useBusca();
	const [tecla, setTecla] = useState("Ctrl K");
	useEffect(() => {
		setTecla(teclaDoAtalho());
	}, []);

	return (
		<button
			type="button"
			className="entrada-da-busca"
			aria-haspopup="dialog"
			aria-keyshortcuts="Control+K Meta+K"
			onClick={abrir}
			onPointerEnter={carregar}
			onFocus={carregar}
		>
			<Search aria-hidden="true" />
			{/* O espaço fica fora do span: no jsdom, o nome do botão perde o espaço
			    do começo do texto de um elemento em linha ("Buscarno site"). */}
			<span>
				Buscar <span className="entrada-da-busca-resto">no site</span>
			</span>
			{/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: o <kbd> não recebe foco; a tecla chega ao leitor de tela pelo aria-keyshortcuts do botão. */}
			<kbd aria-hidden="true">{tecla}</kbd>
		</button>
	);
}

/**
 * A busca em todas as páginas (routes/__root.tsx): o atalho Ctrl+K ou ⌘K, os
 * índices e a caixa, que só entra na página na primeira vez que abre. O HTML que
 * o servidor manda não muda.
 */
export function ProvedorDaBusca({
	comEdicoes,
	children,
}: {
	/** O site tem a API: a busca procura também nas edições. */
	comEdicoes: boolean;
	children: ReactNode;
}) {
	const [conteudo, carregarConteudo] = useIndice(pedirConteudo);
	const [edicoes, carregarEdicoes] = useIndice(
		comEdicoes ? pedirEdicoes : undefined,
	);
	const [montada, setMontada] = useState(false);
	const [aberta, setAberta] = useState(false);
	// Cada pedido de abrir, também com a caixa aberta, leva o foco ao campo.
	const [pedidos, setPedidos] = useState(0);

	const carregar = useCallback(() => {
		carregarConteudo();
		carregarEdicoes();
	}, [carregarConteudo, carregarEdicoes]);

	const abrir = useCallback(() => {
		carregar();
		setMontada(true);
		setAberta(true);
		setPedidos((vezes) => vezes + 1);
	}, [carregar]);

	// O Ctrl+K e o ⌘K de qualquer página. Com Alt ou Shift, a tecla é de outro
	// atalho; no meio de uma composição (o teclado japonês, por exemplo), é do
	// texto. Com o foco na barra do navegador, a página nem recebe a tecla.
	useEffect(() => {
		function aoTeclar(evento: globalThis.KeyboardEvent) {
			if (
				evento.key.toLowerCase() !== "k" ||
				!(evento.ctrlKey || evento.metaKey) ||
				evento.altKey ||
				evento.shiftKey ||
				evento.isComposing
			) {
				return;
			}
			evento.preventDefault();
			abrir();
		}
		document.addEventListener("keydown", aoTeclar);
		return () => document.removeEventListener("keydown", aoTeclar);
	}, [abrir]);

	const controle = useMemo(() => ({ abrir, carregar }), [abrir, carregar]);

	return (
		<ContextoDaBusca.Provider value={controle}>
			{children}
			{montada && (
				<CaixaDaBusca
					aberta={aberta}
					pedidos={pedidos}
					aoFechar={() => setAberta(false)}
					comEdicoes={comEdicoes}
					conteudo={conteudo}
					edicoes={edicoes}
					tentarConteudo={carregarConteudo}
					tentarEdicoes={carregarEdicoes}
				/>
			)}
		</ContextoDaBusca.Provider>
	);
}

const DICA =
	"Escreva um assunto, como veto, emenda ou Senado. A busca procura nas trilhas, nos artigos e nas edições.";
const DICA_SEM_EDICOES =
	"Escreva um assunto, como veto, emenda ou Senado. A busca procura nas trilhas e nos artigos.";
const CARREGANDO = "Carregando a busca…";
const ERRO = "A busca não carregou. Confira a internet e tente de novo.";
const EDICOES_A_CAMINHO = "Procurando também nas edições…";
const ERRO_DAS_EDICOES =
	"As edições ficaram fora desta busca: o servidor não respondeu.";

/** Quanto o aviso ao leitor de tela espera a pessoa parar de digitar. */
const ESPERA_DO_AVISO = 400;

function nenhum(busca: string): string {
	return `Nenhum resultado para “${busca}”. Confira como a palavra está escrita ou tente só o começo dela.`;
}

function CaixaDaBusca({
	aberta,
	pedidos,
	aoFechar,
	comEdicoes,
	conteudo,
	edicoes,
	tentarConteudo,
	tentarEdicoes,
}: {
	aberta: boolean;
	pedidos: number;
	aoFechar: () => void;
	comEdicoes: boolean;
	conteudo: Carga;
	edicoes: Carga;
	tentarConteudo: () => void;
	tentarEdicoes: () => void;
}) {
	const router = useRouter();
	const id = useId();
	const dialogo = useRef<HTMLDialogElement>(null);
	const campo = useRef<HTMLInputElement>(null);
	const lista = useRef<HTMLOListElement>(null);
	const antes = useRef<Element | null>(null);
	// A busca fica na memória da página: a caixa reabre com ela.
	const [busca, setBusca] = useState("");

	useEffect(() => {
		const caixa = dialogo.current;
		if (aberta && caixa && !caixa.hasAttribute("open")) {
			antes.current = document.activeElement;
			caixa.showModal();
		} else if (!aberta && caixa?.hasAttribute("open")) {
			caixa.close();
		}
	}, [aberta]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: cada pedido de abrir leva o foco ao campo, também com a caixa aberta.
	useEffect(() => {
		if (aberta) {
			campo.current?.focus();
			campo.current?.select();
		}
	}, [aberta, pedidos]);

	function fechar() {
		dialogo.current?.close();
	}

	// O navegador devolve o foco a quem tinha quando a caixa fecha; aqui também,
	// para não depender dele.
	function aoFecharACaixa() {
		aoFechar();
		const anterior = antes.current;
		if (anterior instanceof HTMLElement && anterior.isConnected) {
			anterior.focus();
		}
	}

	/**
	 * A caixa fecha antes de o link seguir: a troca de página fotografa a página
	 * sem ela. Na página aberta, o link só desce até o trecho, e o foco vai com
	 * ele, como numa página nova (o FocoNaPaginaNova, no __root.tsx). Aí nada se
	 * desenha de novo, e o router avisa só que o endereço mudou (o onResolved).
	 */
	function aoSeguir(endereco: string) {
		fechar();
		const [caminho] = endereco.split("#");
		if (caminho === router.state.location.pathname) {
			const desligar = router.subscribe("onResolved", ({ toLocation }) => {
				desligar();
				focarNoTitulo(toLocation.hash);
			});
		}
	}

	// O "Tentar de novo" sai da tela com o aviso: o foco volta ao campo, e não à
	// página por trás da caixa.
	function tentarDeNovo(tentar: () => void) {
		tentar();
		campo.current?.focus();
	}

	function links(): HTMLAnchorElement[] {
		return Array.from(lista.current?.querySelectorAll("a") ?? []);
	}

	function aoTeclarNoCampo(evento: KeyboardEvent<HTMLInputElement>) {
		// No Chrome, o Esc num campo de busca também apaga o texto: aqui, ele só
		// fecha a caixa, e a busca volta quando ela reabre.
		if (evento.key === "Escape") {
			evento.preventDefault();
			fechar();
			return;
		}
		const [primeiro] = links();
		if (!primeiro) {
			return;
		}
		if (evento.key === "ArrowDown") {
			evento.preventDefault();
			primeiro.focus();
		} else if (evento.key === "Enter") {
			evento.preventDefault();
			primeiro.click();
		}
	}

	function aoTeclarNaLista(evento: KeyboardEvent<HTMLOListElement>) {
		if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") {
			return;
		}
		const todos = links();
		const posicao = todos.indexOf(evento.target as HTMLAnchorElement);
		if (posicao === -1) {
			return;
		}
		evento.preventDefault();
		if (evento.key === "ArrowDown") {
			todos[Math.min(posicao + 1, todos.length - 1)].focus();
		} else if (posicao === 0) {
			campo.current?.focus();
		} else {
			todos[posicao - 1].focus();
		}
	}

	const digitada = busca.trim();
	const comPalavras = termosDaBusca(busca).length > 0;
	const resultados = useMemo(() => {
		if (!comPalavras || conteudo.estado !== "pronto") {
			return [];
		}
		const indice =
			edicoes.estado === "pronto"
				? [...conteudo.indice, ...edicoes.indice]
				: conteudo.indice;
		return procurar(indice, busca);
	}, [busca, comPalavras, conteudo, edicoes]);

	const pronta = comPalavras && conteudo.estado === "pronto";
	const contagem = plural(resultados.length, "resultado", "resultados");

	// O aviso ao leitor de tela: a contagem, quando a pessoa para de digitar.
	let aviso = "";
	if (comPalavras && conteudo.estado === "erro") {
		aviso = ERRO;
	} else if (comPalavras && !pronta) {
		aviso = CARREGANDO;
	} else if (pronta) {
		if (resultados.length > 0) {
			aviso = `${contagem} para ${digitada}`;
		} else if (edicoes.estado === "carregando") {
			aviso = EDICOES_A_CAMINHO;
		} else {
			aviso = nenhum(digitada);
		}
		if (edicoes.estado === "erro") {
			// A frase do nenhum resultado já termina com o ponto.
			aviso += `${aviso.endsWith(".") ? "" : "."} ${ERRO_DAS_EDICOES}`;
		}
	}
	const [avisoNaTela, setAvisoNaTela] = useState("");
	useEffect(() => {
		const relogio = setTimeout(() => setAvisoNaTela(aviso), ESPERA_DO_AVISO);
		return () => clearTimeout(relogio);
	}, [aviso]);

	let corpo: ReactNode;
	if (!comPalavras) {
		corpo = (
			<p id={`${id}-dica`} className="busca-aviso prosa">
				{comEdicoes ? DICA : DICA_SEM_EDICOES}
			</p>
		);
	} else if (conteudo.estado === "erro") {
		corpo = (
			<div className="busca-aviso">
				<p className="prosa">{ERRO}</p>
				<button
					type="button"
					className="acao-de-texto"
					onClick={() => tentarDeNovo(tentarConteudo)}
				>
					Tentar de novo
				</button>
			</div>
		);
	} else if (!pronta) {
		corpo = <p className="busca-aviso rotulo busca-carregando">{CARREGANDO}</p>;
	} else if (resultados.length === 0 && edicoes.estado === "carregando") {
		// O nenhum resultado espera as edições: até elas chegarem, fica só o aviso
		// delas, embaixo.
		corpo = null;
	} else if (resultados.length === 0) {
		corpo = <p className="busca-aviso prosa">{nenhum(digitada)}</p>;
	} else {
		corpo = (
			<ol
				ref={lista}
				// biome-ignore lint/a11y/noRedundantRoles: sem o marcador da lista, o Safari tira a semântica de lista do <ol>, como em "Nesta trilha".
				role="list"
				className="busca-resultados"
				onKeyDown={aoTeclarNaLista}
			>
				{resultados.map((resultado) => (
					<ItemDoResultado
						key={resultado.documento.endereco}
						resultado={resultado}
						aoSeguir={aoSeguir}
					/>
				))}
			</ol>
		);
	}

	return (
		<dialog
			ref={dialogo}
			className="busca"
			aria-labelledby={`${id}-titulo`}
			onClose={aoFecharACaixa}
		>
			<div className="busca-cabeca">
				<h2 id={`${id}-titulo`} className="rotulo">
					Buscar no site
				</h2>
				<button type="button" className="acao-de-texto" onClick={fechar}>
					Fechar
				</button>
				<div className="busca-campo">
					<Search aria-hidden="true" className="busca-lupa" />
					<input
						ref={campo}
						type="search"
						className="campo"
						aria-labelledby={`${id}-titulo`}
						aria-describedby={comPalavras ? undefined : `${id}-dica`}
						enterKeyHint="search"
						autoComplete="off"
						spellCheck={false}
						value={busca}
						onChange={(evento) => setBusca(evento.target.value)}
						onKeyDown={aoTeclarNoCampo}
					/>
				</div>
				{pronta && resultados.length > 0 && (
					<p className="busca-contagem rotulo" aria-hidden="true">
						{contagem}
					</p>
				)}
			</div>
			<div className="busca-corpo">
				{corpo}
				{pronta && edicoes.estado === "carregando" && (
					<p className="busca-nota rotulo">{EDICOES_A_CAMINHO}</p>
				)}
				{pronta && edicoes.estado === "erro" && (
					<div className="busca-nota">
						<p className="prosa">{ERRO_DAS_EDICOES}</p>
						<button
							type="button"
							className="acao-de-texto"
							onClick={() => tentarDeNovo(tentarEdicoes)}
						>
							Tentar de novo
						</button>
					</div>
				)}
			</div>
			<p role="status" className="sr-only">
				{avisoNaTela}
			</p>
		</dialog>
	);
}

/** O número pequeno da linha e a posição da fita dele. */
function numeroDaPagina(pagina: PaginaNaBusca): {
	numero: string;
	fita: number;
} {
	if (pagina.tipo === "edicao") {
		return {
			numero: diaEMes(pagina.fim).dia,
			fita: posicaoDaSemana(pagina.fim),
		};
	}
	return { numero: String(pagina.posicao), fita: pagina.posicao };
}

/** O tipo da página, com o lugar dela no site. */
function tipoDaPagina(pagina: PaginaNaBusca): string {
	switch (pagina.tipo) {
		case "trilha":
			return "Trilha";
		case "artigo":
			return `Artigo ${pagina.posicao} · ${pagina.trilha}`;
		case "edicao":
			return `Edição · ${formatarPeriodo(pagina.inicio, pagina.fim)}`;
	}
}

/** O trecho com as palavras achadas em negrito. A chave é a posição no trecho. */
function TrechoAchado({ pedacos }: { pedacos: Pedaco[] }) {
	let posicao = 0;
	return pedacos.map((pedaco) => {
		const chave = posicao;
		posicao += pedaco.texto.length;
		return pedaco.achado ? (
			<mark key={chave}>{pedaco.texto}</mark>
		) : (
			<span key={chave}>{pedaco.texto}</span>
		);
	});
}

/**
 * Um resultado: o número na fita da posição, o título, que é o link e cobre a
 * linha, o tipo e o trecho. O foco que anda pelas setas só lê o link: o tipo e o
 * trecho vão na descrição dele.
 */
function ItemDoResultado({
	resultado,
	aoSeguir,
}: {
	resultado: Resultado<PaginaNaBusca>;
	aoSeguir: (endereco: string) => void;
}) {
	const id = useId();
	const { documento, endereco, secao, trecho } = resultado;
	const { numero, fita } = numeroDaPagina(documento);
	return (
		<li className={classes("busca-resultado", classeDaFita(fita))}>
			<span aria-hidden="true" className="numeral">
				{numero}
			</span>
			<div className="busca-resultado-texto">
				<Link
					href={endereco}
					className="busca-resultado-titulo"
					aria-describedby={`${id}-tipo ${id}-trecho`}
					onClick={() => aoSeguir(endereco)}
				>
					{documento.titulo}
				</Link>
				<p id={`${id}-tipo`} className="busca-resultado-tipo rotulo">
					{tipoDaPagina(documento)}
				</p>
				<p id={`${id}-trecho`} className="busca-resultado-trecho">
					{secao && (
						<>
							<span className="busca-resultado-secao">{secao}</span>
							{" — "}
						</>
					)}
					<TrechoAchado pedacos={trecho} />
				</p>
			</div>
		</li>
	);
}
