import { useEffect, useSyncExternalStore } from "react";
import type { PedidoTentativaPiloto } from "@/client";
import { enviarEtapa, esperaDoReenvio } from "./envio-do-piloto";
import {
	type Desfecho,
	type NomeDaEtapa,
	type Piloto,
	proximoPedido,
	registrarResposta,
	usePiloto,
} from "./piloto";

/*
 * O envio das etapas do piloto, com a página aberta (docs/medicao-do-piloto.md).
 * A etapa concluída fica guardada no navegador (lib/piloto.ts) até a API
 * responder. A página do piloto e o quiz final mandam o que estiver pendente,
 * um pedido de cada vez, o antes antes do depois. Sem resposta, o mesmo pedido
 * sai de novo: em 5, 15, 30 e 60 segundos e depois a cada minuto, ou nos
 * segundos que a API pedir, ou quando a internet volta. Fora dessas páginas,
 * nada se repete, e o pedido sai quando a pessoa volta a uma delas.
 *
 * O que acontece em cada visita fica só na memória da página: o envio da vez e
 * o que a API respondeu a cada etapa. A tela mostra isso numa linha
 * (components/piloto.tsx). O código do piloto não sai daqui para o console.
 */

/** O envio pendente, nesta visita: saindo, ou à espera de sair de novo. */
type Transiente =
	| { tipo: "enviando" }
	| { tipo: "limite"; segundos?: number }
	| { tipo: "fora-do-ar" }
	| { tipo: "sem-conexao" };

export type EstadoDoEnvio = {
	/** O que acontece agora com a etapa pendente. */
	readonly agora?: Transiente;
	/** O que a API respondeu a cada etapa, nesta visita. */
	readonly desfechos: Readonly<Partial<Record<NomeDaEtapa, Desfecho>>>;
};

/** O que a tela diz do envio de uma etapa. */
export type SituacaoDoEnvio = Transiente | { tipo: Desfecho };

/** Um minuto, quando o limite da API vem sem o Retry-After. */
const ESPERA_DO_LIMITE = 60;

const INICIO: EstadoDoEnvio = { desfechos: {} };

let estado: EstadoDoEnvio = INICIO;
const ouvintes = new Set<() => void>();
// Um envio de cada vez: quem chama enquanto um pedido espera não manda outro.
let emAndamento = false;
// Muda quando o envio desta visita é esquecido: o laço que esperava a API sai
// sem guardar a resposta.
let geracao = 0;
// Quantos reenvios seguidos já saíram sem resposta, para a espera crescer.
let vez = 0;
let relogio: ReturnType<typeof setTimeout> | undefined;
// Quantas páginas que mandam estão abertas: sem nenhuma, nada se repete.
let abertas = 0;

function mudar(novo: EstadoDoEnvio): void {
	estado = novo;
	for (const avisar of ouvintes) {
		avisar();
	}
}

export function lerEnvio(): EstadoDoEnvio {
	return estado;
}

function mesmoPedido(
	um: PedidoTentativaPiloto,
	outro: PedidoTentativaPiloto | undefined,
): boolean {
	return (
		outro !== undefined &&
		um.participacao === outro.participacao &&
		um.etapa === outro.etapa &&
		um.acertos === outro.acertos
	);
}

function cancelarReenvio(): void {
	clearTimeout(relogio);
	relogio = undefined;
}

function agendar(segundos: number): void {
	if (abertas === 0) {
		return;
	}
	relogio = setTimeout(() => {
		relogio = undefined;
		void enviarPendentes();
	}, segundos * 1000);
}

/**
 * Manda as etapas pendentes, uma de cada vez. Cada pedido é lido do navegador
 * na hora de sair: outra aba pode ter mandado antes, e outra pessoa pode ter
 * começado do zero. A resposta só vale para o pedido que ainda está guardado.
 */
export async function enviarPendentes(): Promise<void> {
	if (emAndamento) {
		return;
	}
	cancelarReenvio();
	emAndamento = true;
	const minha = geracao;
	try {
		for (let pedido = proximoPedido(); pedido; pedido = proximoPedido()) {
			mudar({ ...estado, agora: { tipo: "enviando" } });
			const resultado = await enviarEtapa(pedido);
			if (minha !== geracao) {
				return;
			}
			if (
				resultado.tipo === "recebida" ||
				resultado.tipo === "encerrado" ||
				resultado.tipo === "recusado"
			) {
				vez = 0;
				if (registrarResposta(pedido, resultado.tipo)) {
					mudar({
						agora: undefined,
						desfechos: { ...estado.desfechos, [pedido.etapa]: resultado.tipo },
					});
				}
				continue;
			}
			// O pedido guardado mudou durante a espera: sai o de agora.
			if (!mesmoPedido(pedido, proximoPedido())) {
				continue;
			}
			mudar({ ...estado, agora: resultado });
			agendar(
				resultado.tipo === "limite"
					? (resultado.segundos ?? ESPERA_DO_LIMITE)
					: esperaDoReenvio(vez++),
			);
			return;
		}
		vez = 0;
		if (estado.agora) {
			mudar({ ...estado, agora: undefined });
		}
	} finally {
		if (minha === geracao) {
			emAndamento = false;
		}
	}
}

/** Manda de novo na hora, sem esperar o relógio: o "Tentar de novo". */
export function tentarDeNovo(): void {
	void enviarPendentes();
}

/**
 * Conta uma página que manda como aberta: com ela, o pedido sem resposta sai de
 * novo, e sem conexão ele sai quando a internet volta. Devolve o que fecha a
 * página. Fechada a última, o reenvio para, e o erro dela deixa de valer: na
 * volta, o pedido sai de novo antes de a tela dizer alguma coisa.
 */
export function abrirPagina(): () => void {
	abertas += 1;
	const aoVoltarAInternet = () => {
		if (estado.agora?.tipo === "sem-conexao") {
			void enviarPendentes();
		}
	};
	window.addEventListener("online", aoVoltarAInternet);
	let fechada = false;
	return () => {
		if (fechada) {
			return;
		}
		fechada = true;
		abertas -= 1;
		window.removeEventListener("online", aoVoltarAInternet);
		if (abertas === 0) {
			cancelarReenvio();
			vez = 0;
			if (estado.agora && !emAndamento) {
				mudar({ ...estado, agora: undefined });
			}
		}
	};
}

/**
 * Esquece o envio desta visita, quando outra pessoa começa do zero. Um pedido
 * que já saiu termina, mas a resposta dele não vale mais, e o próximo envio não
 * espera por ele.
 */
export function esquecerEnvio(): void {
	geracao += 1;
	emAndamento = false;
	cancelarReenvio();
	vez = 0;
	mudar(INICIO);
}

/**
 * O que a tela diz do envio de uma etapa. O que está guardado no navegador
 * vale mais que a visita: outra aba pode ter recebido a resposta. Recebido ou
 * recusado o depois, o navegador só guarda que participou, e a visita diz qual
 * dos dois foi.
 */
export function situacaoDoEnvio(
	etapa: NomeDaEtapa,
	piloto: Piloto,
	envio: EstadoDoEnvio,
): SituacaoDoEnvio | undefined {
	switch (piloto.fase) {
		case "fora":
			return undefined;
		case "encerrado":
			return { tipo: "encerrado" };
		case "concluido":
			return etapa === "depois" && envio.desfechos.depois === "recusado"
				? { tipo: "recusado" }
				: { tipo: "recebida" };
		case "participando": {
			const { situacao } = piloto[etapa];
			if (situacao === "respondendo") {
				return undefined;
			}
			if (situacao === "recebida") {
				return { tipo: "recebida" };
			}
			if (situacao === "perdida") {
				return { tipo: "recusado" };
			}
			return envio.agora ?? { tipo: "enviando" };
		}
	}
}

function assinar(avisar: () => void): () => void {
	ouvintes.add(avisar);
	return () => {
		ouvintes.delete(avisar);
	};
}

/**
 * O envio, numa página que manda (a do piloto e o quiz final da trilha dele).
 * Com `ativa`, a página manda a etapa pendente quando abre e quando uma etapa
 * termina, aqui ou em outra aba.
 */
export function useEnvioDoPiloto(ativa: boolean): EstadoDoEnvio {
	const envio = useSyncExternalStore(assinar, lerEnvio, () => INICIO);
	const pedido = proximoPedido(usePiloto());
	// A chave muda com o pedido guardado, e só fica na memória da página.
	const chave =
		ativa && pedido
			? `${pedido.participacao} ${pedido.etapa} ${pedido.acertos}`
			: undefined;

	useEffect(() => (ativa ? abrirPagina() : undefined), [ativa]);

	useEffect(() => {
		if (chave !== undefined) {
			void enviarPendentes();
		}
	}, [chave]);

	return envio;
}
