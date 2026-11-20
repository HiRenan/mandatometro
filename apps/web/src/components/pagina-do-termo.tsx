// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import type { ReactNode } from "react";
import { classes } from "@/lib/classes";
import { classeDaFita, formatarData } from "@/lib/formatar";
import { VERSAO_DO_TERMO } from "@/lib/termo";
import { FaixaDeInformacoes } from "./faixa-de-informacoes";

/**
 * O tempo de leitura do termo, contado como o do artigo: as palavras da abertura
 * e das nove partes, a 200 por minuto. O pagina-do-termo.test.tsx refaz a conta
 * com o texto da página e avisa quando o texto muda e o número fica para trás.
 */
const MINUTOS_DE_LEITURA = 5;

type Parte = { id: string; titulo: string; texto: ReactNode };

/**
 * As nove partes do termo, na ordem: o índice e a folha saem desta lista. Cada
 * frase sai do que o código faz, e a origem de cada uma está no relato da #112 e
 * em docs/dados-pessoais.md ("Inscrição e conta"). Quem muda o texto muda também a
 * VERSAO_DO_TERMO (lib/termo.ts), no mesmo PR.
 */
const PARTES: Parte[] = [
	{
		id: "para-que-serve",
		titulo: "Para que serve a conta",
		texto: (
			<>
				<p>
					A conta guarda o seu progresso nas trilhas: os artigos que você já
					leu. Assim, você começa a trilha no celular e continua no computador,
					de onde parou.
				</p>
				<p>
					Sem conta, o site funciona do mesmo jeito. Você lê as trilhas,
					responde os quizzes e assina a newsletter, e o progresso fica só no
					navegador que você usa.
				</p>
			</>
		),
	},
	{
		id: "o-que-guarda",
		titulo: "O que a conta guarda",
		texto: (
			<>
				<p>Para criar a conta, pedimos três dados:</p>
				<ul role="list">
					<li>
						<strong>Nome completo:</strong> aparece no seu perfil.
					</li>
					<li>
						<strong>E-mail:</strong> é com ele que você entra. Para ele vão o
						link que confirma o cadastro, o link para trocar a senha e o
						comprovante quando você exclui a conta.
					</li>
					<li>
						<strong>Senha:</strong> não guardamos a senha em si, só um código
						calculado a partir dela, que não dá para transformar de volta na
						senha.
					</li>
				</ul>
				<p>
					Outros três dados são opcionais: gênero, estado onde você mora e data
					de nascimento. Eles servem para o time entender, em números gerais,
					quem usa o Mandatômetro, como quantas pessoas são de cada estado. Se
					preferir, deixe em branco.
				</p>
				<p>A conta guarda também:</p>
				<ul role="list">
					<li>
						a versão deste termo que você aceitou, com a data e a hora do
						aceite, e as datas do cadastro e da confirmação do e-mail;
					</li>
					<li>
						os artigos que você leu, com a data e a hora em que cada um foi
						marcado;
					</li>
					<li>
						o papel da conta: toda conta é comum, e o papel de administradora
						fica só com quem revisa as edições da newsletter, no time;
					</li>
					<li>
						as suas sessões: quando você entra, o navegador guarda um cookie que
						mantém você na conta por sete dias, ou até você sair. No banco, fica
						só um código que não revela esse cookie.
					</li>
				</ul>
			</>
		),
	},
	{
		id: "fora-da-conta",
		titulo: "O que fica de fora da conta",
		texto: (
			<ul role="list">
				<li>
					<strong>A newsletter</strong> é uma inscrição à parte, que pede só o
					e-mail. Se você marcar “Quero receber a newsletter semanal” no
					cadastro, o seu e-mail entra também na lista dela. Excluir a conta não
					tira você da newsletter: para sair, use o link no fim de cada edição.
				</li>
				<li>
					<strong>O quiz</strong> não vai para a conta: as suas respostas ficam
					só no navegador.
				</li>
				<li>
					<strong>O piloto</strong> é anônimo: ele não pede nome nem e-mail e
					não se liga à conta.
				</li>
			</ul>
		),
	},
	{
		id: "quem-ve",
		titulo: "Quem vê os seus dados",
		texto: (
			<>
				<p>
					O seu nome e o seu progresso aparecem só para você, quando você está
					na sua conta.
				</p>
				<p>
					A senha e os dados opcionais não saem do banco: não aparecem no site,
					não saem pela API e não vão em nenhum e-mail. Os registros técnicos do
					site e da API também não levam os dados da conta.
				</p>
				<p>
					Para barrar abusos, como alguém tentando adivinhar uma senha, a API
					conta as tentativas de cada e-mail e de cada endereço de internet (IP)
					a cada minuto. Ela guarda só um código, que não revela o e-mail nem o
					IP, e depois o descarta.
				</p>
				<p>
					Só o time do Mandatômetro tem acesso ao banco, para manter o site
					funcionando. Não vendemos os seus dados e não os passamos a ninguém,
					fora os serviços da <a href="#servicos">parte 5</a>.
				</p>
			</>
		),
	},
	{
		id: "servicos",
		titulo: "Os serviços que usamos",
		texto: (
			<>
				<p>Três empresas fazem parte do trabalho por nós:</p>
				<ul role="list">
					<li>
						a <strong>Vercel</strong> hospeda o site e a API e, como todo
						servidor, registra os pedidos que chegam;
					</li>
					<li>
						o <strong>Neon</strong>, da Databricks, guarda o banco de dados,
						onde ficam os dados da conta;
					</li>
					<li>
						o <strong>Resend</strong> envia os e-mails da conta e, para isso,
						recebe o seu e-mail e o texto de cada mensagem.
					</li>
				</ul>
				<p>
					As três são empresas dos Estados Unidos, e os seus dados podem ser
					tratados nos servidores delas, também fora do Brasil. Cada uma explica
					na própria política de privacidade como cuida dos dados:{" "}
					<a href="https://vercel.com/legal/privacy-notice">Vercel</a>,{" "}
					<a href="https://www.databricks.com/legal/privacynotice">Neon</a> e{" "}
					<a href="https://resend.com/legal/privacy-policy">Resend</a>.
				</p>
			</>
		),
	},
	{
		id: "apagar",
		titulo: "Por quanto tempo e como apagar",
		texto: (
			<>
				<p>
					Os dados ficam guardados enquanto a conta existir. Para apagar tudo,
					entre na conta, abra <strong>Meu perfil</strong> e use{" "}
					<strong>Excluir conta</strong>, com a sua senha atual. Na hora, a
					exclusão apaga o nome, o e-mail, a senha, os dados opcionais, as
					sessões e o progresso, no banco e neste navegador.
				</p>
				<p>
					Depois, mandamos um comprovante para o seu e-mail. Até ele sair, o
					endereço fica guardado, cifrado, só para esse envio. Se o envio não
					der certo em um dia, o endereço é apagado sem o comprovante.
				</p>
				<p>
					O provedor do banco guarda, por pouco tempo, um histórico para
					recuperar o banco se algo der errado. O que você apagou some desse
					histórico quando o prazo dele acaba.
				</p>
				<p>
					Se você não confirmar o e-mail, o cadastro fica guardado sem uso. Para
					apagá-lo, peça outro link em <strong>Reenviar confirmação</strong>,
					confirme o e-mail e exclua a conta. Se preferir,{" "}
					<a href="#contato">escreva para nós</a>.
				</p>
			</>
		),
	},
	{
		id: "contato",
		titulo: "Os seus direitos e o contato",
		texto: (
			<>
				<p>
					Você pode, quando quiser, saber quais dados a conta guarda, corrigir
					um dado errado, apagar tudo e retirar o seu consentimento. Excluir a
					conta apaga tudo e retira o consentimento de uma vez.
				</p>
				<p>
					Para ver ou corrigir os seus dados, ou para tirar uma dúvida sobre
					eles, escreva para{" "}
					<a href="mailto:contato@mandatometro.com.br">
						contato@mandatometro.com.br
					</a>
					. Quem responde pelos dados das contas é{" "}
					<strong>Renan Mocelin</strong>, pelo time do Mandatômetro. O
					Mandatômetro é um projeto feito para o Hack Brasil 2026.
				</p>
				<p>
					Se achar que não cuidamos bem dos seus dados, você também pode
					reclamar com a Autoridade Nacional de Proteção de Dados, a{" "}
					<a href="https://www.gov.br/anpd/pt-br">ANPD</a>.
				</p>
			</>
		),
	},
	{
		id: "menores",
		titulo: "Menores de idade",
		texto: (
			<>
				<p>
					A conta é para quem tem 12 anos ou mais. Para quem tem menos de 12, a
					lei pede a autorização da mãe, do pai ou de quem é responsável, e o
					site não tem como receber essa autorização. Sem conta, o Mandatômetro
					funciona por inteiro.
				</p>
				<p>
					Se você tem menos de 18 anos, vale ler este termo com alguém da sua
					família.
				</p>
			</>
		),
	},
	{
		id: "mudancas",
		titulo: "Quando este termo muda",
		texto: (
			<>
				<p>
					Esta é a versão de{" "}
					<time dateTime={VERSAO_DO_TERMO}>
						{formatarData(VERSAO_DO_TERMO)}
					</time>
					. Quando o termo mudar, esta página vai mostrar a versão nova e a data
					dela, e quem criar conta a partir daí aceita a versão nova. A sua
					conta continua guardando a versão que você aceitou. Se não concordar
					com uma versão nova, você pode excluir a conta quando quiser.
				</p>
				<p>
					As versões anteriores ficam no histórico do código aberto do
					Mandatômetro, no{" "}
					<a href="https://github.com/HiRenan/mandatometro/commits/develop/apps/web/src/components/pagina-do-termo.tsx">
						GitHub
					</a>
					.
				</p>
			</>
		),
	},
];

/**
 * O termo de consentimento da conta, em /termo: a folha de leitura da página da
 * edição, sem o azulejo do canto, sem migalha e sem a barra de leitura, porque é
 * um documento calmo. No alto, o título, a faixa com a versão e o tempo de
 * leitura e a abertura; embaixo, o índice "Neste termo" e as nove partes. Tudo
 * vem no HTML do servidor: a página não pede nada à API e funciona sem
 * JavaScript.
 */
export function PaginaDoTermo() {
	return (
		<div className="pagina-do-termo">
			<div className="parede">
				{/* Abaixo de 1200 px, uma coluna da largura da tela, com o índice dentro
				    da folha; a partir daí, o índice fica na coluna ao lado. */}
				<div className="artigo-grade">
					<article className="folha artigo-folha">
						{/* O teto sai da palavra mais larga, CONSENTIMENTO (lib/conteudo/regua.ts). */}
						<h1 className="titulo-condensado letra-com-teto [--palavra:6.52]">
							Termo de consentimento
						</h1>
						<FaixaDeInformacoes>
							<span>
								Versão de{" "}
								<time dateTime={VERSAO_DO_TERMO}>
									{formatarData(VERSAO_DO_TERMO)}
								</time>
							</span>
							<span>{`Leitura de ${MINUTOS_DE_LEITURA} min`}</span>
						</FaixaDeInformacoes>
						<p className="lide">
							Você não precisa de conta para usar o Mandatômetro. Se quiser
							criar uma, este termo explica o que ela guarda, para que serve
							cada dado e como apagar tudo. Ao marcar a caixa do termo no
							cadastro, você diz que tem 12 anos ou mais e concorda com ele.
						</p>
						<NesteTermo onde="na-folha" />
						{PARTES.map((parte, indice) => (
							<ParteDoTermo key={parte.id} parte={parte} posicao={indice + 1} />
						))}
					</article>

					<div className="ao-lado-do-artigo">
						<NesteTermo onde="ao-lado" />
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Uma parte do termo: o fio de tinta, o número na fita da posição (desenho, fora
 * do leitor de tela), o título e o texto. Os títulos têm um teto só, o da palavra
 * mais larga deles, SERVIÇOS: com a letra grande, os nove ficam do mesmo
 * tamanho. A parte não sobe com a rolagem (o revelar): o índice leva até ela.
 */
function ParteDoTermo({ parte, posicao }: { parte: Parte; posicao: number }) {
	return (
		<section
			id={parte.id}
			aria-labelledby={`${parte.id}-titulo`}
			className={classes("parte-do-termo", classeDaFita(posicao))}
		>
			<span aria-hidden="true" className="numeral">
				{posicao}
			</span>
			<h2
				id={`${parte.id}-titulo`}
				className="subtitulo-condensado letra-com-teto [--palavra:4.07]"
			>
				{parte.titulo}
			</h2>
			<div className="texto">{parte.texto}</div>
		</section>
	);
}

/**
 * O índice "Neste termo", como o "Nesta edição": o número na fita da posição e o
 * título de cada parte. Ele aparece em dois lugares, e o CSS mostra um de cada
 * vez: dentro da folha, depois da abertura, abaixo de 1200 px; na coluna ao
 * lado, que para na tela durante a rolagem, daí para cima. Cada cópia tem o id
 * dela, e o leitor de tela só encontra a que está na tela.
 */
function NesteTermo({ onde }: { onde: "na-folha" | "ao-lado" }) {
	const id = `neste-termo-${onde}`;
	return (
		<nav aria-labelledby={id} className={classes("nesta", id)}>
			<h2 id={id} className="rotulo">
				Neste termo
			</h2>
			<ol role="list" className="folhas-da-trilha">
				{PARTES.map((parte, indice) => (
					<li key={parte.id} className={classeDaFita(indice + 1)}>
						<a href={`#${parte.id}`}>
							<span aria-hidden="true" className="numeral letra-grande:mb-4">
								{indice + 1}
							</span>
							<span className="letra-grande:col-span-full">
								<span className="titulo">{parte.titulo}</span>
							</span>
						</a>
					</li>
				))}
			</ol>
		</nav>
	);
}
