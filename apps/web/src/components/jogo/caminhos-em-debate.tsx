// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.

import { BOTAO_CONTINUAR } from "@/components/botao-continuar";
import { classes } from "@/lib/classes";
import { semCliqueDuplo } from "@/lib/clique";
import type { Versoes } from "@/lib/jogo";

/**
 * Os caminhos que estavam em debate, lado a lado. Os cartões têm o mesmo
 * tamanho e a mesma cor, e cada um traz o que dizem a favor e o que dizem
 * contra: o desenho não pode favorecer nenhum deles
 * (docs/jogo-das-comissoes.md). A ordem é a do roteiro, e nada no cartão diz
 * qual é o melhor.
 */
export function CaminhosEmDebate({
	versoes,
	aoAvancar,
}: {
	versoes: Versoes;
	aoAvancar: () => void;
}) {
	return (
		<div className="jogo-debate">
			<h3 className="jogo-legenda" tabIndex={-1} data-foco="true">
				{versoes.titulo}
			</h3>
			<ol role="list" className="jogo-debate-lista">
				{versoes.caminhos.map((caminho) => (
					<li key={caminho.nome} className="jogo-via">
						<p className="jogo-via-nome">{caminho.nome}</p>
						{caminho.etiqueta === undefined ? null : (
							<p className="jogo-via-etiqueta">{caminho.etiqueta}</p>
						)}
						<p className="jogo-via-propoe">{caminho.propoe}</p>
						<dl className="jogo-via-lados">
							<div>
								<dt className="rotulo">O que dizem a favor</dt>
								<dd>{caminho.aFavor}</dd>
							</div>
							<div>
								<dt className="rotulo">O que dizem contra</dt>
								<dd>{caminho.contra}</dd>
							</div>
						</dl>
					</li>
				))}
			</ol>
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
	);
}
