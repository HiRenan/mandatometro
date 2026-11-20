/**
 * Enquanto o site confere a sessão do painel, a página mostra só esta frase, no
 * lugar e na letra do carregando (o .carregando, no index.css). Ela não traz o
 * título da tela: quem não é administradora não fica sabendo o que há ali. É
 * também o que o servidor manda no HTML de /painel, porque o layout não roda
 * no servidor (routes/_autenticado.tsx). Ela não leva o foco: na primeira
 * carga, o foco fica no começo da página, e, depois da guarda, vai para o
 * título da tela (__root.tsx).
 */
export function VerificandoSessao() {
	return (
		<p role="status" className="carregando rotulo">
			Verificando sua sessão…
		</p>
	);
}
