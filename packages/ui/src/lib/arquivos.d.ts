// O Vite troca o import de um arquivo de fonte pelo endereço dele. O site tem os
// tipos do Vite (vite/client); o pacote de UI, que não depende do Vite, usa este.
declare module "*.woff2" {
	const endereco: string;
	export default endereco;
}
