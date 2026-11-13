import { Painel } from "./azulejo";
import { NOME_DO_SITE } from "./nome-do-site";

/**
 * O rodapé: o papel com um fio de tinta em cima, o nome e o lema, e uma fileira
 * de azulejos embaixo, que faz a onda quando entra na tela. Diz que o projeto foi
 * feito para o Hack Brasil, de onde vêm as explicações e onde está o código. Mora
 * no documento (__root.tsx), e por isso aparece em todas as páginas, inclusive na
 * de não encontrado e na de erro.
 */
export function Rodape() {
	return (
		<footer className="rodape">
			{/* Abaixo do lg, uma coluna da largura da tela: com a letra grande, uma
			    palavra comprida não alarga o rodapé. A partir do lg, duas colunas. */}
			<div className="rodape-dentro px-margem-celular md:px-margem-larga grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
				<div>
					<p className={NOME_DO_SITE}>Mandatômetro</p>
					<p className="marca-lema">o diário oficial político, simplificado</p>
				</div>
				<div className="rodape-texto">
					<p>
						O Mandatômetro foi feito para o Hack Brasil 2026, na trilha Acesso à
						educação.
					</p>
					<p>
						Cada explicação traz a fonte oficial: a lei, o regimento ou a página
						da Câmara e do Senado.
					</p>
					<p>
						<a
							href="https://github.com/HiRenan/mandatometro"
							className="acao-de-texto"
						>
							<span>O código é aberto, no GitHub</span>
						</a>
						.
					</p>
				</div>
			</div>
			{/* Dezesseis azulejos numa fileira; no celular, os oito primeiros, que já
			    têm as cinco fitas. */}
			<Painel
				semente={31}
				colunas={16}
				quantas={16}
				juntas={8}
				className="faixa-de-azulejos"
				ondaAoChegar
			/>
		</footer>
	);
}
