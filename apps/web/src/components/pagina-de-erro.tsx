import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Aviso, useAviso } from "@/components/aviso";
import { sementeDe } from "@/lib/azulejos";
import { focarNoTitulo } from "@/lib/foco";
import { Painel } from "./azulejo";
import { BOTAO_CONTINUAR } from "./botao-continuar";

const AINDA_NAO =
	"Ainda não deu. Confira a internet ou espere um pouco e tente de novo.";

// O router monta a página de erro de novo a cada tentativa que falha, e o estado
// do componente se perde. Por isso a última tentativa fica aqui fora, com a chave
// da navegação: numa navegação nova, a página de erro começa sem o aviso.
let ultimaTentativa: string | undefined;

/**
 * A página de erro, para quando uma página não chega: a internet caiu no meio da
 * navegação ou o servidor falhou. Ela fica dentro do site, com o cabeçalho, e não
 * mostra a mensagem técnica do erro.
 */
export function PaginaDeErro() {
	const router = useRouter();
	const chave = useRouterState({
		select: (estado) => estado.location.state.__TSR_key ?? estado.location.href,
	});
	const tentouAqui = ultimaTentativa === chave;
	const { aviso, avisar } = useAviso();
	const botao = useRef<HTMLButtonElement>(null);

	// Depois de uma tentativa que falhou, o foco volta para o botão, e o leitor de
	// tela ouve que ainda não deu.
	useEffect(() => {
		if (tentouAqui) {
			botao.current?.focus();
			avisar(AINDA_NAO);
		}
	}, [tentouAqui, avisar]);

	// Pede a página de novo, sem recarregar: o que está salvo no navegador fica.
	// Enquanto o pedido não volta, o router mostra o mesmo aviso de carregando das
	// navegações.
	async function tentarDeNovo() {
		ultimaTentativa = chave;
		await router.invalidate();
		// Se a página chegou, o foco vai para o título dela, como numa navegação.
		if (!document.querySelector("[data-pagina-de-erro]")) {
			ultimaTentativa = undefined;
			focarNoTitulo();
		}
	}

	return (
		<section data-pagina-de-erro className="cartaz cartaz-medio">
			<Painel
				semente={sementeDe("erro")}
				colunas={4}
				quantas={64}
				className="mural"
				sozinho
			/>
			{/* Com a letra grande, o título cresce até "CARREGOU" encostar nas margens
			    (o letra-com-teto do index.css). */}
			<h1 className="titulo-condensado letra-com-teto [--palavra:4.15]">
				A página não carregou
			</h1>
			<div className="cartaz-pe">
				<p className="abertura">
					Pode ser a sua internet ou uma falha no site. Os artigos que você já
					leu continuam marcados.
				</p>
				<ul className="acoes-da-pagina">
					<li>
						<button
							ref={botao}
							type="button"
							onClick={tentarDeNovo}
							className={BOTAO_CONTINUAR}
						>
							Tentar de novo
						</button>
					</li>
					<li>
						<Link
							to="/trilhas"
							activeOptions={{ exact: true }}
							className="acao-de-texto"
						>
							<span>Ver as trilhas</span>
						</Link>
					</li>
				</ul>
				{tentouAqui && <p className="ainda-nao">{AINDA_NAO}</p>}
			</div>
			<Aviso texto={aviso} />
		</section>
	);
}
