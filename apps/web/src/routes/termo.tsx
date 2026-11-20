import { createFileRoute } from "@tanstack/react-router";
import { PaginaDoTermo } from "@/components/pagina-do-termo";
import { metaDaPagina } from "@/lib/meta";

// O termo de consentimento da conta (/termo), a página que o cadastro abre em
// outra aba (o CONTA_TERMO_URL da API). O texto está no código: a rota não tem
// loader nem pede nada à API, e a página abre sem conta e sem JavaScript.
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
