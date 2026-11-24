import { useEffect, useRef, useState } from "react";
import type { FotoParlamentar } from "@/client";
import { ALTURA_DA_FOTO, LARGURA_DA_FOTO } from "./foto-oficial";

/**
 * O retrato de um nome da lista (o Renan, em 23/11/2026, na #305: "Chamada com
 * retrato"): a foto oficial pequena, na moldura com a margem de papel e o fio de
 * tinta, como o retrato da página da pessoa. É enfeite: o link já tem o nome, e
 * o retrato fica fora do leitor de tela. A foto vem direto do site da Câmara ou
 * do Senado, sem o endereço da página (no-referrer), e só é pedida quando chega
 * perto da tela (lazy). Enquanto ela chega, quando ela falha e quando falta nos
 * dados, a moldura mostra o azulejo cru, e nada pula. A foto que falhou antes da
 * hidratação não avisa mais o React: o retrato confere o estado dela quando o
 * JavaScript chega, como a FotoOficial.
 */
export function RetratoNaLista({ foto }: { foto: FotoParlamentar | null }) {
	const imagem = useRef<HTMLImageElement>(null);
	const [falhou, setFalhou] = useState(false);
	useEffect(() => {
		// A foto lazy que ainda não foi pedida não está completa: só a que já
		// falhou tem o complete com a largura natural 0.
		const atual = imagem.current;
		if (atual?.complete && atual.naturalWidth === 0) {
			setFalhou(true);
		}
	}, []);
	return (
		<span className="retrato-na-lista" aria-hidden="true">
			{foto && !falhou && (
				<img
					ref={imagem}
					src={foto.url}
					alt=""
					width={LARGURA_DA_FOTO}
					height={ALTURA_DA_FOTO}
					loading="lazy"
					decoding="async"
					referrerPolicy="no-referrer"
					onError={() => setFalhou(true)}
				/>
			)}
		</span>
	);
}
