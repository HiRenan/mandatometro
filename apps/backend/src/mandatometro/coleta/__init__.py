"""Coleta em lote: APIs da Câmara e do Senado e páginas lidas com o Firecrawl.

Roda pela linha de comando (`mandatometro.cli`), à mão ou agendada, e grava no banco. Nunca roda
dentro de uma requisição da API. Os conectores do MVP entram nas issues #10 e #11; os do TSE (#12
e #13), depois.
"""

# Reserva tempo no job de 30 minutos para o preparo do ambiente e a saída do CLI.
LIMITE_COLETA_COM_OPCIONAIS_S = 25 * 60
