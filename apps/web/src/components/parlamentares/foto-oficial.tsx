import { useEffect, useRef, useState } from "react";
import type { FotoParlamentar } from "@/client";

/**
 * A largura e a altura da foto no HTML, na proporção 3 por 4 das fotos oficiais:
 * o navegador reserva a caixa antes de a foto chegar, e nada pula. O tamanho na
 * tela vem do CSS.
 */
export const LARGURA_DA_FOTO = 300;
export const ALTURA_DA_FOTO = 400;

/**
 * A foto oficial da pessoa no cartaz, como um retrato colado nos azulejos (o
 * Renan, em 23/11/2026: "Retrato na parede"), com o crédito da Casa à vista. A
 * imagem vem direto do site da Câmara ou do Senado, sem o endereço da página
 * (no-referrer). Enquanto ela chega, e quando ela não chega, a moldura mostra o
 * azulejo cru, papel sobre papel: a falha tira a foto e esconde o crédito, que
 * guarda o lugar dele (o nome não sobe), e a moldura sai do leitor de tela. A
 * foto que falhou antes da hidratação não avisa mais o React, e a página
 * confere o estado dela quando o JavaScript chega. Sem o JavaScript, o CSS
 * cobre o ícone da imagem quebrada (o img::after).
 */
export function FotoOficial({
	foto,
	nome,
}: {
	foto: FotoParlamentar;
	nome: string;
}) {
	const imagem = useRef<HTMLImageElement>(null);
	const [falhou, setFalhou] = useState(false);
	useEffect(() => {
		const atual = imagem.current;
		if (atual?.complete && atual.naturalWidth === 0) {
			setFalhou(true);
		}
	}, []);
	return (
		<figure
			className={falhou ? "foto-oficial foto-que-falhou" : "foto-oficial"}
			aria-hidden={falhou || undefined}
		>
			<div className="moldura-da-foto">
				{!falhou && (
					<img
						ref={imagem}
						src={foto.url}
						alt={nome}
						width={LARGURA_DA_FOTO}
						height={ALTURA_DA_FOTO}
						referrerPolicy="no-referrer"
						decoding="async"
						onError={() => setFalhou(true)}
					/>
				)}
			</div>
			<figcaption className="rotulo credito-da-foto">
				Foto: {foto.credito}
			</figcaption>
		</figure>
	);
}
