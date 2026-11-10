// Os arquivos das duas fontes no alfabeto latino, que cobre o português, para o
// <link rel="preload"> da raiz do site: pedidos logo no começo da página, eles
// chegam antes de o texto aparecer, e o texto não pula quando trocam a fonte
// reserva. São os mesmos arquivos do globals.css, e o Vite dá o mesmo endereço
// aos dois.
import archivo from "@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2";
import literata from "@fontsource-variable/literata/files/literata-latin-opsz-normal.woff2";

export const fontes = { archivo, literata };
