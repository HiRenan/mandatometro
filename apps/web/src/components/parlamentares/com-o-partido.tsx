// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import type { ContagemComOPartido, VotoParlamentar } from "@/client";
import { formatarData } from "@/lib/formatar";
import type {
	ParlamentarDaPagina,
	VotosContraOPartido,
} from "@/lib/parlamentares";
import {
	contraOPartido,
	fraseDoPartido,
	legendaDaBarra,
	maisRecentes,
	motivoSemComparacao,
} from "@/lib/parlamentares/com-o-partido";
import {
	NOME_DO_VOTO,
	parteDoVoto,
	partidoDaBusca,
	tituloDaVotacao,
} from "@/lib/parlamentares/votos";

/**
 * Com o partido (a #329; o Renan, em 24/11/2026: "A · Na régua"): em quantas
 * votações a pessoa votou com a maioria do partido e contra ela, numa frase sem
 * a sigla, porque quem trocou de partido tem votos dos dois na conta, e na barra
 * de "Como votou". Depois, como a conta é feita e os votos mais novos contra a
 * maioria, cada um com a sigla daquele dia. Só fatos, sem adjetivo. Sem a
 * comparação nos dados, como na API de antes da #328, a seção não aparece.
 */
export function ComOPartido({
	parlamentar,
	votosContra,
}: {
	parlamentar: ParlamentarDaPagina;
	votosContra: VotosContraOPartido;
}) {
	const comparacao = parlamentar.com_o_partido;
	if (!comparacao) {
		return null;
	}
	return (
		<section
			aria-labelledby="com-o-partido"
			className="secao-dos-parlamentares"
		>
			<h2
				id="com-o-partido"
				className="subtitulo-condensado letra-com-teto [--palavra:3.61]"
			>
				Com o partido
			</h2>
			{comparacao.comparaveis > 0 ? (
				<NaRegua comparacao={comparacao} />
			) : (
				<p className="frase-do-partido">
					{motivoSemComparacao(parlamentar.contagem_votos, parlamentar.nome)}
				</p>
			)}
			<ComoContamos />
			{comparacao.contra > 0 && (
				<VotosContra votosContra={votosContra} contra={comparacao.contra} />
			)}
		</section>
	);
}

/**
 * A frase e a régua: o trilho em Papel 2 são as votações comparadas, e a parte
 * em tinta, as votações com a maioria. A barra e a legenda ficam fora do leitor
 * de tela, porque a frase já diz os números.
 */
function NaRegua({ comparacao }: { comparacao: ContagemComOPartido }) {
	const parte = parteDoVoto(comparacao.com_o_partido, comparacao.comparaveis);
	return (
		<>
			<p className="frase-do-partido">{fraseDoPartido(comparacao)}</p>
			<div className="regua-do-partido" aria-hidden="true">
				<p className="rotulo legenda-das-barras">
					{legendaDaBarra(comparacao.comparaveis)}
				</p>
				<div className="trilho-do-partido">
					{parte !== null && (
						<span
							className="barra-do-partido"
							style={{ "--parte": String(parte) } as CSSProperties}
						/>
					)}
				</div>
			</div>
		</>
	);
}

/** Como a conta é feita, com as regras da API (a #328), em palavras. */
function ComoContamos() {
	return (
		<div className="como-contamos">
			<h3 className="titulo-do-partido">Como contamos</h3>
			<p>
				Em cada votação, a maioria do partido é o voto mais comum entre os
				outros membros do partido em que a pessoa estava naquele dia. Só entram
				na conta Sim, Não, Abstenção e Obstrução.
			</p>
			<p>
				Fica de fora a votação em que a pessoa não votou, presidia a sessão ou
				teve outro registro. Também fica de fora a votação sem o partido no voto
				dela, com menos de dois colegas do partido na conta ou com empate entre
				os votos mais comuns.
			</p>
			<p>
				Na lista de votos, cada voto contra a maioria traz a sigla do partido
				naquele dia e o voto da maioria.
			</p>
		</div>
	);
}

/**
 * Os votos mais novos contra a maioria do partido, que o servidor pede já
 * filtrados. Quando a lista não carrega, a seção diz em palavras, e o resto da
 * página continua.
 */
function VotosContra({
	votosContra,
	contra,
}: {
	votosContra: VotosContraOPartido;
	contra: number;
}) {
	if (votosContra.tipo === "votos" && votosContra.votos.length === 0) {
		return null;
	}
	const linha =
		votosContra.tipo === "votos"
			? maisRecentes(votosContra.votos.length, contra)
			: null;
	return (
		<div className="votos-contra-a-maioria">
			<h3 className="titulo-do-partido">Votos contra a maioria do partido</h3>
			{votosContra.tipo === "indisponivel" ? (
				<p className="falha-dos-votos-contra">
					Os votos contra a maioria não carregaram agora. Recarregue a página
					para tentar de novo.
				</p>
			) : (
				<>
					{linha && <p className="rotulo recentes-dos-votos-contra">{linha}</p>}
					<ol role="list" className="lista-dos-votos-contra">
						{votosContra.votos.map((voto) => (
							<VotoContra key={voto.votacao_id} voto={voto} />
						))}
					</ol>
				</>
			)}
		</div>
	);
}

/**
 * Um voto contra a maioria: a votação, o dia, o voto da pessoa num carimbo cheio
 * e o da maioria num carimbo vazado, com a sigla daquele dia, e o link para a
 * votação já filtrada pelo partido, para conferir. O link tem um nome só dele
 * para o leitor de tela. A sigla que não cabe no endereço leva à votação inteira.
 */
function VotoContra({ voto }: { voto: VotoParlamentar }) {
	const marca = contraOPartido(voto);
	if (!marca) {
		return null;
	}
	const titulo = tituloDaVotacao(voto);
	const dia = formatarData(voto.data.slice(0, 10));
	const partido = partidoDaBusca(marca.partido);
	return (
		<li className="voto-contra-a-maioria">
			<p className="titulo-do-voto-contra">{titulo}</p>
			<p className="rotulo dia-do-voto-contra">{dia}</p>
			<dl className="carimbos-do-voto-contra">
				<div className="carimbo-da-pessoa">
					<dt>Votou</dt>
					<dd>{NOME_DO_VOTO[voto.valor]}</dd>
				</div>
				<div className="carimbo-da-maioria">
					<dt>Maioria do {marca.partido}</dt>
					<dd>{NOME_DO_VOTO[marca.maioria]}</dd>
				</div>
			</dl>
			<p className="link-do-voto-contra">
				<Link
					to="/votacoes/$id"
					params={{ id: String(voto.votacao_id) }}
					search={partido ? { partido } : {}}
					className="acao-de-texto"
				>
					<span>
						{partido ? `Ver como o ${partido} votou` : "Ver quem votou"}
					</span>{" "}
					<span className="sr-only">
						na votação de {dia}: {titulo}
					</span>
				</Link>
			</p>
		</li>
	);
}
