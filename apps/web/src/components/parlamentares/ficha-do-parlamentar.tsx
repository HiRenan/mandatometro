// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import type { ReactNode } from "react";
import type { ParlamentarDaPagina, Patrimonio } from "@/lib/parlamentares";
import {
	eleicoesDaFicha,
	fonteDaBiografia,
	naoPublica,
	partesDoMandato,
	textoDasProfissoes,
	ultimoPatrimonio,
} from "@/lib/parlamentares/ficha";
import { FaixaDeInformacoes } from "../faixa-de-informacoes";

/** O nome de cada Casa depois do "da" ou do "do": "da Câmara dos Deputados". */
const DA_CASA = {
	camara: "da Câmara dos Deputados",
	senado: "do Senado Federal",
} as const;

/**
 * A ficha no pé do cartaz do parlamentar (o Renan, em 23/11/2026: "A · Ficha em
 * quadro"): o partido, com a sigla e o nome por extenso, a profissão e a
 * escolaridade que a Casa publica, os mandatos, os votos registrados, o último
 * patrimônio declarado e as eleições desde 2006. Cada item traz a fonte. O dado
 * que falta não deixa buraco: a linha sai ou diz, em palavras, o que a Casa não
 * publica. O título fica só para o leitor de tela, e a ordem do HTML é a da tela.
 */
export function FichaDoParlamentar({
	parlamentar,
	patrimonio,
	votos,
}: {
	parlamentar: ParlamentarDaPagina;
	patrimonio: Patrimonio;
	/** O total dos votos registrados, o mesmo do título dos votos embaixo. */
	votos: number;
}) {
	const { casa, uf, mandatos, biografia } = parlamentar;
	const eleicoes = patrimonio.tipo === "patrimonio" ? patrimonio.eleicoes : [];
	const ultimo = ultimoPatrimonio(eleicoes);
	const daFicha = eleicoesDaFicha(eleicoes, uf);
	return (
		<section aria-labelledby="ficha" className="ficha-do-parlamentar">
			<h2 id="ficha" className="sr-only">
				Ficha
			</h2>
			<dl className="itens-da-ficha">
				<Partido sigla={parlamentar.partido} nome={parlamentar.partido_nome} />
				{biografia && (
					<>
						<ItemDaFicha
							rotulo={
								biografia.profissoes.length > 1 ? "Profissões" : "Profissão"
							}
							fonte={<FonteDaBiografia biografia={biografia} casa={casa} />}
						>
							{biografia.profissoes.length > 0 ? (
								textoDasProfissoes(biografia.profissoes)
							) : (
								<FaltaNaFicha>{naoPublica(casa, "a profissão")}</FaltaNaFicha>
							)}
						</ItemDaFicha>
						<ItemDaFicha
							rotulo="Escolaridade"
							fonte={<FonteDaBiografia biografia={biografia} casa={casa} />}
						>
							{biografia.escolaridade ?? (
								<FaltaNaFicha>
									{naoPublica(casa, "a escolaridade")}
								</FaltaNaFicha>
							)}
						</ItemDaFicha>
					</>
				)}
				{mandatos.length > 0 && (
					<ItemDaFicha
						rotulo={mandatos.length > 1 ? "Mandatos" : "Mandato"}
						fonte={<>Fonte: {NOME_DA_CASA_NA_FONTE[casa]}.</>}
					>
						<ul role="list" className="mandatos-da-ficha">
							{mandatos.map((mandato) => (
								<li key={`${mandato.legislatura}-${mandato.uf}`}>
									<FaixaDeInformacoes>
										{partesDoMandato(mandato, uf).map((parte) => (
											<span key={parte} className="parte-do-mandato">
												{parte}
											</span>
										))}
									</FaixaDeInformacoes>
								</li>
							))}
						</ul>
					</ItemDaFicha>
				)}
				<ItemDaFicha
					rotulo="Votos registrados"
					fonte={
						<>
							Fonte: as votações nominais {DA_CASA[casa]}.
							{votos > 0 && (
								<>
									{" "}
									<a href="#votos">Ver os votos</a>
								</>
							)}
						</>
					}
				>
					{votos > 0 ? (
						<span className="numero-da-ficha">{votos}</span>
					) : (
						<FaltaNaFicha>Nenhum voto registrado ainda</FaltaNaFicha>
					)}
				</ItemDaFicha>
				{ultimo && (
					<ItemDaFicha
						rotulo="Último patrimônio declarado"
						fonte={
							<>
								Fonte:{" "}
								{ultimo.fonte.endereco ? (
									<a href={ultimo.fonte.endereco}>
										<span>arquivo do TSE{ultimo.fonte.zip && " (ZIP)"}</span>{" "}
										<span className="sr-only">
											com os bens declarados em {ultimo.ano}
										</span>
									</a>
								) : (
									"arquivo do TSE"
								)}{" "}
								<span className="coleta-da-ficha">
									Coletado em {ultimo.fonte.coletado}.
								</span>
							</>
						}
					>
						<span className="numero-da-ficha">{ultimo.valor}</span>{" "}
						<span className="ano-do-patrimonio">em {ultimo.ano}</span>
					</ItemDaFicha>
				)}
				{daFicha.length > 0 && (
					<ItemDaFicha
						rotulo="Eleições desde 2006"
						className="eleicoes-da-ficha"
						fonte={
							<>
								Fonte: TSE.{" "}
								<a href="#patrimonio">Ver o patrimônio de cada eleição</a>
							</>
						}
					>
						<ol role="list" className="lista-das-eleicoes">
							{daFicha.map(({ chave, ano, cargo, lugar, resultado }) => (
								<li key={chave} className="eleicao-da-ficha">
									<span className="numero-da-ficha">{ano}</span>{" "}
									<span className="cargo-na-ficha">
										{cargo}
										{lugar && `, ${lugar}`}
									</span>
									{resultado && (
										<>
											{" "}
											<span className="resultado-na-ficha">{resultado}</span>
										</>
									)}
								</li>
							))}
						</ol>
					</ItemDaFicha>
				)}
			</dl>
		</section>
	);
}

/** O nome da Casa na fonte dos mandatos. */
const NOME_DA_CASA_NA_FONTE = {
	camara: "Câmara dos Deputados",
	senado: "Senado Federal",
} as const;

/**
 * Um item da ficha: o rótulo, o valor e, embaixo, a fonte. Cada item é um grupo
 * da lista de termos, com o termo e as duas descrições.
 */
function ItemDaFicha({
	rotulo,
	fonte,
	className,
	children,
}: {
	rotulo: string;
	fonte: ReactNode;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={className ? `item-da-ficha ${className}` : "item-da-ficha"}>
			<dt className="rotulo">{rotulo}</dt>
			<dd className="valor-da-ficha">{children}</dd>
			<dd className="fonte-da-ficha">{fonte}</dd>
		</div>
	);
}

/** O dado que falta, dito em palavras, na letra do texto, e não na dos dados. */
function FaltaNaFicha({ children }: { children: ReactNode }) {
	return <span className="falta-na-ficha">{children}</span>;
}

/**
 * O partido: a sigla e, embaixo, o nome por extenso, quando a fonte o traz. Sem
 * partido nos dados, a frase de sempre, que diz de onde ele viria.
 */
function Partido({
	sigla,
	nome,
}: {
	sigla: string | null;
	nome: string | null;
}) {
	if (!sigla) {
		return (
			<ItemDaFicha
				rotulo="Partido"
				fonte="O partido vem do último voto registrado."
			>
				<FaltaNaFicha>Sem partido nos dados usados</FaltaNaFicha>
			</ItemDaFicha>
		);
	}
	return (
		<ItemDaFicha rotulo="Partido" fonte="Fonte: o último voto registrado.">
			<span className="sigla-do-partido">{sigla}</span>
			{nome && (
				<>
					{" "}
					<span className="nome-do-partido">{nome}</span>
				</>
			)}
		</ItemDaFicha>
	);
}

/**
 * A fonte da profissão e da escolaridade: a página oficial da Casa e, embaixo, o
 * dia da coleta. O link fecha a linha, sem pontuação depois dele: numa coluna
 * estreita, ele quebra, e nenhuma vírgula começa a linha seguinte.
 */
function FonteDaBiografia({
	biografia,
	casa,
}: {
	biografia: NonNullable<ParlamentarDaPagina["biografia"]>;
	casa: ParlamentarDaPagina["casa"];
}) {
	const fonte = fonteDaBiografia(biografia.fonte, casa);
	return (
		<>
			Fonte:{" "}
			{fonte.endereco ? <a href={fonte.endereco}>{fonte.casa}</a> : fonte.casa}{" "}
			<span className="coleta-da-ficha">Coletada em {fonte.coletada}.</span>
		</>
	);
}
