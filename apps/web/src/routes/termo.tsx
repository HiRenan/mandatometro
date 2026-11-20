import { createFileRoute } from "@tanstack/react-router";
import { PaginaDoTermo } from "@/components/pagina-do-termo";
import { metaDaPagina } from "@/lib/meta";

// O termo de consentimento da conta (/termo), a página que o cadastro abre em
// outra aba (o CONTA_TERMO_URL da API). O texto está no código: a rota não tem
// loader nem consulta a API, e a página abre sem conta e sem JavaScript. Com a
// API configurada e a sessão anotada, a moldura consulta o progresso no navegador
// como nas outras páginas (__root.tsx).
export const Route = createFileRoute("/termo")({
	head: () => ({
		meta: metaDaPagina({
			titulo: "Termo de consentimento",
			descricao:
				"O que a conta do Mandatômetro guarda, para que serve cada dado, quem vê e como apagar tudo. A conta é opcional: o site funciona sem ela.",
		}),
	}),
	component: PaginaDoTermo,
});
