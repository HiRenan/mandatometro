// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import type { ItemRevisao } from "@/client";
import { classes } from "@/lib/classes";
import { estiloDoTeto } from "@/lib/conteudo/regua";
import { paragrafos } from "@/lib/edicoes/conteudo-da-edicao";
import { classeDaFita, formatarData, plural } from "@/lib/formatar";
import {
	type CampoComFalta,
	type CamposDoItem,
	estadoDoItem,
	type LeituraDoItem,
	MAXIMO_DE_PARAGRAFOS,
} from "@/lib/painel/arquivo";
import {
	type Erro,
	idDaFaltaNoItem,
	idDoCampo,
} from "@/lib/painel/use-revisao";
import { FontesDoItem, QuadroDaVotacao } from "../item-da-edicao";

const CASAS: Record<string, string> = {
	camara: "Na Câmara",
	senado: "No Senado",
};

/** Por que o filtro de pessoal reteve o ato, nas palavras da tela. */
const RETENCOES: Record<string, string> = {
	secao_de_pessoal:
		"O ato saiu na seção do Diário Oficial dos atos de pessoal.",
	documento_pessoal: "O ato cita um documento pessoal, como o CPF.",
	ato_de_pessoal:
		"O ato parece tratar de uma pessoa, como numa nomeação ou numa licença.",
};

/** Os ids que descrevem um campo, sem os vazios. */
function descricao(...ids: Array<string | false>): string {
	return ids.filter(Boolean).join(" ");
}

/**
 * A ficha de um item do rascunho, na ordem do arquivo: o número na fita da
 * posição (o mesmo das mensagens "Item 3" da API), o estado, o título como vai
 * sair na edição, os avisos, os textos oficiais e os campos. O ato retido pede
 * a decisão sobre a privacidade antes do texto. O item marcado para sair
 * esconde os campos, que continuam guardados até o salvar.
 */
export function FichaDoItem({
	posicao,
	item,
	leitura,
	campos,
	artigos,
	avisos,
	erro,
	ocupada,
	editar,
}: {
	posicao: number;
	item: ItemRevisao;
	leitura: LeituraDoItem;
	campos: CamposDoItem;
	artigos: Record<string, string>;
	avisos: string[];
	erro: Erro | undefined;
	ocupada: boolean;
	editar: (mudar: (campos: CamposDoItem) => CamposDoItem) => void;
}) {
	const id = `item-${posicao}`;
	const estado = estadoDoItem(item, campos, leitura);
	const titulo = campos.titulo.trim() || "Item sem título";
	const quantos = paragrafos(campos.explicacao).length;
	// O aviso do salvar que repete um do rascunho ("Confira o item 2: " e o mesmo
	// texto) fica de fora.
	const doRascunho = new Set(leitura.avisos);
	const todosOsAvisos = [
		...new Set([
			...leitura.avisos,
			...avisos.filter(
				(aviso) => !doRascunho.has(aviso.replace(/^Confira o item \d+: /, "")),
			),
		]),
	];
	const idDaFalta = idDaFaltaNoItem(posicao);

	/** As ligações de um campo com a frase da falta, quando ela fala dele. */
	function daFalta(campo: CampoComFalta) {
		return erro?.campo === campo
			? { "aria-invalid": true, "aria-describedby": idDaFalta }
			: {};
	}

	function mudar<C extends keyof CamposDoItem>(
		campo: C,
		valor: CamposDoItem[C],
	) {
		editar((atual) => ({ ...atual, [campo]: valor }));
	}

	const falta = (campo?: CampoComFalta) =>
		erro && erro.campo === campo ? (
			<p id={idDaFalta} tabIndex={-1} className="falta-no-campo">
				{erro.mensagem}
			</p>
		) : null;

	return (
		<section
			id={id}
			aria-labelledby={`${id}-titulo`}
			className={classes(
				"ficha-do-item",
				classeDaFita(posicao),
				campos.excluir && "sai-da-edicao",
			)}
		>
			<div className="cabeca-da-ficha">
				<span aria-hidden="true" className="numeral">
					{posicao}
				</span>
				<span
					className={classes(
						"estado-do-item rotulo",
						estado === "Revisado" && "em-dia",
					)}
				>
					{estado}
				</span>
			</div>
			<h3
				id={`${id}-titulo`}
				className="subtitulo-condensado letra-com-teto teto-pela-caixa"
				style={estiloDoTeto(titulo, "subtitulo-condensado")}
			>
				<span className="sr-only">Item {posicao}: </span>
				{titulo}
			</h3>

			{falta()}
			{todosOsAvisos.length > 0 && (
				<ul role="list" className="avisos-do-item">
					{todosOsAvisos.map((aviso) => (
						<li key={aviso}>
							<span className="rotulo">Aviso</span> {aviso}
						</li>
					))}
				</ul>
			)}

			{leitura.tipo === "ato" ? (
				leitura.publicacao && (
					<p className="publicacao-do-ato">
						Publicado no Diário Oficial em {formatarData(leitura.publicacao)}.
					</p>
				)
			) : (
				<>
					{leitura.proposicoes.length > 0 && (
						<div className="proposicoes-do-item">
							<h4 className="rotulo">
								{leitura.proposicoes.length === 1
									? "Proposição"
									: "Proposições"}
							</h4>
							<ul role="list">
								{leitura.proposicoes.map((proposicao) => (
									<li key={proposicao.sigla}>
										<strong>{proposicao.sigla}</strong> {proposicao.ementa}
									</li>
								))}
							</ul>
						</div>
					)}
					{leitura.votacoes.map((votacao, indice) => (
						<QuadroDaVotacao
							// biome-ignore lint/suspicious/noArrayIndexKey: as votações ficam fixas, na ordem do arquivo.
							key={indice}
							votacao={votacao}
							Titulo="h4"
							descricao={[CASAS[votacao.casa], votacao.descricao]
								.filter(Boolean)
								.join(": ")}
						/>
					))}
				</>
			)}
			<FontesDoItem posicao={posicao} fontes={leitura.fontes} Titulo="h4" />

			{leitura.retido && !campos.excluir && (
				<fieldset className="privacidade-do-ato">
					<legend className="rotulo">Privacidade do ato</legend>
					<p>
						{(leitura.motivo && RETENCOES[leitura.motivo]) ??
							"O filtro de pessoal reteve este ato."}{" "}
						Confira no texto oficial se ele trata de uma pessoa. Se tratar, tire
						o item da edição.
					</p>
					<label className="marcar">
						<input
							id={idDoCampo(posicao, "privacidade")}
							type="checkbox"
							checked={campos.privacidade}
							disabled={ocupada}
							onChange={(evento) =>
								mudar("privacidade", evento.currentTarget.checked)
							}
							{...daFalta("privacidade")}
						/>
						<span>Conferi a privacidade, e o ato fica na edição</span>
					</label>
					{falta("privacidade")}
				</fieldset>
			)}

			{!campos.excluir && (
				<div className="campos-do-item">
					<h4 className="rotulo">Texto da edição</h4>
					<div className="campo-com-rotulo">
						<label htmlFor={idDoCampo(posicao, "titulo")} className="rotulo">
							Título
						</label>
						<input
							id={idDoCampo(posicao, "titulo")}
							className="campo"
							value={campos.titulo}
							maxLength={180}
							readOnly={ocupada}
							onChange={(evento) => mudar("titulo", evento.currentTarget.value)}
							{...daFalta("titulo")}
						/>
						{falta("titulo")}
					</div>
					<div className="campo-com-rotulo">
						<label
							htmlFor={idDoCampo(posicao, "explicacao")}
							className="rotulo"
						>
							Explicação
						</label>
						<textarea
							id={idDoCampo(posicao, "explicacao")}
							className="campo explicacao-do-item"
							value={campos.explicacao}
							rows={8}
							readOnly={ocupada}
							onChange={(evento) =>
								mudar("explicacao", evento.currentTarget.value)
							}
							{...daFalta("explicacao")}
							aria-describedby={descricao(
								erro?.campo === "explicacao" && idDaFalta,
								`${id}-explicacao-dica`,
							)}
						/>
						<p id={`${id}-explicacao-dica`} className="dica-do-campo">
							<span
								className={classes(
									quantos > MAXIMO_DE_PARAGRAFOS && "passou-do-limite",
								)}
							>
								{plural(quantos, "parágrafo", "parágrafos")} de até{" "}
								{MAXIMO_DE_PARAGRAFOS}
							</span>
							. Separe os parágrafos com uma linha em branco.
						</p>
						{falta("explicacao")}
					</div>
					<div className="campo-com-rotulo">
						<label htmlFor={`${id}-artigo`} className="rotulo">
							Artigo da trilha
						</label>
						<select
							id={`${id}-artigo`}
							className="campo"
							value={campos.artigo}
							disabled={ocupada}
							onChange={(evento) => {
								const artigo = evento.currentTarget.value;
								// Outro artigo pede outra confirmação.
								editar((atual) => ({
									...atual,
									artigo,
									artigoConfirmado: false,
								}));
							}}
						>
							<option value="">Sem artigo</option>
							{Object.entries(artigos).map(([caminho, nome]) => (
								<option key={caminho} value={caminho}>
									{nome}
								</option>
							))}
						</select>
					</div>
					{campos.artigo && (
						<label className="marcar">
							<input
								type="checkbox"
								checked={campos.artigoConfirmado}
								disabled={ocupada}
								onChange={(evento) =>
									mudar("artigoConfirmado", evento.currentTarget.checked)
								}
							/>
							<span>Confirmo o artigo: ele explica o assunto deste item</span>
						</label>
					)}
					<label className="marcar">
						<input
							type="checkbox"
							checked={campos.revisado}
							disabled={ocupada}
							onChange={(evento) =>
								mudar("revisado", evento.currentTarget.checked)
							}
						/>
						<span>Confirmo a revisão deste item</span>
					</label>
				</div>
			)}

			<div className="tirar-o-item">
				<label className="marcar">
					<input
						type="checkbox"
						checked={campos.excluir}
						disabled={ocupada}
						onChange={(evento) =>
							mudar("excluir", evento.currentTarget.checked)
						}
					/>
					<span>Tirar este item da edição</span>
				</label>
				{campos.excluir && (
					<div className="campo-com-rotulo">
						<label htmlFor={idDoCampo(posicao, "motivo")} className="rotulo">
							Motivo
						</label>
						<input
							id={idDoCampo(posicao, "motivo")}
							className="campo"
							value={campos.motivo}
							maxLength={500}
							readOnly={ocupada}
							onChange={(evento) => mudar("motivo", evento.currentTarget.value)}
							{...daFalta("motivo")}
							aria-describedby={descricao(
								erro?.campo === "motivo" && idDaFalta,
								`${id}-motivo-dica`,
							)}
						/>
						<p id={`${id}-motivo-dica`} className="dica-do-campo">
							Ao salvar, o item sai deste rascunho e não volta pela tela.
						</p>
						{falta("motivo")}
					</div>
				)}
			</div>
		</section>
	);
}
