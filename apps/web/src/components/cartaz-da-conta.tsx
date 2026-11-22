import type { CSSProperties, ReactNode, Ref } from "react";
import { sementeDe } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { tetoDoTitulo } from "@/lib/conteudo/regua";
import { Painel } from "./azulejo";
import { Reservas } from "./reservas";

/**
 * A peça comum das telas da conta (DESIGN.md, "Telas da conta"): o cartaz das
 * páginas de dentro, como o do perfil, com o painel de azulejos, o título
 * gigante apoiado no fio e o pé. No pé, o lado leva a frase da tela e, no
 * cadastro, o que a conta guarda; a ação leva o formulário, as mensagens e os
 * links entre as telas. A partir de 62rem, o lado fica à esquerda e a ação, a
 * coluna mais larga, à direita; abaixo, tudo numa coluna, na ordem do HTML.
 * Sem o lado, como na conclusão, a ação toma o pé inteiro.
 *
 * O título leva o --palavra da palavra mais larga de todos os títulos que a
 * tela pode mostrar, e não só do da vez: na conclusão, o título muda sem mudar
 * de letra. Enquanto ele pode mudar, os títulos ficam guardados, invisíveis e
 * fora do leitor de tela, na mesma célula (as Reservas), e o título tem a
 * altura do mais alto: as ações não descem quando ele muda. O da vez fica
 * embaixo, junto do fio, como na página de sair da newsletter. O título recebe
 * o foco na conclusão (o tabIndex -1), sem o anel, como depois de uma
 * navegação.
 */
export function CartazDaConta({
	titulo,
	titulos,
	refDoTitulo,
	azulejos,
	lado,
	children,
}: {
	/** O título da vez. */
	titulo: string;
	/** Todos os títulos que a tela pode mostrar, com o da vez. */
	titulos: readonly string[];
	refDoTitulo?: Ref<HTMLHeadingElement>;
	/**
	 * Quantos azulejos o painel desenha. A partir de 62rem, o painel tem a
	 * altura do cartaz, que cresce com o formulário.
	 */
	azulejos: number;
	/** O lado do pé: a frase da tela e o que mais acompanha o formulário. */
	lado?: ReactNode;
	/** A ação: o formulário, as mensagens e os links. */
	children: ReactNode;
}) {
	const teto = Math.max(
		...titulos.map((texto) => tetoDoTitulo(texto, "titulo-condensado")),
	);
	return (
		<section className="cartaz cartaz-medio">
			<Painel
				semente={sementeDe("conta")}
				colunas={4}
				quantas={azulejos}
				className="mural"
				sozinho
			/>
			<h1
				ref={refDoTitulo}
				tabIndex={-1}
				className="titulo-condensado letra-com-teto grid"
				style={{ "--palavra": String(teto) } as CSSProperties}
			>
				{titulos.length > 1 && <Reservas frases={titulos} />}
				<span className="col-start-1 row-start-1 self-end">{titulo}</span>
			</h1>
			<div className={classes("cartaz-pe conta-pe", !lado && "conta-pe-so")}>
				{lado && <div className="conta-lado">{lado}</div>}
				<div className="cartaz-acao conta-acao">{children}</div>
			</div>
		</section>
	);
}
