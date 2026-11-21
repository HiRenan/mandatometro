import { Link, ScriptOnce, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
	CHAVE_SESSAO,
	contextoDoProgresso,
	useContextoDoProgresso,
} from "@/lib/progresso";
import { EntradaDaBusca } from "./busca";
import { NOME_DO_SITE } from "./nome-do-site";

const LINKS = [
	{ to: "/", label: "Início" },
	{ to: "/trilhas", label: "Trilhas" },
	{ to: "/jogos", label: "Jogos" },
] as const;

/** As edições da newsletter, que só aparecem onde o site tem a API. */
const EDICOES = { to: "/edicoes", label: "Edições" } as const;

type Links = ReadonlyArray<(typeof LINKS)[number] | typeof EDICOES>;

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
	return secao === "/"
		? caminho === "/"
		: caminho === secao || caminho.startsWith(`${secao}/`);
}

/**
 * Os links das seções. O cabeçalho tem duas listas iguais, com o mesmo nome, e
 * o CSS mostra uma de cada vez: a do meio no computador e a de baixo no celular.
 * Assim, o Tab e o leitor de tela seguem a ordem da tela nas duas larguras: no
 * computador, o nome, os links, a busca e a conta; no celular, o nome, a busca,
 * a conta e os links. Com uma lista só, uma das ordens ficaria trocada.
 */
function LinksDoTopo({
	lugar,
	links,
	caminho,
	comEdicoes,
}: {
	lugar: "meio" | "baixo";
	links: Links;
	caminho: string;
	comEdicoes: boolean;
}) {
	return (
		<nav
			aria-label="Principal"
			className={lugar === "meio" ? "topo-nav-meio" : "topo-nav-baixo"}
		>
			<ul className="topo-links" data-com-edicoes={comEdicoes ? "" : undefined}>
				{links.map(({ to, label }) => (
					<li key={to}>
						{/* O traço marca a seção inteira (data-na-secao), mas o link só
						    diz que é a página atual (aria-current) na página dele: por
						    isso o exact. */}
						<Link
							to={to}
							activeOptions={{ exact: true }}
							data-na-secao={estaNaSecao(caminho, to) ? "" : undefined}
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
 * O cabeçalho: o bloco de tinta com o nome, os links, a busca e a conta, e a
 * tira das cinco fitas embaixo, que o separa da página clara (o Renan, na #89:
 * "um header bem feito").
 *
 * O Renan reorganizou o cabeçalho na #261, em 20/11/2026 ("as opções para o
 * centro"): no computador, uma linha, com o nome à esquerda, os links no meio
 * exato da tela e a busca e a conta à direita; a partir de 1312 px, o lema fica
 * embaixo do nome. Abaixo de 992 px, duas linhas: o nome, a busca e a conta em
 * cima, e os links embaixo, no meio. A busca mostra o que cabe no lugar dela
 * (components/busca.tsx).
 *
 * Onde o site tem a API (o API_URL), as edições entram nos links. No celular, o
 * Início sai (o CSS), e o nome leva ao início (o Renan, na #39). Com a letra
 * grande no celular, os links ficam um embaixo do outro.
 *
 * A palavra da conta vem da marca do <html>: o roteiro do <head> (MarcaDaConta)
 * a põe antes da primeira pintura, e este cabeçalho a mantém em dia quando a
 * sessão do progresso muda, na saída, na exclusão, no 401 da sincronização ou
 * em outra aba. Sem JavaScript ou sem a API, fica "Entrar".
 */
export default function Header({
	comEdicoes = false,
}: {
	/** Se o site tem o endereço da API e, com ele, as páginas das edições. */
	comEdicoes?: boolean;
}) {
	const caminho = useRouterState({
		select: (estado) => estado.location.pathname,
	});
	const links: Links = comEdicoes ? [...LINKS, EDICOES] : LINKS;
	const { sessao } = useContextoDoProgresso();
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
					<Link to="/" className={NOME_DO_SITE}>
						Mandatômetro
					</Link>
					<p className="marca-lema">o diário oficial político, simplificado</p>
				</div>
				<LinksDoTopo
					lugar="meio"
					links={links}
					caminho={caminho}
					comEdicoes={comEdicoes}
				/>
				<div className="topo-ferramentas">
					<EntradaDaBusca />
					<EntradaDaConta caminho={caminho} />
				</div>
				<LinksDoTopo
					lugar="baixo"
					links={links}
					caminho={caminho}
					comEdicoes={comEdicoes}
				/>
			</div>
			<div aria-hidden="true" className="tira-de-fitas h-[6px]" />
		</header>
	);
}
