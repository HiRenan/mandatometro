"""Backend do Mandatômetro.

- `coleta` e `ia` rodam pela linha de comando (`cli`), fora das requisições HTTP, e gravam no banco.
- `api` só lê o banco e recebe inscrições.
- `avisos` manda os e-mails.
- `db` tem a conexão com o PostgreSQL e a base dos modelos.
"""
