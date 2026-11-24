// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
	type CSSProperties,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import { sairConta } from "@/client";
import { AcaoDeTexto, LinkDeAcao } from "@/components/acao-de-texto";
import { AzulejoGrande, Painel } from "@/components/azulejo";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "@/components/botao-continuar";
import { LugarDoBotao } from "@/components/lugar-do-botao";
import { MarcaDeLido } from "@/components/marca-de-lido";
import { Reservas } from "@/components/reservas";
import { ENV } from "@/env";
import { azulejoDaPosicao, sementeDe } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { buscarTrilhas, type TrilhaNaLista } from "@/lib/conteudo";
import { tetoDoTitulo } from "@/lib/conteudo/regua";
import { movimentoReduzido } from "@/lib/painel-vivo";
import {
	fraseDaLeitura,
	fraseDaTrilha,
	linhasDaSaudacao,
	ondeContinuar,
	primeiroNome,
	TETO_DA_CAIXA,
	tetoDaSaudacao,
} from "@/lib/perfil";
import {
	contarLidos,
	encerrarProgressoNaConta,
	idDoArtigo,
	useArtigosLidos,
	useCopiaDaConta,
} from "@/lib/progresso";
import { simboloDaTrilha } from "@/lib/simbolos";
import { usePerfil } from "@/lib/use-perfil";

export const Route = createFileRoute("/perfil")({
	loader: () => buscarTrilhas(),
	head: () => ({
		meta: [
			{ title: "Meu perfil · Mandatômetro" },
			{ name: "robots", content: "noindex" },
		],
	}),
	headers: () => ({ "Cache-Control": "no-store" }),
	component: Perfil,
});

// As frases do alto do perfil: a abertura e os dois erros que ficam no lugar
// dela, a espera da conta e o aviso de quem abre a página sem JavaScript.
const ABERTURA =
	"A sua conta guarda os artigos que você leu. Comece uma trilha no celular e continue no computador, de onde parou.";
const SEM_RESPOSTA =
	"Não conseguimos abrir a sua conta agora. Confira a internet ou espere um pouco e tente de novo.";
const SEM_API = "A conta ainda não funciona neste endereço do site.";
const VERIFICANDO = "Verificando sua sessão…";
const SEM_SCRIPT = "O perfil precisa do JavaScript do navegador ligado.";
const ERRO_AO_SAIR =
	"Não deu para sair. Confira a internet ou espere um pouco e tente de novo.";

// Os textos do botão, como na trilha: o de quem ainda não leu nada, o do artigo
// em que a pessoa parou e o de quem leu todos.
const COMECAR = "Começar pelo primeiro artigo";
const continuarEm = (titulo: string) => `Continuar de onde parou: ${titulo}`;
const VER_AS_TRILHAS = "Ver as trilhas";

/** Antes de a leitura da conta chegar, nenhum artigo conta como lido. */
const NENHUM: ReadonlySet<string> = new Set();

/**
 * O texto do botão e a seta. O espaço antes da seta: com a letra grande, quando
 * ela desce sozinha, começa alinhada com o texto (o SETA_DO_BOTAO).
 */
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
 * O perfil da conta (DESIGN.md, "Perfil da conta"): o cartaz com a saudação, a
 * leitura em palavras e o botão de continuar; o quadro da leitura, com um
 * azulejo por artigo, cru até a pessoa ler; e a conta, com o que ela guarda e
 * as ações. O nome e o papel vêm do GET /contas/me, e os lidos, do espelho da
 * conta no navegador, que a moldura sincroniza com a API. O que chega depois
 * do HTML do servidor tem o lugar guardado, com o limite da linha do nome que
 * o DESIGN.md descreve.
 */
function Perfil() {
	const trilhas = Route.useLoaderData();
	const sessao = usePerfil("perfil");
	const copia = useCopiaDaConta();
	const doNavegador = useArtigosLidos();
	const [saida, setSaida] = useState<"pronta" | "enviando" | "falhou">(
		"pronta",
	);
	const semApi = !ENV.API_URL;
	const aberta = sessao.estado === "autenticada";
	const encerrada = sessao.estado === "encerrada";
	// Os lidos contam depois que a conta responde e a leitura dela chega a este
	// navegador. Antes, quem não entrou veria as marcas deste navegador piscarem
	// no caminho para o /login, e o navegador sem a cópia da conta diria que a
	// pessoa não leu nada.
	const lida = aberta && copia === "lida";
	// Se a primeira leitura falha, a página não inventa o progresso.
	const indisponivel =
		!semApi &&
		(sessao.estado === "indisponivel" || (aberta && copia === "falhou"));
	// Sem a API, não há conta a esperar: a página já nasce com a frase dela.
	const verificando =
		!semApi &&
		(encerrada ||
			sessao.estado === "verificando" ||
			(aberta && copia === "esperando"));
	const lidos = lida ? doNavegador : NENHUM;
	const primeiro = aberta ? primeiroNome(sessao.nome) : "";
	const linhas = linhasDaSaudacao(primeiro);

	const artigos = trilhas.flatMap((trilha) => trilha.artigos);
	const total = artigos.length;
	const quantosLidos = contarLidos(artigos, lidos);
	const proximo = ondeContinuar(trilhas, lidos);
	const textosDoBotao = [
		COMECAR,
		...artigos.map((artigo) => continuarEm(artigo.titulo)),
		VER_AS_TRILHAS,
	];
	const frasesDoProgresso = [
		VERIFICANDO,
		fraseDaLeitura(0, total),
		fraseDaLeitura(total - 1, total),
		fraseDaLeitura(total, total),
	];
	const abertura = semApi ? SEM_API : indisponivel ? SEM_RESPOSTA : ABERTURA;
	const progresso = lida
		? fraseDaLeitura(quantosLidos, total)
		: verificando
			? VERIFICANDO
			: "";
	// O mesmo --palavra para os títulos de todas as trilhas: o da palavra mais
	// larga entre eles. Assim, os títulos têm a mesma letra. O --mais é o número
	// de artigos da trilha mais comprida: a partir de 62rem, a coluna dos
	// azulejos tem a largura dela, e os azulejos de todas as trilhas começam
	// na mesma linha vertical.
	const tetoDosTitulos = Math.max(
		...trilhas.map((trilha) =>
			tetoDoTitulo(trilha.titulo, "titulo-condensado"),
		),
	);
	const maisArtigos = Math.max(
		...trilhas.map((trilha) => trilha.artigos.length),
	);

	async function sair() {
		if (saida === "enviando") return;
		setSaida("enviando");
		try {
			const { response } = await sairConta({
				credentials: "include",
				signal: AbortSignal.timeout(15000),
			});
			if (response?.ok) {
				encerrarProgressoNaConta();
				window.location.replace("/login");
				return;
			}
			setSaida("falhou");
		} catch {
			setSaida("falhou");
		}
	}

	return (
		<>
			<section className="cartaz cartaz-medio perfil-cartaz">
				<Painel
					semente={sementeDe("perfil")}
					colunas={4}
					quantas={64}
					className="mural"
					sozinho
				/>
				{/* O nome da página fica no alto, onde as outras páginas põem a migalha. */}
				<h1 className="perfil-nome rotulo">Meu perfil</h1>
				{/* A saudação, na letra do título: "OLÁ!" no HTML do servidor e, com a
				    conta, "OLÁ," e o primeiro nome, cada um numa linha. A caixa guarda
				    as duas linhas na letra maior, e um nome comprido só diminui a letra:
				    o fio do pé não se mexe quando o nome chega. O nome tomba no lugar.
				    A entrelinha é a da leitura (o titulo-de-folha), que aceita qualquer
				    texto: com a do cartaz, a vírgula do "OLÁ," encostava no acento de
				    um nome como "JOSÉ", na linha de baixo. */}
				<div
					className="saudacao"
					style={
						{ "--palavra-da-caixa": String(TETO_DA_CAIXA) } as CSSProperties
					}
				>
					<p
						className="titulo-de-folha letra-com-teto"
						style={
							{
								"--palavra": String(tetoDaSaudacao(primeiro)),
							} as CSSProperties
						}
					>
						<span className="sr-only">{linhas.join(" ")}</span>
						<span aria-hidden="true" className="caixa">
							{linhas.map((linha, vez) => (
								<span
									// biome-ignore lint/suspicious/noArrayIndexKey: a primeira linha continua a mesma quando o nome chega ("Olá!" vira "Olá,"), e só a segunda entra tombando.
									key={vez}
									className="palavra"
									style={{ "--i": vez } as CSSProperties}
								>
									{linha}
								</span>
							))}
						</span>
					</p>
				</div>
				<div className="cartaz-pe">
					{/* O erro fica no lugar da abertura, em negrito, como na página de
					    sair da newsletter: a abertura guarda as frases, cada uma com o
					    desenho dela, e o erro entra sem mexer no resto do pé. */}
					<div className="abertura grid text-pretty">
						<Reservas frases={[ABERTURA, SEM_API]} />
						<Reservas frases={[SEM_RESPOSTA]} className="ainda-nao" />
						<p
							className={classes(
								"col-start-1 row-start-1",
								indisponivel && "ainda-nao",
							)}
						>
							{abertura}
						</p>
					</div>
					<div className="cartaz-acao">
						{/* Sem JavaScript, a conta não responde: a linha da espera sai, e o
						    aviso fica no lugar do botão. */}
						<div className="perfil-progresso text-pretty">
							<Reservas
								frases={frasesDoProgresso}
								className="progresso rotulo"
							/>
							<p
								role="status"
								className="progresso rotulo col-start-1 row-start-1"
							>
								{progresso}
							</p>
						</div>
						<LugarDoBotao textos={textosDoBotao}>
							{/* Sem a API, o botão já leva às trilhas, e a abertura explica. */}
							{!semApi && (
								<noscript>
									<p className="ainda-nao">{SEM_SCRIPT}</p>
								</noscript>
							)}
							{lida ? (
								proximo ? (
									<Link
										to="/trilhas/$trilha/$artigo"
										params={{ trilha: proximo.trilha, artigo: proximo.slug }}
										className={BOTAO_CONTINUAR}
									>
										<ComSeta>
											{quantosLidos > 0 ? continuarEm(proximo.titulo) : COMECAR}
										</ComSeta>
									</Link>
								) : (
									<Link to="/trilhas" className={BOTAO_CONTINUAR}>
										<ComSeta>{VER_AS_TRILHAS}</ComSeta>
									</Link>
								)
							) : semApi ? (
								<Link to="/trilhas" className={BOTAO_CONTINUAR}>
									<ComSeta>{VER_AS_TRILHAS}</ComSeta>
								</Link>
							) : indisponivel ? (
								<AcaoDeTexto href="/perfil" texto="Tentar de novo" />
							) : null}
						</LugarDoBotao>
					</div>
				</div>
			</section>

			<div className="perfil-corpo">
				<section aria-labelledby="sua-leitura" className="perfil-leitura">
					<h2
						id="sua-leitura"
						className="subtitulo-condensado letra-com-teto perfil-titulo [--palavra:3.46]"
					>
						Sua leitura
					</h2>
					<p className="perfil-legenda">
						Cada azulejo é um artigo da trilha. Com cor e o visto, você já leu.
					</p>
					<ol
						role="list"
						className="perfil-trilhas"
						style={
							{
								"--palavra": String(tetoDosTitulos),
								"--mais": String(maisArtigos),
							} as CSSProperties
						}
					>
						{trilhas.map((trilha, indice) => (
							<TrilhaNoPerfil
								key={trilha.slug}
								trilha={trilha}
								posicao={indice + 1}
								lidos={lidos}
								lida={lida}
								encerrada={encerrada}
							/>
						))}
					</ol>
				</section>

				<section aria-labelledby="sua-conta" className="perfil-conta">
					<h2
						id="sua-conta"
						className="subtitulo-condensado letra-com-teto perfil-titulo [--palavra:2.82]"
					>
						Sua conta
					</h2>
					<div className="perfil-conta-dados">
						{/* A linha do nome guarda uma linha (duas abaixo de 40rem): quando a
						    conta responde, o texto de baixo fica no lugar, a não ser que o
						    nome ocupe mais linhas do que isso (DESIGN.md). */}
						<p className="perfil-quem">
							{aberta ? `Você entrou como ${sessao.nome}.` : ""}
						</p>
						<p className="perfil-texto">
							A conta guarda o seu nome, o seu e-mail, um código da sua senha
							(nunca a senha), os dados opcionais que você escolheu dar e os
							artigos que você leu. As respostas dos quizzes ficam só neste
							navegador, e a newsletter é uma inscrição à parte.
						</p>
						<p>
							<LinkDeAcao
								to="/termo"
								hash="o-que-guarda"
								texto="Ler o termo da conta"
							/>
						</p>
						<p className="perfil-texto">
							Para ver ou corrigir um dado, escreva para{" "}
							<a href="mailto:contato@mandatometro.com.br">
								contato@mandatometro.com.br
							</a>
							.
						</p>
					</div>
					<div className="perfil-conta-acoes">
						<p>
							<AcaoDeTexto href="/cadastro/recuperar" texto="Trocar a senha" />
						</p>
						<p className="perfil-nota">
							Você recebe no e-mail um link para criar a senha nova. Depois,
							entre de novo em cada aparelho.
						</p>
						<div className="cartaz-acoes perfil-acoes">
							{/* Sem JavaScript e sem a API, o "Sair" não teria como sair. */}
							{!semApi && (
								<button
									type="button"
									className="acao-de-texto perfil-sair"
									aria-disabled={saida === "enviando" || undefined}
									onClick={sair}
								>
									Sair
								</button>
							)}
							<AcaoDeTexto href="/cadastro/excluir" texto="Excluir conta" />
						</div>
						{saida === "falhou" && (
							<p role="alert" className="ainda-nao">
								{ERRO_AO_SAIR}
							</p>
						)}
						{/* A revisão da edição da semana e os números do site, só para a
						    administradora. Ficam no fim, sem lugar guardado, como as
						    linhas do piloto: o lugar deixaria um vão no perfil de todas as
						    outras contas. */}
						{aberta && sessao.papel === "administradora" && (
							<>
								<p>
									<LinkDeAcao to="/painel" texto="Revisar a edição da semana" />
								</p>
								<p>
									<LinkDeAcao
										to="/painel/numeros"
										texto="Ver os números do site"
									/>
								</p>
							</>
						)}
					</div>
				</section>
			</div>
		</>
	);
}

/**
 * Uma trilha no quadro da leitura: o azulejo dela, com o símbolo; o título, que
 * leva à trilha; a frase do progresso, com o lugar guardado; e um azulejo por
 * artigo, na fita da posição dele. O azulejo fica cru até a pessoa ler o
 * artigo. Os lidos viram em onda quando a leitura da conta chega e a fileira
 * já está na tela, e o visto é desenhado no canto quando o azulejo termina de
 * virar. Com o movimento reduzido, os dois trocam de uma vez.
 */
function TrilhaNoPerfil({
	trilha,
	posicao,
	lidos,
	lida,
	encerrada,
}: {
	trilha: TrilhaNaLista;
	/** A posição da trilha na lista, a partir de 1. */
	posicao: number;
	lidos: ReadonlySet<string>;
	/** Se a leitura da conta já chegou: antes, a frase da trilha fica vazia. */
	lida: boolean;
	encerrada: boolean;
}) {
	const total = trilha.artigos.length;
	const quantosLidos = contarLidos(trilha.artigos, lidos);
	const fileira = useRef<HTMLOListElement>(null);
	const apareceu = useJaApareceu(fileira);

	return (
		<li className="perfil-trilha">
			<AzulejoGrande
				pecas={azulejoDaPosicao(posicao)}
				simbolo={simboloDaTrilha(trilha.slug)}
				className="perfil-trilha-azulejo"
			/>
			<div className="perfil-trilha-texto caixa-do-teto">
				<h3 className="titulo-de-folha letra-com-teto teto-pela-caixa">
					<Link to="/trilhas/$trilha" params={{ trilha: trilha.slug }}>
						{trilha.titulo}
					</Link>
				</h3>
				<div className="perfil-trilha-progresso grid text-pretty">
					<Reservas
						frases={[
							fraseDaTrilha(0, total),
							fraseDaTrilha(total - 1, total),
							fraseDaTrilha(total, total),
						]}
						className="progresso rotulo"
					/>
					<p className="progresso rotulo col-start-1 row-start-1">
						{lida ? fraseDaTrilha(quantosLidos, total) : ""}
					</p>
				</div>
			</div>
			<ol ref={fileira} aria-hidden="true" className="perfil-azulejos">
				{trilha.artigos.map((artigo, indice) => {
					const virado = apareceu && lidos.has(idDoArtigo(artigo));
					// A onda: os artigos da trilha em fila. O visto espera o azulejo
					// virar (o --atraso, no CSS).
					const atraso = indice * 60;
					return (
						<li
							key={artigo.slug}
							style={{ "--atraso": `${atraso}ms` } as CSSProperties}
						>
							<AzulejoGrande
								// Na saída, volta ao cru já no primeiro quadro.
								key={encerrada ? "encerrada" : undefined}
								pecas={azulejoDaPosicao(indice + 1)}
								cru={!virado}
								passo={45}
								atraso={atraso}
							/>
							{virado && <MarcaDeLido className="visto-do-perfil" />}
						</li>
					);
				})}
			</ol>
		</li>
	);
}

/**
 * Se a fileira de azulejos já apareceu na tela: os lidos só viram quando a
 * pessoa pode ver. O cartaz toma a primeira tela, e a onda que viesse com a
 * conta passaria longe da vista. A fileira conta como vista quando entra
 * acima da faixa de baixo da tela (os 15% de baixo), e continua vista. Com o
 * movimento reduzido, e onde o navegador não tem o IntersectionObserver, ela
 * conta como vista desde o começo: a cor chega com a conta, sem esperar.
 */
function useJaApareceu(alvo: RefObject<Element | null>): boolean {
	const [apareceu, setApareceu] = useState(false);
	useEffect(() => {
		const elemento = alvo.current;
		if (
			!elemento ||
			movimentoReduzido() ||
			typeof IntersectionObserver === "undefined"
		) {
			setApareceu(true);
			return;
		}
		const olho = new IntersectionObserver(
			([entrada]) => {
				if (entrada?.isIntersecting) {
					setApareceu(true);
					olho.disconnect();
				}
			},
			{ rootMargin: "0px 0px -15% 0px" },
		);
		olho.observe(elemento);
		return () => olho.disconnect();
	}, [alvo]);
	return apareceu;
}
