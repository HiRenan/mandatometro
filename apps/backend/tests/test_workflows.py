"""Exercita o destino e os gates declarados no YAML, sem chamar o GitHub."""

import ast
from pathlib import Path
from types import SimpleNamespace

import pytest
import yaml

WORKFLOWS = Path(__file__).resolve().parents[3] / ".github" / "workflows"


def ler(nome):
    # BaseLoader não transforma a chave YAML `on` em booleano.
    return yaml.load((WORKFLOWS / nome).read_text(encoding="utf-8"), Loader=yaml.BaseLoader)


def avaliar(expressao, evento, branch, **variaveis):
    """Só o subconjunto de expressões usado pelos gates; sintaxe nova exige revisão."""
    expressao = expressao.strip().removeprefix("${{").removesuffix("}}")
    expressao = expressao.replace("&&", " and ").replace("||", " or ").strip()
    arvore = ast.parse(f"({expressao})", mode="eval")
    permitidos = (
        ast.Expression,
        ast.BoolOp,
        ast.And,
        ast.Or,
        ast.Compare,
        ast.Eq,
        ast.Attribute,
        ast.Name,
        ast.Load,
        ast.Constant,
    )
    assert all(isinstance(no, permitidos) for no in ast.walk(arvore))
    return eval(
        compile(arvore, "<gate do workflow>", "eval"),
        {"__builtins__": {}},
        {
            "github": SimpleNamespace(
                event_name=evento, ref=f"refs/heads/{branch}", sha="commit-do-disparo"
            ),
            "vars": SimpleNamespace(
                COLETAS_ATIVAS=variaveis.get("COLETAS_ATIVAS", ""),
                ENVIOS_ATIVOS=variaveis.get("ENVIOS_ATIVOS", ""),
                AGENDA_SABADO_ATIVA=variaveis.get("AGENDA_SABADO_ATIVA", ""),
                LLM_PROVIDER=variaveis.get("LLM_PROVIDER", ""),
            ),
            "inputs": SimpleNamespace(
                simular=variaveis.get("simular", False), refazer=variaveis.get("refazer", False)
            ),
            "secrets": SimpleNamespace(LLM_API_KEY=variaveis.get("LLM_API_KEY", "")),
        },
    )


@pytest.mark.parametrize(
    "evento,branch,ativo,esperado",
    [
        ("schedule", "develop", "", False),
        ("schedule", "develop", "false", False),
        ("schedule", "develop", "true", True),
        ("workflow_dispatch", "develop", "", True),
        ("workflow_dispatch", "main", "", True),
        ("workflow_dispatch", "feat/teste", "true", False),
        ("pull_request", "develop", "true", False),
    ],
)
def test_coleta_so_roda_quando_autorizada(evento, branch, ativo, esperado):
    job = ler("coleta.yml")["jobs"]["coletar"]
    assert bool(avaliar(job["if"], evento, branch, COLETAS_ATIVAS=ativo)) == esperado


@pytest.mark.parametrize(
    "evento,branch,ambiente,referencia",
    [
        ("schedule", "develop", "producao", "main"),
        ("workflow_dispatch", "develop", "desenvolvimento", "commit-do-disparo"),
        ("workflow_dispatch", "main", "producao", "commit-do-disparo"),
    ],
)
def test_coleta_separa_codigo_banco_e_concorrencia(evento, branch, ambiente, referencia):
    workflow = ler("coleta.yml")
    job = workflow["jobs"]["coletar"]
    checkout = next(
        passo for passo in job["steps"] if passo.get("uses", "").startswith("actions/checkout@")
    )
    assert avaliar(job["environment"], evento, branch) == ambiente
    assert avaliar(checkout["with"]["ref"], evento, branch) == referencia
    assert avaliar(workflow["concurrency"]["group"], evento, branch) == f"banco-{ambiente}"
    assert job["env"]["DATABASE_URL"] == "${{ secrets.DATABASE_URL }}"
    assert job["strategy"]["fail-fast"] == "false"
    assert job["strategy"]["max-parallel"] == "1"
    assert set(job["strategy"]["matrix"]["casa"]) == {"camara", "senado"}


@pytest.mark.parametrize("branch,ambiente", [("main", "producao"), ("develop", "desenvolvimento")])
def test_push_de_migration_e_manual_usam_mesmo_banco_e_fila(branch, ambiente):
    workflow = ler("migrar.yml")
    job = workflow["jobs"]["migrar"]
    assert set(workflow["on"]["push"]["branches"]) == {"main", "develop"}
    assert workflow["on"]["push"]["paths"] == ["apps/backend/migrations/**"]
    assert "workflow_dispatch" in workflow["on"]
    assert job["env"]["DATABASE_URL"] == "${{ secrets.DATABASE_URL_UNPOOLED }}"
    for evento in ("push", "workflow_dispatch"):
        assert avaliar(job["if"], evento, branch)
        assert avaliar(job["environment"], evento, branch) == ambiente
        assert avaliar(workflow["concurrency"]["group"], evento, branch) == f"banco-{ambiente}"
    for evento, branch_invalida in [("pull_request", "main"), ("workflow_dispatch", "feat/teste")]:
        assert not avaliar(job["if"], evento, branch_invalida)
    # Nada instala dependências ou migra se o preparo encontrou segredo ausente.
    passos = job["steps"]
    indice = next(i for i, passo in enumerate(passos) if passo.get("id") == "banco")
    for passo in passos[indice + 1 :]:
        assert passo["if"] == "${{ steps.banco.outputs.executar == 'true' }}"


@pytest.mark.parametrize(
    "nome", ["coleta.yml", "coleta-tse.yml", "migrar.yml", "enviar-edicao.yml", "agenda-sabado.yml"]
)
def test_fila_nao_cancela_migration_pendente_ao_chegar_coleta(nome):
    workflow = ler(nome)
    assert workflow["permissions"] == {"contents": "read"}
    assert workflow["concurrency"]["cancel-in-progress"] == "false"
    assert workflow["concurrency"]["queue"] == "max"


def test_tse_so_dispara_manualmente_no_banco_da_branch():
    workflow = ler("coleta-tse.yml")
    job = workflow["jobs"]["coletar"]
    assert set(workflow["on"]) == {"workflow_dispatch"}
    for branch, ambiente in (("main", "producao"), ("develop", "desenvolvimento")):
        assert avaliar(job["if"], "workflow_dispatch", branch)
        assert avaliar(job["environment"], "workflow_dispatch", branch) == ambiente
        assert (
            avaliar(workflow["concurrency"]["group"], "workflow_dispatch", branch)
            == f"banco-{ambiente}"
        )
    assert not avaliar(job["if"], "workflow_dispatch", "feat/teste")
    assert not avaliar(job["if"], "schedule", "develop")
    assert job["env"]["DATABASE_URL"] == "${{ secrets.DATABASE_URL }}"


@pytest.mark.parametrize(
    "evento,branch,envios,coletas,esperado,ambiente",
    [
        ("schedule", "develop", "", "true", False, "producao"),
        ("schedule", "develop", "false", "true", False, "producao"),
        ("schedule", "develop", "true", "false", True, "producao"),
        ("workflow_dispatch", "main", "", "", True, "producao"),
        ("workflow_dispatch", "develop", "", "", True, "desenvolvimento"),
        ("workflow_dispatch", "feat/teste", "true", "true", False, "desenvolvimento"),
        ("pull_request", "main", "true", "true", False, "producao"),
    ],
)
def test_envio_tem_chave_propria_e_destino_por_evento(
    evento, branch, envios, coletas, esperado, ambiente
):
    workflow = ler("enviar-edicao.yml")
    job = workflow["jobs"]["enviar"]
    assert workflow["on"]["schedule"] == [{"cron": "37 13 * * 0"}]
    assert (
        avaliar(job["if"], evento, branch, ENVIOS_ATIVOS=envios, COLETAS_ATIVAS=coletas) == esperado
    )
    assert avaliar(job["environment"], evento, branch) == ambiente
    assert avaliar(workflow["concurrency"]["group"], evento, branch) == f"banco-{ambiente}"
    checkout = job["steps"][0]
    assert avaliar(checkout["with"]["ref"], evento, branch) == (
        "main" if evento == "schedule" else "commit-do-disparo"
    )
    assert job["env"]["DATABASE_URL"] == "${{ secrets.DATABASE_URL }}"
    assert job["env"]["RESEND_API_KEY"] == "${{ secrets.RESEND_API_KEY }}"
    assert job["steps"][-1]["run"] == "uv run --no-sync python scripts/tarefas.py enviar"


def test_envio_manual_inicia_em_simulacao():
    simular = ler("enviar-edicao.yml")["on"]["workflow_dispatch"]["inputs"]["simular"]
    assert simular["type"] == "boolean"
    assert simular["default"] == "true"


@pytest.mark.parametrize(
    "evento,simular,esperado",
    [
        ("workflow_dispatch", True, "true"),
        ("workflow_dispatch", False, "false"),
        ("schedule", False, "false"),
        ("schedule", True, "false"),
    ],
)
def test_envio_simula_so_no_manual_marcado(evento, simular, esperado):
    expressao = ler("enviar-edicao.yml")["jobs"]["enviar"]["env"]["ENVIO_SIMULAR"]
    assert avaliar(expressao, evento, "develop", simular=simular) == esperado


@pytest.mark.parametrize(
    "evento,branch,ativo,esperado",
    [
        ("schedule", "develop", "", False),
        ("schedule", "develop", "false", False),
        ("schedule", "develop", "true", True),
        ("workflow_dispatch", "main", "", True),
        ("workflow_dispatch", "develop", "", True),
        ("workflow_dispatch", "feat/teste", "true", False),
        ("push", "develop", "true", False),
    ],
)
def test_agenda_tem_chave_propria_e_disparo_manual(evento, branch, ativo, esperado):
    agenda = ler("agenda-sabado.yml")["jobs"]["preparar"]
    assert (
        bool(
            avaliar(
                agenda["if"],
                evento,
                branch,
                AGENDA_SABADO_ATIVA=ativo,
                COLETAS_ATIVAS="true",
                ENVIOS_ATIVOS="true",
            )
        )
        == esperado
    )


@pytest.mark.parametrize(
    "evento,branch,ambiente,referencia",
    [
        ("schedule", "develop", "producao", "main"),
        ("workflow_dispatch", "main", "producao", "commit-do-disparo"),
        ("workflow_dispatch", "develop", "desenvolvimento", "commit-do-disparo"),
    ],
)
def test_agenda_separa_codigo_banco_e_concorrencia(evento, branch, ambiente, referencia):
    workflow = ler("agenda-sabado.yml")
    job = workflow["jobs"]["preparar"]
    checkout = job["steps"][0]
    assert checkout["uses"].startswith("actions/checkout@")
    ref = checkout["with"]["ref"]
    assert (avaliar(ref, evento, branch) if ref.startswith("${{") else ref) == referencia
    assert checkout["with"]["persist-credentials"] == "false"
    assert avaliar(job["environment"], evento, branch) == ambiente
    assert avaliar(workflow["concurrency"]["group"], evento, branch) == f"banco-{ambiente}"
    for nome in ("coleta.yml", "enviar-edicao.yml"):
        assert workflow["concurrency"] == ler(nome)["concurrency"]
    branch_do_banco = "main" if ambiente == "producao" else "develop"
    migrar = ler("migrar.yml")["concurrency"]
    assert avaliar(migrar["group"], "push", branch_do_banco) == f"banco-{ambiente}"


def test_agenda_cron_de_sabado_e_periodo_opcional():
    gatilhos = ler("agenda-sabado.yml")["on"]
    assert set(gatilhos) == {"schedule", "workflow_dispatch"}
    assert gatilhos["schedule"] == [{"cron": "47 7 * * 6"}]
    entradas = gatilhos["workflow_dispatch"]["inputs"]
    assert set(entradas) == {"inicio", "fim", "refazer"}
    assert all(
        entradas[data]["required"] == "false" and entradas[data]["type"] == "string"
        for data in ("inicio", "fim")
    )
    assert entradas["refazer"]["required"] == entradas["refazer"]["default"] == "false"
    assert entradas["refazer"]["type"] == "boolean"


@pytest.mark.parametrize(
    "evento,refazer,esperado",
    [
        ("workflow_dispatch", True, "true"),
        ("workflow_dispatch", False, "false"),
        ("schedule", False, "false"),
        ("schedule", True, "false"),
    ],
)
def test_agenda_passa_refazer_so_no_manual_marcado(evento, refazer, esperado):
    ambiente = ler("agenda-sabado.yml")["jobs"]["preparar"]["steps"][-1]["env"]
    assert avaliar(ambiente["AGENDA_REFAZER"], evento, "develop", refazer=refazer) == esperado


def test_agenda_passa_os_nomes_dos_segredos_e_o_periodo_ao_roteiro():
    job = ler("agenda-sabado.yml")["jobs"]["preparar"]
    assert job["defaults"]["run"]["working-directory"] == "apps/backend"
    passo = job["steps"][-1]
    assert passo["run"] == "uv run --no-sync python scripts/tarefas.py agenda"
    assert "continue-on-error" not in passo
    assert passo["env"]["AGENDA_SABADO_ATIVA"] == "${{ vars.AGENDA_SABADO_ATIVA }}"
    assert passo["env"]["DATABASE_URL"] == "${{ secrets.DATABASE_URL }}"
    assert passo["env"]["FIRECRAWL_API_KEY"] == "${{ secrets.FIRECRAWL_API_KEY }}"
    assert passo["env"]["LLM_API_KEY"] == "${{ secrets.LLM_API_KEY }}"
    assert passo["env"]["LLM_MODEL"] == "${{ vars.LLM_MODEL }}"
    assert passo["env"]["COLETA_INICIO"] == "${{ inputs.inicio }}"
    assert passo["env"]["COLETA_FIM"] == "${{ inputs.fim }}"


@pytest.mark.parametrize("chave,esperado", [("", ""), ("ficticia", "anthropic")])
def test_agenda_so_configura_provedor_com_chave(chave, esperado):
    ambiente = ler("agenda-sabado.yml")["jobs"]["preparar"]["steps"][-1]["env"]
    assert (
        avaliar(
            ambiente["LLM_PROVIDER"],
            "schedule",
            "develop",
            LLM_API_KEY=chave,
            LLM_PROVIDER="anthropic",
        )
        == esperado
    )
