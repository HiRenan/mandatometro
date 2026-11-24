import { useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useReducer, useRef } from "react";
import {
	type ArquivoRevisao,
	lerRascunho,
	publicarEdicao,
	salvarRevisao,
} from "@/client";
import { ENV } from "@/env";
import { plural } from "@/lib/formatar";
import {
	type AvisosNoLugar,
	avisosNoRascunhoNovo,
	type CampoComFalta,
	type Campos,
	camposDoArquivo,
	corpoDaRevisao,
	emLista,
	faltaNaEdicao,
	faltaNoItem,
	juntarAoRascunhoAtual,
	type LeituraDoItem,
	lerItem,
	lugarDaMensagem,
	revisaoAlterada,
} from "./arquivo";
import {
	acessoRecusado,
	falhaDe,
	opcoes,
	pedir,
	type Resposta,
} from "./pedido";

// O estado da tela de revisão (/painel). O rascunho fica só aqui, na memória da
// página: nada dele vai para o console, a URL, o armazenamento do navegador, o
// router ou o React Query. Cada pedido leva o cookie da sessão, que é da API
// (credentials: "include"), e nenhum fica no cache do navegador (pedido.ts).

/** Onde o foco vai depois de uma resposta: o id de um elemento da página. */
type Foco = { alvo: string; vez: number };

/**
 * Uma falta ou uma recusa, no lugar dela. Com o campo, a frase fica embaixo
 * dele, e o foco vai para o campo; sem ele (a recusa da API), a frase fica no
 * alto da ficha, e o foco vai para ela.
 */
export type Erro = { mensagem: string; campo?: CampoComFalta };

export type Aberta = {
	tipo: "aberta";
	arquivo: ArquivoRevisao;
	leituras: LeituraDoItem[];
	campos: Campos;
	operacao: "salvando" | "publicando" | null;
	/** A falha do último envio, no pé. Some com a próxima mudança. */
	falha: string | null;
	/** O aviso do rascunho que mudou (409), no pé, até o próximo envio. */
	nota: string | null;
	/** O que faltou ou a API recusou, no lugar: o item pela posição e a edição. */
	erros: { edicao?: Erro; itens: Map<number, Erro> };
	/** Os avisos do último salvar, no lugar. */
	avisos: AvisosNoLugar;
	/** O salvar acabou de dar certo, e nada mudou desde então. */
	salva: boolean;
};

export type Revisao =
	| { tipo: "carregando" }
	| { tipo: "sem-api" }
	| { tipo: "sem-rascunho" }
	| { tipo: "falhou"; mensagem: string }
	| Aberta
	/** O salvar deu certo, mas a versão nova não chegou. */
	| { tipo: "salva-sem-releitura" }
	| { tipo: "publicada"; edicaoId: number; jaEstava: boolean }
	/** A edição foi publicada ou trocada enquanto a pessoa revisava. */
	| { tipo: "trocada" }
	/** A API respondeu 401 ou 404 e a guarda está conferindo o acesso de novo. */
	| { tipo: "saiu" };

type Estado = { revisao: Revisao; foco: Foco | null };

type Acao =
	| { tipo: "carregando" }
	| { tipo: "sem-api" }
	| { tipo: "carregou"; arquivo: ArquivoRevisao | null; falha?: string }
	| { tipo: "nao-carregou"; mensagem: string }
	| { tipo: "editou"; mudar: (campos: Campos) => Campos }
	| { tipo: "enviando"; operacao: "salvando" | "publicando" }
	| { tipo: "salvou"; arquivo: ArquivoRevisao; avisos: AvisosNoLugar }
	| {
			tipo: "nao-enviou";
			falha: string;
			erros?: Aberta["erros"];
			alvo: string;
	  }
	| {
			tipo: "juntou";
			arquivo: ArquivoRevisao;
			juncao: ReturnType<typeof juntarAoRascunhoAtual>;
	  }
	| { tipo: "publicou"; edicaoId: number; jaEstava: boolean }
	| { tipo: "trocada" }
	| { tipo: "salva-sem-releitura" }
	| { tipo: "saiu" };

const SEM_AVISOS: AvisosNoLugar = { edicao: [], itens: new Map(), pe: [] };

function aberta(arquivo: ArquivoRevisao, campos?: Campos): Aberta {
	return {
		tipo: "aberta",
		arquivo,
		leituras: arquivo.itens.map(lerItem),
		campos: campos ?? camposDoArquivo(arquivo),
		operacao: null,
		falha: null,
		nota: null,
		erros: { itens: new Map() },
		avisos: SEM_AVISOS,
		salva: false,
	};
}

function focar(estado: Estado, alvo: string): Foco {
	return { alvo, vez: (estado.foco?.vez ?? 0) + 1 };
}

/** O id da frase de falta ou de recusa de um item. */
export const idDaFaltaNoItem = (posicao: number) => `item-${posicao}-falta`;
/** O id de um campo do item, para o foco e os rótulos. */
export const idDoCampo = (posicao: number, campo: CampoComFalta) =>
	`item-${posicao}-campo-${campo}`;
export const ID_DA_FALTA_NA_EDICAO = "edicao-falta";
export const ID_DO_TITULO_DA_EDICAO = "edicao-titulo";
export const ID_DA_MENSAGEM_DO_PE = "pe-da-revisao-mensagem";
export const ID_DO_RESULTADO = "painel-resultado";

function fraseDoConflito({
	itensAlteradosQueSairam,
	confirmacoesDePrivacidadePerdidas,
}: ReturnType<typeof juntarAoRascunhoAtual>): string {
	const inicio =
		"O rascunho mudou enquanto você revisava. Carregamos a versão atual";
	const fim = "Confira e salve de novo.";
	const perdaDeItens = itensAlteradosQueSairam
		? `O que você alterou em ${plural(itensAlteradosQueSairam, "item que saiu da edição", "itens que saíram da edição")} ficou de fora`
		: "";
	if (confirmacoesDePrivacidadePerdidas) {
		const atos = plural(
			confirmacoesDePrivacidadePerdidas,
			"ato que não precisa mais dessa conferência",
			"atos que não precisam mais dessa conferência",
		);
		const retirada = perdaDeItens ? `${perdaDeItens}. ` : "";
		return `${inicio}. ${retirada}A confirmação de privacidade ficou de fora em ${atos}. O resto do que você alterou foi mantido. ${fim}`;
	}
	if (perdaDeItens) {
		return `${inicio}. ${perdaDeItens}; o resto foi mantido. ${fim}`;
	}
	return `${inicio} e mantivemos o que você alterou. ${fim}`;
}

function reduzir(estado: Estado, acao: Acao): Estado {
	const { revisao } = estado;
	switch (acao.tipo) {
		case "carregando":
			return { ...estado, revisao: { tipo: "carregando" } };
		case "sem-api":
			return { ...estado, revisao: { tipo: "sem-api" } };
		case "carregou": {
			if (!acao.arquivo) {
				return { ...estado, revisao: { tipo: "sem-rascunho" } };
			}
			const nova = aberta(acao.arquivo);
			if (acao.falha) {
				return {
					revisao: { ...nova, falha: acao.falha },
					foco: focar(estado, ID_DA_MENSAGEM_DO_PE),
				};
			}
			return { ...estado, revisao: nova };
		}
		case "nao-carregou":
			return {
				...estado,
				revisao: { tipo: "falhou", mensagem: acao.mensagem },
			};
		case "editou":
			if (revisao.tipo !== "aberta" || revisao.operacao) {
				return estado;
			}
			return {
				...estado,
				revisao: {
					...revisao,
					campos: acao.mudar(revisao.campos),
					falha: null,
					salva: false,
				},
			};
		case "enviando":
			if (revisao.tipo !== "aberta") {
				return estado;
			}
			return {
				...estado,
				revisao: {
					...revisao,
					operacao: acao.operacao,
					falha: null,
					nota: null,
					salva: false,
				},
			};
		case "salvou":
			return {
				...estado,
				revisao: { ...aberta(acao.arquivo), avisos: acao.avisos, salva: true },
			};
		case "nao-enviou":
			if (revisao.tipo !== "aberta") {
				return estado;
			}
			return {
				revisao: {
					...revisao,
					operacao: null,
					falha: acao.falha,
					erros: acao.erros ?? revisao.erros,
				},
				foco: focar(estado, acao.alvo),
			};
		case "juntou":
			return {
				revisao: {
					...aberta(acao.arquivo, acao.juncao.campos),
					nota: fraseDoConflito(acao.juncao),
				},
				foco: focar(estado, ID_DA_MENSAGEM_DO_PE),
			};
		case "publicou":
			return {
				revisao: {
					tipo: "publicada",
					edicaoId: acao.edicaoId,
					jaEstava: acao.jaEstava,
				},
				foco: focar(estado, ID_DO_RESULTADO),
			};
		case "trocada":
			return {
				revisao: { tipo: "trocada" },
				foco: focar(estado, ID_DO_RESULTADO),
			};
		case "salva-sem-releitura":
			return {
				revisao: { tipo: "salva-sem-releitura" },
				foco: focar(estado, ID_DO_RESULTADO),
			};
		case "saiu":
			return { revisao: { tipo: "saiu" }, foco: null };
	}
}

/** Onde a frase de uma recusa fica: o item, o título da edição ou o pé. */
function noLugar(
	mensagem: string,
	quantos: number,
): { erros: Aberta["erros"]; alvo: string; onde: string } {
	const lugar = lugarDaMensagem(mensagem);
	if (lugar.onde === "item" && lugar.posicao >= 1 && lugar.posicao <= quantos) {
		return {
			erros: { itens: new Map([[lugar.posicao, { mensagem }]]) },
			alvo: idDaFaltaNoItem(lugar.posicao),
			onde: `no item ${lugar.posicao}`,
		};
	}
	if (lugar.onde === "edicao") {
		return {
			erros: { edicao: { mensagem }, itens: new Map() },
			alvo: ID_DA_FALTA_NA_EDICAO,
			onde: "no título da edição",
		};
	}
	return { erros: { itens: new Map() }, alvo: ID_DA_MENSAGEM_DO_PE, onde: "" };
}

/**
 * Um envio recusado: a frase no pé, que começa pelo que não aconteceu, e, na
 * recusa editorial (422), a mensagem da API no item ou no título da edição de
 * que ela fala. As mudanças da pessoa ficam na tela.
 */
function recusa(
	resposta: Resposta<unknown>,
	prefixo: string,
	arquivo: ArquivoRevisao,
): Acao {
	if (resposta.tipo === "erro" && resposta.status === 422 && resposta.detalhe) {
		const lugar = noLugar(resposta.detalhe, arquivo.itens.length);
		return {
			tipo: "nao-enviou",
			falha: lugar.onde
				? `${prefixo} Veja o aviso ${lugar.onde}.`
				: `${prefixo} ${resposta.detalhe}`,
			erros: lugar.erros,
			alvo: lugar.alvo,
		};
	}
	return {
		tipo: "nao-enviou",
		falha: `${prefixo} ${falhaDe(resposta)}`,
		alvo: ID_DA_MENSAGEM_DO_PE,
	};
}

/**
 * O rascunho da semana e o que a administradora faz com ele: editar, salvar e
 * publicar. A página só monta depois da guarda do layout (_autenticado.tsx), e
 * só então o rascunho é pedido.
 *
 * Um 401 ou 404 em qualquer pedido tira o rascunho e a moldura da tela na hora.
 * A guarda roda de novo (router.invalidate) e decide se a revisão pode voltar.
 */
export function useRevisao() {
	const router = useRouter();
	const [estado, despachar] = useReducer(reduzir, {
		revisao: { tipo: "carregando" },
		foco: null,
	});
	const atual = useRef(estado.revisao);
	atual.current = estado.revisao;
	const controle = useRef<AbortController>(null);

	const acoes = useMemo(() => {
		/** O sinal da página montada: cada operação guarda o dela ao começar. */
		function sinalDaPagina() {
			return controle.current?.signal ?? AbortSignal.abort();
		}

		async function carregar(falha?: string) {
			if (!ENV.API_URL) {
				despachar({ tipo: "sem-api" });
				return;
			}
			const sinal = sinalDaPagina();
			despachar({ tipo: "carregando" });
			const resposta = await pedir(lerRascunho(opcoes(sinal)));
			if (sinal.aborted) {
				return;
			}
			if (resposta.tipo === "ok") {
				despachar({ tipo: "carregou", arquivo: resposta.dados, falha });
			} else if (resposta.tipo === "erro" && acessoRecusado(resposta.status)) {
				await perdeuOAcesso(sinal);
			} else {
				despachar({ tipo: "nao-carregou", mensagem: falhaDe(resposta) });
			}
		}

		async function perdeuOAcesso(sinal: AbortSignal, falha?: string) {
			// O rascunho sai da conta na hora, antes de a tela trocar: o login a que
			// a guarda leva não pergunta se a pessoa quer sair sem salvar.
			atual.current = { tipo: "saiu" };
			despachar({ tipo: "saiu" });
			await router.invalidate();
			// Se a guarda deixou passar, ela ainda é administradora, e a página segue
			// montada: o rascunho atual volta, com a frase da API no pé.
			if (!sinal.aborted) {
				await carregar(falha);
			}
		}

		/** Relê o rascunho depois de um envio, ou null se a página saiu ou o acesso caiu. */
		async function reler(sinal: AbortSignal) {
			const releitura = await pedir(lerRascunho(opcoes(sinal)));
			if (sinal.aborted) {
				return null;
			}
			if (releitura.tipo === "erro" && acessoRecusado(releitura.status)) {
				await perdeuOAcesso(sinal);
				return null;
			}
			return releitura;
		}

		function editar(mudar: (campos: Campos) => Campos) {
			despachar({ tipo: "editou", mudar });
		}

		async function salvar() {
			const revisao = atual.current;
			if (revisao.tipo !== "aberta" || revisao.operacao) {
				return;
			}
			const { arquivo, campos, leituras } = revisao;

			// As conferências da tela vêm antes do envio, com as palavras dela.
			const faltas = new Map<number, Erro>();
			campos.itens.forEach((item, indice) => {
				const falta = faltaNoItem(item, leituras[indice]);
				if (falta) {
					faltas.set(indice + 1, falta);
				}
			});
			const naEdicao = faltaNaEdicao(campos.edicao);
			if (naEdicao || faltas.size > 0) {
				const posicoes = [...faltas.keys()];
				const lugares = [
					...(naEdicao ? ["no título da edição"] : []),
					...posicoes.map((posicao) => `no item ${posicao}`),
				];
				const [primeira] = posicoes;
				const campo = faltas.get(primeira)?.campo;
				despachar({
					tipo: "nao-enviou",
					falha: `A revisão não foi salva. Veja ${lugares.length > 1 ? "os avisos" : "o aviso"} ${emLista(lugares)}.`,
					erros: {
						edicao: naEdicao
							? { mensagem: naEdicao, campo: "titulo" }
							: undefined,
						itens: faltas,
					},
					alvo: naEdicao
						? ID_DO_TITULO_DA_EDICAO
						: campo
							? idDoCampo(primeira, campo)
							: idDaFaltaNoItem(primeira),
				});
				return;
			}

			const sinal = sinalDaPagina();
			despachar({ tipo: "enviando", operacao: "salvando" });
			const enviado = corpoDaRevisao(arquivo, campos);
			const resposta = await pedir(
				salvarRevisao({
					...opcoes(sinal),
					path: { id: arquivo.edicao_id },
					body: enviado,
				}),
			);
			if (sinal.aborted) {
				return;
			}

			if (resposta.tipo === "ok") {
				const releitura = await reler(sinal);
				if (!releitura) {
					return;
				}
				if (releitura.tipo !== "ok") {
					despachar({ tipo: "salva-sem-releitura" });
				} else if (releitura.dados?.edicao_id === arquivo.edicao_id) {
					despachar({
						tipo: "salvou",
						arquivo: releitura.dados,
						avisos: avisosNoRascunhoNovo(
							resposta.dados.avisos,
							enviado,
							releitura.dados,
						),
					});
				} else {
					despachar({ tipo: "trocada" });
				}
				return;
			}

			if (resposta.tipo === "erro" && acessoRecusado(resposta.status)) {
				await perdeuOAcesso(
					sinal,
					resposta.detalhe && `A revisão não foi salva. ${resposta.detalhe}`,
				);
				return;
			}

			if (resposta.tipo === "erro" && resposta.status === 409) {
				// A tela pega o rascunho atual, passa o que couber e avisa o que se perdeu.
				const releitura = await reler(sinal);
				if (!releitura) {
					return;
				}
				if (releitura.tipo !== "ok") {
					despachar(recusa(releitura, "A revisão não foi salva.", arquivo));
				} else if (releitura.dados?.edicao_id === arquivo.edicao_id) {
					despachar({
						tipo: "juntou",
						arquivo: releitura.dados,
						juncao: juntarAoRascunhoAtual(arquivo, campos, releitura.dados),
					});
				} else {
					despachar({ tipo: "trocada" });
				}
				return;
			}

			despachar(recusa(resposta, "A revisão não foi salva.", arquivo));
		}

		async function publicar() {
			const revisao = atual.current;
			if (revisao.tipo !== "aberta" || revisao.operacao) {
				return;
			}
			const sinal = sinalDaPagina();
			despachar({ tipo: "enviando", operacao: "publicando" });
			const resposta = await pedir(
				publicarEdicao({
					...opcoes(sinal),
					path: { id: revisao.arquivo.edicao_id },
				}),
			);
			if (sinal.aborted) {
				return;
			}
			if (resposta.tipo === "ok") {
				despachar({
					tipo: "publicou",
					edicaoId: resposta.dados.edicao_id,
					jaEstava: resposta.dados.situacao === "ja_publicada",
				});
			} else if (resposta.tipo === "erro" && acessoRecusado(resposta.status)) {
				await perdeuOAcesso(
					sinal,
					resposta.detalhe && `A edição não foi publicada. ${resposta.detalhe}`,
				);
			} else {
				despachar(
					recusa(resposta, "A edição não foi publicada.", revisao.arquivo),
				);
			}
		}

		/** Há alterações por salvar no rascunho que está na tela, agora. */
		function temAlteracoes() {
			const revisao = atual.current;
			return (
				revisao.tipo === "aberta" &&
				revisaoAlterada(revisao.arquivo, revisao.campos)
			);
		}

		return { carregar, editar, salvar, publicar, temAlteracoes };
	}, [router]);

	useEffect(() => {
		const novo = new AbortController();
		controle.current = novo;
		void acoes.carregar();
		return () => novo.abort();
	}, [acoes]);

	return { revisao: estado.revisao, foco: estado.foco, ...acoes };
}
