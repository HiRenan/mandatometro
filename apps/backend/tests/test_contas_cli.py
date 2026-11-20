from uuid import uuid4

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro import db
from mandatometro.cli import main
from mandatometro.contas import agora
from mandatometro.db.modelos import Conta


def test_cli_altera_so_o_papel_de_conta_confirmada(engine_de_teste, monkeypatch, capsys, caplog):
    monkeypatch.setattr(db, "engine", lambda: engine_de_teste)
    confirmada, pendente = uuid4(), uuid4()
    email = f"{confirmada.hex}@example.com"
    email_pendente = f"{pendente.hex}@example.com"
    with Session(engine_de_teste) as sessao, sessao.begin():
        for id_conta, endereco, confirmada_em in (
            (confirmada, email, agora()),
            (pendente, email_pendente, None),
        ):
            sessao.add(
                Conta(
                    id=id_conta,
                    email=endereco,
                    nome="Conta de teste",
                    senha_hash="hash-ficticio",
                    termo="teste",
                    aceite_em=agora(),
                    criada_em=agora(),
                    confirmada_em=confirmada_em,
                )
            )

    def rodar(acao, endereco, codigo, mensagem):
        assert main(["conta", acao, "--email", endereco]) == codigo
        saida = capsys.readouterr()
        linha = mensagem + "\n"
        assert (saida.out, saida.err) == ((linha, "") if codigo == 0 else ("", linha))

    for acao in ("promover", "revogar"):
        rodar(acao, f"{uuid4().hex}@example.com", 3, "Conta não encontrada.")
        rodar(acao, email_pendente, 4, "Conta ainda não confirmada.")
    rodar("promover", email.upper(), 0, "Conta promovida a administradora.")
    rodar("promover", email, 5, "A conta já é administradora.")
    with Session(engine_de_teste) as sessao:
        assert sessao.get(Conta, confirmada).papel == "administradora"
        assert sessao.get(Conta, pendente).papel == "comum"
    rodar("revogar", email, 0, "Papel de administradora removido.")
    rodar("revogar", email, 5, "A conta já é comum.")
    with Session(engine_de_teste) as sessao:
        assert sessao.get(Conta, confirmada).papel == "comum"
    assert email not in caplog.text and email_pendente not in caplog.text


def test_cli_oculta_argumento_inesperado(capsys):
    with pytest.raises(SystemExit) as erro:
        main(["conta", "promover", "--email", "alvo@example.com", "extra@example.com"])
    assert erro.value.code == 2
    assert capsys.readouterr() == ("", "Argumentos inválidos.\n")


def test_cli_oculta_endereco_invalido(capsys):
    assert main(["conta", "promover", "--email", "alvo@example.com endereço"]) == 2
    assert capsys.readouterr() == ("", "E-mail inválido.\n")


def test_cli_oculta_detalhe_de_falha_no_banco(monkeypatch, capsys, caplog):
    email = "alvo@example.com"

    def falhar():
        raise SQLAlchemyError(email)

    monkeypatch.setattr(db, "engine", falhar)
    assert main(["conta", "promover", "--email", email]) == 1
    assert capsys.readouterr() == ("", "Não foi possível alterar o papel da conta.\n")
    assert email not in caplog.text
