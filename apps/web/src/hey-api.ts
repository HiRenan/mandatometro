import type { CreateClientConfig } from "./client/client.gen";
import { ENV } from "./env";

// O cliente gerado chama esta função antes de criar a instância: aqui entra o endereço da API.
export const createClientConfig: CreateClientConfig = (config) => ({
	...config,
	baseUrl: ENV.API_URL,
});
