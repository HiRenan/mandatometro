import {
	Link,
	ScriptOnce,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import { ArrowRight, MenuIcon, XIcon } from "lucide-react";
import {
	type CSSProperties,
	type KeyboardEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { classeDaFita } from "@/lib/formatar";
import { LEMA_DO_SITE } from "@/lib/meta";
import {
	CHAVE_SESSAO,
	contextoDoProgresso,
	useContextoDoProgresso,
} from "@/lib/progresso";
import { EntradaDaBusca } from "./busca";
import { NOME_DO_SITE } from "./nome-do-site";

/**
 * Os links das seções. Cada um fica marcado com o traço nas seções dele: o
 * Parlamentares, também nas votações, que se abrem pela página de cada pessoa.
 * Os parlamentares e as edições só aparecem onde o site tem a API.
 */
const LINKS = [
	{ to: "/trilhas", label: "Trilhas", secoes: ["/trilhas"], soComApi: false },
	{
		to: "/parlamentares",
		label: "Parlamentares",
		secoes: ["/parlamentares", "/votacoes"],
		soComApi: true,
	},
	{ to: "/jogos", label: "Jogos", secoes: ["/jogos"], soComApi: false },
	{ to: "/edicoes", label: "Edições", secoes: ["/edicoes"], soComApi: true },
] as const;

type Links = ReadonlyArray<(typeof LINKS)[number]>;

/** A marca do <html> que troca "Entrar" por "Conta" (index.css). */
const CONTA_ABERTA = "data-conta-aberta";

/**
 * O roteiro do <head>, onde o site tem a API: antes da primeira pintura, ele lê
 * a chave que o login grava neste navegador (lib/progresso.ts) e marca o <html>.
 * A chave é um código sorteado, sem dado da conta, e nenhum pedido sai daqui.
 */
export const ROTEIRO_DA_CONTA = `try{if(localStorage.getItem(${JSON.stringify(CHAVE_SESSAO)}))document.documentElement.setAttribute(${JSON.stringify(CONTA_ABERTA)},"")}catch(e){}`;

/**
 * O roteiro da conta, no <head> do servidor (o ScriptOnce): ele se apaga depois
 * de rodar, e o navegador não o renderiza de novo na hidratação.
 */
export function MarcaDaConta() {
	return <ScriptOnce>{ROTEIRO_DA_CONTA}</ScriptOnce>;
}

function estaNaSecao(caminho: string, secao: string): boolean {
	return caminho === secao || caminho.startsWith(`${secao}/`);
}

/** A marca do traço: o link fica marcado em todas as páginas da seção dele. */
function marcaDaSecao(
	caminho: string,
	secoes: ReadonlyArray<string>,
): "" | undefined {
	return secoes.some((secao) => estaNaSecao(caminho, secao)) ? "" : undefined;
}

/**
 * Os links das seções. O cabeçalho tem três listas iguais, com o mesmo nome, e
 * o CSS mostra uma de cada vez: a do meio no computador, a de baixo no tablet e
 * a do menu no celular. Assim, o Tab e o leitor de tela seguem a ordem da tela
 * em cada largura: no computador, o nome, os links, a busca e a conta; no
 * tablet, o nome, a busca, a conta e os links; no celular, o nome e o menu.
 * Com uma lista só, a ordem ficaria trocada em alguma largura.
 */
function LinksDoTopo({
	lugar,
	links,
	caminho,
}: {
	lugar: "meio" | "baixo";
	links: Links;
	caminho: string;
}) {
	return (
		<nav
			aria-label="Principal"
			className={lugar === "meio" ? "topo-nav-meio" : "topo-nav-baixo"}
		>
			<ul className="topo-links">
				{links.map(({ to, label, secoes }) => (
					<li key={to}>
						{/* O traço marca a seção inteira (data-na-secao), mas o link só
						    diz que é a página atual (aria-current) na página dele, sem
						    filtro no endereço: por isso o exact. */}
						<Link
							to={to}
							activeOptions={{ exact: true }}
							data-na-secao={marcaDaSecao(caminho, secoes)}
						>
							{label}
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
}

/**
 * A entrada da conta: "Entrar" para quem não entrou e "Conta" para quem entrou
 * (o Renan, na #261, em 20/11/2026). Os dois links ficam no HTML, na mesma
 * célula, e o CSS esconde um deles pela marca do <html>: a célula tem a largura
 * do maior, e nada pula quando a marca chega. São links comuns (<a>), como era o
 * "Conta": o perfil e o login carregam a página do zero.
 */
function EntradaDaConta({ caminho }: { caminho: string }) {
	const naConta = estaNaSecao(caminho, "/cadastro") || caminho === "/login";

	return (
		<div className="entrada-da-conta">
			<a
				href="/login"
				data-para="quem-nao-entrou"
				data-na-secao={naConta ? "" : undefined}
				aria-current={caminho === "/login" ? "page" : undefined}
			>
				Entrar
			</a>
			<a
				href="/perfil"
				data-para="quem-entrou"
				data-na-secao={naConta || caminho === "/perfil" ? "" : undefined}
				aria-current={caminho === "/perfil" ? "page" : undefined}
			>
				Conta
			</a>
		</div>
	);
}

/**
 * O menu do celular (o Renan escolheu a "A · Menu" na #362, em 26/11/2026). Abaixo
 * de 48rem, o cabeçalho é uma linha só, com o nome e o botão "Menu", que abre um
 * painel dentro do bloco de tinta. O painel empurra a página e não cobre nada.
 * Ele mostra os destinos em letra de cartaz, cada um com o azulejinho da fita da
 * posição, e, embaixo, a busca e a conta. É um <details> do próprio navegador:
 * ele abre e fecha sem JavaScript e antes da hidratação, e o leitor de tela diz
 * se está aberto. O React só acrescenta o que o <details> não faz: o Esc fecha
 * e devolve o foco ao botão, e qualquer troca de página fecha o menu.
 */
function MenuDoCelular({ links, caminho }: { links: Links; caminho: string }) {
	const router = useRouter();
	const menu = useRef<HTMLDetailsElement>(null);

	// O menu fecha antes de a troca de página fotografar a tela: num destino do
	// menu, também o da página aberta, num resultado da busca e no voltar do
	// navegador. O menu aberto antes da hidratação continua aberto.
	useEffect(
		() =>
			router.subscribe("onBeforeNavigate", () => {
				if (menu.current) menu.current.open = false;
			}),
		[router],
	);

	function aoTeclar(evento: KeyboardEvent<HTMLDetailsElement>) {
		const detalhes = menu.current;
		if (evento.key !== "Escape" || !detalhes?.open) return;
		detalhes.open = false;
		detalhes.querySelector("summary")?.focus();
	}

	return (
		<nav aria-label="Principal" className="menu-do-celular">
			<details ref={menu} onKeyDown={aoTeclar}>
				<summary className="menu-do-celular-botao">
					Menu
					<MenuIcon aria-hidden="true" className="menu-do-celular-abrir" />
					<XIcon aria-hidden="true" className="menu-do-celular-fechar" />
				</summary>
				<div className="menu-do-celular-painel">
					<ul className="menu-do-celular-lista">
						{links.map(({ to, label, secoes }, vez) => (
							<li
								key={to}
								className={classeDaFita(vez + 1)}
								style={{ "--i": vez } as CSSProperties}
							>
								<Link
									to={to}
									activeOptions={{ exact: true }}
									data-na-secao={marcaDaSecao(caminho, secoes)}
								>
									<span className="menu-do-celular-texto">{label}</span>
									<ArrowRight
										aria-hidden="true"
										className="menu-do-celular-seta"
									/>
								</Link>
							</li>
						))}
					</ul>
					<div className="menu-do-celular-util">
						<EntradaDaBusca />
						<EntradaDaConta caminho={caminho} />
					</div>
				</div>
			</details>
		</nav>
	);
}

/**
 * O cabeçalho: o bloco de tinta com o nome, os links, a busca e a conta, e a
 * tira das cinco fitas embaixo, que o separa da página clara (o Renan, na #89:
 * "um header bem feito").
 *
 * O Renan reorganizou o cabeçalho na #261, em 20/11/2026 ("as opções para o
 * centro"). A partir de 62rem (992 px com a letra a 100%), há uma linha com o
 * nome à esquerda, os links no centro da grade e a busca e a conta à direita.
 * O centro da grade é o da área da página sem a barra de rolagem vertical.
 * A partir de 84rem (1344 px com a letra a 100%), o lema fica embaixo do nome.
 * De 48 a 62rem, os links ficam centrados numa parte própria embaixo. Abaixo de
 * 48rem, no celular, ficam o nome e o botão "Menu" (o MenuDoCelular, da #362).
 * A busca mostra o que cabe no lugar dela (components/busca.tsx).
 *
 * Onde o site tem a API (o API_URL), os parlamentares e as edições entram nos
 * links. O Início saiu na #305, em 23/11/2026: o nome leva ao início (o Renan,
 * na #39).
 *
 * A palavra da conta vem da marca do <html>. O roteiro do <head> (MarcaDaConta)
 * a põe antes da primeira pintura. Nas páginas que continuam abertas, o
 * cabeçalho acompanha a sessão na exclusão, no 401 da sincronização e na
 * saída em outra aba. O "Sair" do perfil abre o /login num documento novo
 * com "Entrar" (a #258). Sem JavaScript ou sem a API, fica "Entrar".
 */
export default function Header({
	comApi = false,
}: {
	/**
	 * Se o site tem o endereço da API e, com ele, as páginas dos parlamentares e
	 * das edições.
	 */
	comApi?: boolean;
}) {
	const caminho = useRouterState({
		select: (estado) => estado.location.pathname,
	});
	const links: Links = comApi ? LINKS : LINKS.filter((link) => !link.soComApi);
	const { sessao } = useContextoDoProgresso();
	const [archivoCarregada, setArchivoCarregada] = useState(false);
	useEffect(() => {
		// O M usa a Archivo latina já pedida no <head>. Os enfeites só cabem nela.
		void document.fonts?.load('900 1em "Archivo Variable"', "M").then(
			(fontes) => {
				if (fontes.length > 0) setArchivoCarregada(true);
			},
			() => {
				// Se a carga falhar, fica o M inteiro da fonte de reserva.
			},
		);
	}, []);

	useEffect(() => {
		// Na hidratação, o hook ainda dá o retrato de visitante: aí a leitura vai
		// direto à chave, e a marca que o roteiro do <head> pôs não pisca.
		const aberta = (sessao ?? contextoDoProgresso().sessao) !== null;
		document.documentElement.toggleAttribute(CONTA_ABERTA, aberta);
	}, [sessao]);

	return (
		<header className="moldura">
			<a
				href="#conteudo"
				className="bg-papel text-tinta sr-only font-bold focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10 focus:px-4 focus:py-2"
			>
				Pular para o conteúdo
			</a>
			{/* No celular, as margens e o respiro ficam em px: com a letra grande, eles
			    não crescem, e o nome e os links ganham o espaço (o Renan, na #48:
			    "Ficam em 20 px" e "Espaço de hoje"). */}
			<div className="topo-dentro px-margem-celular md:px-margem-larga gap-y-[4px] py-[8px]">
				<div className="marca">
					<Link to="/" aria-label="Mandatômetro" className={NOME_DO_SITE}>
						{/* O M é a letra da fonte. A dobra e as fitas do livro vêm do
						    CSS (.marca-inicial): o livro como inicial fazia ler
						    "ANDATÔMETRO" (a #357). */}
						<span className="marca-palavra">
							<span
								className="marca-inicial"
								data-archivo-carregada={archivoCarregada ? "" : undefined}
							>
								M
							</span>
							andatômetro
						</span>
					</Link>
					<p className="marca-lema">{LEMA_DO_SITE}</p>
				</div>
				<LinksDoTopo lugar="meio" links={links} caminho={caminho} />
				<div className="topo-ferramentas">
					<EntradaDaBusca />
					<EntradaDaConta caminho={caminho} />
				</div>
				<LinksDoTopo lugar="baixo" links={links} caminho={caminho} />
				<MenuDoCelular links={links} caminho={caminho} />
			</div>
			<div aria-hidden="true" className="tira-de-fitas h-[6px]" />
		</header>
	);
}
