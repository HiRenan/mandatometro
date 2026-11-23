/** Um pedido termina pelo prazo ou pelo sinal de quem o iniciou. */
export function sinalComPrazo(ms: number, sinal?: AbortSignal): AbortSignal {
	if (sinal?.aborted) {
		return sinal;
	}
	if (
		typeof AbortSignal.timeout === "function" &&
		(!sinal || typeof AbortSignal.any === "function")
	) {
		const prazo = AbortSignal.timeout(ms);
		return sinal ? AbortSignal.any([sinal, prazo]) : prazo;
	}

	const controle = new AbortController();
	const cancelar = () => controle.abort(sinal?.reason);
	const relogio = setTimeout(() => {
		controle.abort(
			new DOMException("O prazo do pedido acabou.", "TimeoutError"),
		);
	}, ms);
	sinal?.addEventListener("abort", cancelar, { once: true });
	controle.signal.addEventListener(
		"abort",
		() => {
			clearTimeout(relogio);
			sinal?.removeEventListener("abort", cancelar);
		},
		{ once: true },
	);
	return controle.signal;
}
