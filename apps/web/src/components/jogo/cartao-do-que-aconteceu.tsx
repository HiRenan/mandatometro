import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { BOTAO_CONTINUAR } from "@/components/botao-continuar";
import { ListaDeFontes } from "@/components/fontes";
import { classes } from "@/lib/classes";
import { semCliqueDuplo } from "@/lib/clique";
import type { CenaNaPagina } from "@/lib/jogo";
import { tocar } from "@/lib/jogo/som";
import { TRILHA_DO_JOGO } from "@/lib/jogo/trilha";

/**
 * O cartão "O que aconteceu de verdade", no fim de cada cena: os fatos, a
 * fonte oficial de cada um e o artigo da trilha que explica a regra. As fontes
 * saem do mesmo componente do artigo (components/fontes.tsx).
 */
export function CartaoDoQueAconteceu({
	cena,
	ultima,
	aoAvancar,
}: {
	cena: CenaNaPagina;
	ultima: boolean;
	aoAvancar: () => void;
}) {
	useEffect(() => {
		tocar("revelacao");
	}, []);

	return (
		<section className="jogo-cartao" aria-labelledby="o-que-aconteceu">
			<h2
				id="o-que-aconteceu"
				className="subtitulo-condensado"
				tabIndex={-1}
				data-foco="true"
			>
				O que aconteceu de verdade
			</h2>
			<div className="jogo-cartao-texto">
				{cena.revelacao.paragrafos.map((paragrafo) => (
					<p key={paragrafo}>{paragrafo}</p>
				))}
			</div>
			<p className="jogo-cartao-trilha">
				Na trilha:{" "}
				<Link
					to="/trilhas/$trilha/$artigo"
					params={{ trilha: TRILHA_DO_JOGO, artigo: cena.artigo.slug }}
				>
					{cena.artigo.titulo}
				</Link>
			</p>
			<ListaDeFontes fontes={cena.revelacao.fontes} />
			<div className="jogo-acoes">
				<button
					type="button"
					className={classes(BOTAO_CONTINUAR, "jogo-botao")}
					onClick={semCliqueDuplo(aoAvancar)}
				>
					{ultima ? "Ver o caminho que você fez" : "Próxima cena"}
				</button>
			</div>
		</section>
	);
}
