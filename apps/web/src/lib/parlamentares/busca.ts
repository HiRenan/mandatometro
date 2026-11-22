import {
	defaultParseSearch,
	defaultStringifySearch,
} from "@tanstack/react-router";

// O formulário GET envia a sigla como texto. O router interpreta números e
// JSON na busca por padrão, por isso só o partido conserva o texto literal.
export const buscaComPartido = {
	parseSearch(busca: string) {
		const valores = defaultParseSearch(busca);
		if ("partido" in valores && !Array.isArray(valores.partido)) {
			valores.partido = new URLSearchParams(busca).get("partido");
		}
		return valores;
	},
	stringifySearch(valores: Record<string, unknown>) {
		const { partido, ...outros } = valores;
		if (typeof partido !== "string") {
			return defaultStringifySearch(valores);
		}
		const busca = defaultStringifySearch(outros);
		const campo = new URLSearchParams({ partido });
		return busca ? `${busca}&${campo}` : `?${campo}`;
	},
};
