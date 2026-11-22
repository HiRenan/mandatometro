// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.

import { useId } from "react";
import { BOTAO_CONTINUAR } from "@/components/botao-continuar";
import { classes } from "@/lib/classes";
import { semCliqueDuplo } from "@/lib/clique";
import type { Decisao as DoRoteiro } from "@/lib/jogo";
import type { Escolha } from "@/lib/jogo/partida";
import { Carimbo } from "./carimbos";

/**
 * A decisão da cena, com a etiqueta que diz a natureza dela. Na de regra, a
 * escolha abre a explicação de cada opção, com o artigo; na de opinião, o jogo
 * repete a escolha e mostra o que aconteceu de verdade, sem julgar. O avanço só
 * sai depois de escolher.
 */
const ETIQUETA = { regra: "Regra", opiniao: "Opinião" } as const;

const AVISO_DA_NATUREZA = {
	regra: "Esta tem resposta certa, pelo regimento ou pela Constituição.",
	opiniao: "Esta não tem resposta certa: o voto é seu.",
} as const;

const RESULTADO = {
	certa: "Pelo regimento",
	"funciona-mas-perde": "Funciona, mas perde o que já andou",
	errada: "Não resolve",
} as const;

export function Decisao({
	decisao,
	escolha,
	aoEscolher,
	aoAvancar,
}: {
	decisao: DoRoteiro;
	escolha?: Escolha;
	aoEscolher: (opcao: string) => void;
	aoAvancar: () => void;
}) {
	const id = useId();
	const escolhida = escolha?.opcao;
	const descricao =
		decisao.natureza === "regra"
			? [
					...decisao.opcoes.flatMap((opcao, indice) =>
						opcao.texto === escolhida || opcao.resultado === "certa"
							? [`${id}-opcao-${indice}`]
							: [],
					),
					`${id}-fundamento`,
				].join(" ")
			: decisao.desfecho
					.map((_, indice) => `${id}-desfecho-${indice}`)
					.join(" ");

	return (
		<div className="jogo-decisao">
			<p className="jogo-etiqueta">
				<span>{ETIQUETA[decisao.natureza]}</span>
			</p>
			<p
				className="jogo-pergunta"
				tabIndex={-1}
				data-foco={escolhida === undefined ? "true" : undefined}
				aria-describedby={`${id}-natureza`}
			>
				{decisao.pergunta}
			</p>
			<p className="jogo-natureza" id={`${id}-natureza`}>
				{AVISO_DA_NATUREZA[decisao.natureza]}
			</p>
			<ul
				role="list"
				className="jogo-opcoes"
				data-inicio-do-passo={
					escolhida !== undefined && decisao.natureza === "regra"
						? "true"
						: undefined
				}
			>
				{decisao.opcoes.map((opcao, indice) => (
					<li key={opcao.texto} id={`${id}-opcao-${indice}`}>
						<button
							type="button"
							className="jogo-opcao"
							data-escolhida={opcao.texto === escolhida ? "true" : undefined}
							aria-pressed={
								escolhida === undefined ? undefined : opcao.texto === escolhida
							}
							disabled={escolhida !== undefined}
							onClick={semCliqueDuplo(() => aoEscolher(opcao.texto))}
						>
							{opcao.texto}
						</button>
						{escolhida !== undefined && "resultado" in opcao ? (
							<div className="jogo-explicacao" data-resultado={opcao.resultado}>
								<p className="jogo-resultado">{RESULTADO[opcao.resultado]}</p>
								<p>{opcao.explicacao}</p>
							</div>
						) : null}
					</li>
				))}
			</ul>
			{escolhida !== undefined ? (
				<div
					className="jogo-feedback"
					data-inicio-do-passo={
						decisao.natureza === "opiniao" ? "true" : undefined
					}
				>
					<p
						className="jogo-eco"
						tabIndex={-1}
						data-foco="true"
						aria-describedby={descricao}
					>
						{decisao.natureza === "opiniao"
							? `Você ${decisao.eco === "votou" ? "votou" : "escolheu"} ${escolhida.toLocaleLowerCase("pt-BR")}.`
							: `Você escolheu “${escolhida}”. ${escolha?.comoNoRegimento ? "É o instrumento do regimento." : "O instrumento do regimento era outro."}`}
					</p>
					{decisao.natureza === "opiniao" ? (
						decisao.desfecho.map((paragrafo, indice) => (
							<p id={`${id}-desfecho-${indice}`} key={paragrafo}>
								{paragrafo}
							</p>
						))
					) : (
						<>
							{decisao.carimbo ? <Carimbo selo={decisao.carimbo} /> : null}
							<p className="jogo-fundamento" id={`${id}-fundamento`}>
								{decisao.fundamento}
							</p>
						</>
					)}
					<div className="jogo-acoes">
						<button
							type="button"
							className={classes(BOTAO_CONTINUAR, "jogo-botao")}
							onClick={semCliqueDuplo(aoAvancar)}
						>
							Continuar
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
}
