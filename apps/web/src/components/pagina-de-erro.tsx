import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Aviso, useAviso } from "@/components/aviso";
import { focarNoTitulo } from "@/lib/foco";

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
		<div
			data-pagina-de-erro
			className="px-margem-celular mx-auto max-w-[1440px] pt-10 pb-20 md:px-16"
		>
			<h1 className="titulo-condensado text-[2.5rem] md:text-[3.5rem] xl:text-[4.75rem]">
				A página não carregou
			</h1>
			<p className="mt-5 max-w-[40ch] font-serif text-xl leading-snug xl:text-[1.5625rem]">
				Pode ser a sua internet ou uma falha no site. Os artigos que você já leu
				continuam marcados.
			</p>
			<ul className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-[1.1875rem] font-bold">
				<li>
					<button
						ref={botao}
						type="button"
						onClick={tentarDeNovo}
						className="acao-de-texto text-[1.1875rem] font-bold"
					>
						Tentar de novo
					</button>
				</li>
				<li>
					<Link to="/trilhas" activeOptions={{ exact: true }}>
						Ver as trilhas
					</Link>
				</li>
			</ul>
			{tentouAqui && (
				<p className="mt-6 max-w-[40ch] text-xl font-bold">{AINDA_NAO}</p>
			)}
			<Aviso texto={aviso} />
		</div>
	);
}
