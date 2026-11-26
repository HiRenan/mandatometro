// biome-ignore-all lint/a11y/noRedundantRoles: o VoiceOver preserva o papel da lista sem marcadores.
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { consultarOpinioesPainel, type OpinioesPainel } from "@/client";
import { ENV } from "@/env";
import { estiloDoTeto } from "@/lib/conteudo/regua";
import { comMilhares } from "@/lib/formatar";
import { PARTES_DA_OPINIAO } from "@/lib/opiniao";
import { acessoRecusado, opcoes, pedir } from "@/lib/painel/pedido";
import { BOTAO_CONTINUAR } from "../botao-continuar";
import { CabecaDoPainel } from "./cabeca-do-painel";
import { VerificandoSessao } from "./verificando-sessao";

const TITULO = "Opiniões sobre o site";
const TITULO_DAS_PARTES = "O que as pessoas usaram";
const TITULO_DA_LISTA = "Opiniões recebidas";
const DATA = new Intl.DateTimeFormat("pt-BR", {
	dateStyle: "short",
	timeStyle: "short",
	timeZone: "America/Sao_Paulo",
});
const MEDIA = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

type Leitura =
	| { tipo: "carregando" | "sem-api" | "falhou" | "saiu" }
	| { tipo: "lida"; dados: OpinioesPainel };

export function PaginaDasOpinioes() {
	const router = useRouter();
	const [leitura, setLeitura] = useState<Leitura>({
		tipo: ENV.API_URL ? "carregando" : "sem-api",
	});
	const [tentativa, setTentativa] = useState(0);

	// A guarda já passou quando a página monta. A consulta fica na memória dela.
	// biome-ignore lint/correctness/useExhaustiveDependencies: cada nova tentativa inicia uma consulta.
	useEffect(() => {
		if (!ENV.API_URL) return;
		const controle = new AbortController();
		const sinal = controle.signal;

		async function carregar() {
			const resposta = await pedir(consultarOpinioesPainel(opcoes(sinal)));
			if (sinal.aborted) return;
			if (resposta.tipo === "ok") {
				setLeitura({ tipo: "lida", dados: resposta.dados });
				return;
			}
			if (
				resposta.tipo === "erro" &&
				(acessoRecusado(resposta.status) || resposta.status === 403)
			) {
				setLeitura({ tipo: "saiu" });
				await router.invalidate().catch(() => undefined);
			}
			if (!sinal.aborted) setLeitura({ tipo: "falhou" });
		}

		void carregar();
		return () => controle.abort();
	}, [router, tentativa]);

	if (leitura.tipo === "saiu") return <VerificandoSessao />;

	return (
		<div className="pagina-do-painel pagina-das-opinioes">
			<div className="parede">
				<div className="artigo-grade">
					<div className="folha artigo-folha caixa-do-teto">
						<CabecaDoPainel atual="opinioes" />
						<h1
							className="titulo-condensado letra-com-teto teto-pela-caixa"
							style={estiloDoTeto(TITULO, "titulo-condensado")}
						>
							{TITULO}
						</h1>
						{leitura.tipo === "carregando" && (
							<p role="status" className="carregando-o-rascunho rotulo">
								Carregando as opiniões…
							</p>
						)}
						{leitura.tipo === "sem-api" && (
							<div className="estado-da-revisao">
								<p className="lide">
									As opiniões estão fora do ar neste endereço.
								</p>
							</div>
						)}
						{leitura.tipo === "falhou" && (
							<div className="estado-da-revisao">
								<p className="lide">As opiniões não carregaram.</p>
								<button
									type="button"
									className={BOTAO_CONTINUAR}
									onClick={() => {
										setLeitura({ tipo: "carregando" });
										setTentativa((anterior) => anterior + 1);
									}}
								>
									Tentar de novo
								</button>
							</div>
						)}
						{leitura.tipo === "lida" && (
							<FolhaDasOpinioes dados={leitura.dados} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function FolhaDasOpinioes({ dados }: { dados: OpinioesPainel }) {
	return (
		<>
			<dl className="cifras">
				<div>
					<dt className="rotulo">Total de opiniões</dt>
					<dd className="cifra">{comMilhares(dados.total)}</dd>
				</div>
				<div>
					<dt className="rotulo">Nota média</dt>
					{dados.nota_media === null ? (
						<dd>Sem notas</dd>
					) : (
						<dd className="cifra">{MEDIA.format(dados.nota_media)} de 5</dd>
					)}
				</div>
			</dl>
			<section
				aria-labelledby="opinioes-por-parte"
				className="secao-dos-numeros"
			>
				<h2
					id="opinioes-por-parte"
					className="subtitulo-condensado letra-com-teto teto-pela-caixa"
					style={estiloDoTeto(TITULO_DAS_PARTES, "subtitulo-condensado")}
				>
					{TITULO_DAS_PARTES}
				</h2>
				<dl className="valores-dos-numeros">
					{PARTES_DA_OPINIAO.map(([parte, nome]) => (
						<div key={parte}>
							<dt>{nome}</dt>
							<dd>{comMilhares(dados.por_parte[parte] ?? 0)}</dd>
						</div>
					))}
				</dl>
			</section>
			<section
				aria-labelledby="opinioes-recentes"
				className="secao-dos-numeros"
			>
				<h2
					id="opinioes-recentes"
					className="subtitulo-condensado letra-com-teto teto-pela-caixa"
					style={estiloDoTeto(TITULO_DA_LISTA, "subtitulo-condensado")}
				>
					{TITULO_DA_LISTA}
				</h2>
				{!dados.opinioes.length && (
					<p className="frase-do-grafico">Nenhuma opinião chegou ainda.</p>
				)}
				{dados.total > dados.opinioes.length && (
					<p className="frase-do-grafico">
						Mostrando as {comMilhares(dados.opinioes.length)} mais recentes.
					</p>
				)}
				{dados.opinioes.length > 0 && (
					<ol className="lista-das-opinioes" role="list">
						{dados.opinioes.map(
							({ criada_em, nota, partes, texto }, posicao) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: a lista é uma fotografia imutável sem id na resposta.
								<li key={`${criada_em}-${posicao}`}>
									<div className="metadados-da-opiniao rotulo">
										<time dateTime={criada_em}>
											{DATA.format(new Date(criada_em))}
										</time>
										<span>
											{nota === null ? "Sem nota" : `Nota ${nota} de 5`}
										</span>
										{partes.length > 0 && (
											<span>
												{PARTES_DA_OPINIAO.filter(([parte]) =>
													partes.includes(parte),
												)
													.map(([, nome]) => nome)
													.join(", ")}
											</span>
										)}
									</div>
									<p className="opiniao-recebida">{texto}</p>
								</li>
							),
						)}
					</ol>
				)}
			</section>
		</>
	);
}
