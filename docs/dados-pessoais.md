# Dados pessoais

O regulamento do hackathon (item 6.9) proíbe a demo de expor dados pessoais reais de terceiros.

## Parlamentares e candidatos

CPF, título de eleitor e data de nascimento de parlamentares e candidatos servem só para ligar registros entre bases e ficam no banco. A API, o front, os logs e os fixtures de teste identificam pessoas pelo id interno.

No MVP, a coleta descarta `cpf` e `dataNascimento` de `/deputados/{id}`. O banco ainda não tem colunas para eles. A ligação por CPF só entra com o TSE, depois do MVP (#12 e #13). Veja os [campos pessoais das fontes](dicionario-de-dados.md#campos-pessoais).

## Ausências e afastamentos

Motivo de ausência fica fora do banco, para a licença saúde não ser deduzida: toda ausência do Senado (AP, LS, MIS, NCom, LAP, LP e as que entrarem em `CODIGOS_DE_AUSENCIA`) entra como `nao_votou`, sem o código, igual às outras, e o motivo de afastamento do senador não é gravado. O voto só guarda os códigos de voto e de presença de `CODIGOS_GRAVADOS` em `valor_bruto`, o que o CHECK do banco garante, e um código novo entra como `outro`, sem o código. O log também não leva o código nem a pessoa, porque o log junto com o banco apontaria quem recebeu um código que pode ser de saúde: a coleta (#10 e #11) registra a votação e quantos códigos desconhecidos vieram nela, e quem for classificar o código o lê na fonte pública.

## Inscrição e conta

A newsletter pede só o e-mail, que fica no banco e só sai para o envio. Site, API, logs e fixtures de teste identificam a inscrição pelo id interno.

A conta é opcional e pede nome completo, e-mail e senha. Os dados da conta, incluindo os campos opcionais do cadastro, servem só à conta e ficam no banco: a API, os logs e os fixtures de teste não os levam, fora a resposta à própria pessoa. A senha nunca é guardada em texto puro e não sai do banco, nem na resposta à própria pessoa. Nos testes, os dados da conta são inventados.

## Trilhas e piloto

As trilhas não pedem dados pessoais. As respostas do quiz não identificam quem respondeu. O piloto segue o [contrato de medição](medicao-do-piloto.md#conteúdo-e-dados).
