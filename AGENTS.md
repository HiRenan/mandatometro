# AGENTS.md

This file describes how coding agents (Claude Code, Codex, and Devin) work on Mandatômetro. `CLAUDE.md` simply imports it, and the table below points to each topic’s rules.

## How to work

**Think before you code.** Make the assumptions that affect the result explicit.

- When plausible readings lead to different results, spell them out and ask about the decision that affects the work.
- If there’s a simpler approach or a choice with a meaningful cost, explain the tradeoff and recommend a path.

**Start simple.** Build the smallest solution that satisfies the request.

- Cover the cases the project needs. Add an abstraction or a configuration option when there’s a concrete use for it.
- Prefer the simple solution that makes it to the Hack Brasil demo.

**Make surgical changes.** Tie each changed line to the request.

- Match local style and remove any imports, variables, and functions your change leaves unused.
- Report relevant issues you find outside the scope and leave their fixes for the corresponding tasks.

**Set a verifiable goal.** Define what needs to work and how to check it.

- Turn a bug into a test. See the test fail with the bug and pass with the fix.
- For a behavior change, exercise the new case. For a refactor, run the same check before and after.
- Give each step of a multi-step task a check. Use the results to revise the change and verify the full outcome.

Use your judgment for trivial tasks. These principles draw inspiration from the [andrej-karpathy-skills CLAUDE.md](https://github.com/forrestchang/andrej-karpathy-skills/blob/main/CLAUDE.md).

## The project

Mandatômetro teaches how Brazilian politics works through what Congress is voting on, mainly for voters aged 20 to 40. The Hack Brasil 2026 submission is due November 30, 2026, with a public repository, a live demo, and a video up to three minutes long. See the [product definition](PRODUCT.md) and the [ADRs](docs/adr/) for scope and decisions, including the [stack](docs/adr/0001-stack.md), the [MVP](docs/adr/0002-mvp.md), [optional login](docs/adr/0003-login-opcional.md), and the [Official Gazette in the newsletter](docs/adr/0004-newsletter-do-dou.md).

## Stack and structure

- The site reads collected data only from the database through the API. Collection and AI run as jobs outside the user request path and write to the database through [`cli.py` subcommands](apps/backend/src/mandatometro/cli.py). The API also handles subscriptions, accounts, reading progress, pilot attempts, edition review and publishing, and page visit counts.
- Keep server-only code in `*.server.ts`. Loaders reach it through `createServerFn` in `*.functions.ts`. Importing a server-only file in browser code fails the build.
- A server function that calls the API logs one fixed line with a short reason and throws an error with a fixed message. The router puts the error’s `message` in the HTML and the function response. The original message can contain an internal address, SQL, or an email address, as seen in the review of PR #44. Follow the [editions server function](apps/web/src/lib/edicoes/edicoes.server.ts) and the [test for the 500 HTML](apps/web/src/routes/edicoes/-edicoes-ssr.test.tsx).
- Declare site variables in varlock’s [`.env.schema`](apps/web/.env.schema). Variables marked `@public` go into the browser bundle.
- Draw with CSS and SVG written in code, and generate the few images in `apps/web/public/` from HTML with `apps/web/imagens/`. The [Jogo das Comissões](docs/jogo-das-comissoes.md) is the first exception: its scenery, portraits, and props are WebP files in `apps/web/public/jogo/`, its music and effects are OGG, and its narration is MP3. Treat them as decoration — outside the screen reader, with the meaning in the words on screen — and load only the current scene. Sound comes on by default and the player can turn it off; the browser only lets it play after a tap or a key, so the background track starts on the first click. The second exception is the official photo of a parliamentarian, on their page and in the `/parlamentares` list: it loads straight from the Câmara or Senado address, with the credit on screen and `referrerPolicy="no-referrer"`, and `apps/web/public/` holds no copy of it.
- Use the Compose host port for local PostgreSQL to avoid a conflict with an installation on port 5432.

## Conventions

- **Branches.** Target `develop`, the default GitHub branch, for PRs. Merge only stable `develop` into `main`, such as before the demo and submission. Each merge to `main` publishes the site on its domain. Both `main` and `develop` accept changes only through PRs with green CI.
- **One issue per PR.** Start a `tipo/NN-descricao` branch from `develop` (e.g. `feat/10-conector-camara`). Write Conventional Commits in Portuguese (e.g. `feat(camara): conector de proposições`).
- **PR description.** In Portuguese, describe what changed and how to test it, and include `Closes #NN`. Devin can take issues labeled `devin` and open PRs in this repository. Apply the `devin` label to those PRs.
- **Attribution.** Commits and PRs contain the work itself, without AI attribution such as “Generated with Claude Code” or an agent’s `Co-Authored-By` line. [`.claude/settings.json`](.claude/settings.json) disables that attribution in Claude Code.
- **Language.** Use Portuguese without accents for domain names: `parlamentar`, `mandato`, `candidatura`, `proposicao`, `votacao`, `votacao_proposicao`, `voto`, `promessa`, `ligacao`, `bem_declarado`, `fonte`, `inscrito`, `trilha`, `artigo`, `ato`, `edicao`, and `item_edicao`. Write user-facing text in Brazilian Portuguese (pt-BR).
- **Commands.** Find installation, test, and lint commands under [Como rodar in the README](README.md#como-rodar).
- **API contract.** The TypeScript client in `apps/web/src/client/` is generated from `apps/backend/openapi.json`. When the API changes, run `pnpm generate:client` and commit both outputs. CI fails if either is out of date.
- **Migrations.** Use sequential revision IDs (`--rev-id 0002`, `0003`, and so on) and an unaccented message because it becomes the file name. Write changes to CHECK constraints and defaults by hand. Autogenerate misses them, including new values for votes, results, edition states, and stored vote codes. The migration test catches missing changes. When you change a table, update the [README diagram](README.md#modelo-de-dados), which a test checks against the models. In hosted environments, apply migrations only through the workflow. Keep the schema compatible with both the old and the new code.

## Tests

- Run unit tests offline with recorded responses in [`apps/backend/tests/fixtures/`](apps/backend/tests/fixtures/). Replace real personal data, including CPF, voter ID, and reasons for leave, with fictional values. In Senate fixtures use the same pair, `XXX` / `Motivo fictício`, for all absence and leave codes and descriptions so that no reason stands out. Use invented data in tests of the absence codes themselves.
- Mark tests that use the network `online`. CI skips them.
- Use pytest’s short traceback. A long traceback exposes recorded responses in public logs. Assert on IDs and counts for those responses.
- Database tests erase the data in their database. Use a separate database whose name ends in `_teste` and pass `TEST_DATABASE_URL` on the command line. The URL comes only from that explicit variable. Without it, database tests skip locally and fail in CI, which starts its own database. Use invented data and `@example.com` addresses.

## Secrets and personal data

Keep Firecrawl, Resend, Devin, ElevenLabs, and LLM keys only in the local `.env` created from `.env.example` and in hosting secrets. Refer to keys by variable name in code, issues, PRs, and logs. Add new variables to `.env.example` with an empty value and a comment.

Apply the [personal data rules](docs/dados-pessoais.md) before storing, exposing, logging, or using data about a person in a fixture.

## Where to look

| Before you… | Read… |
| --- | --- |
| Write copy for a learning track, quiz, or newsletter, or write an LLM prompt | [PRODUCT.md](PRODUCT.md) |
| Handle personal data in storage, logs, an API, or a fixture | [docs/dados-pessoais.md](docs/dados-pessoais.md) |
| Work on the site, including a screen, stylesheet, image, or test | [DESIGN.md](DESIGN.md) and [docs/codigo-do-site.md](docs/codigo-do-site.md) |
| Write or check an article for a learning track | [docs/conteudo-das-trilhas.md](docs/conteudo-das-trilhas.md) |
| Work on data collection, including calls to the Câmara, Senado, or TSE APIs | [docs/dicionario-de-dados.md](docs/dicionario-de-dados.md) |
| Draft the newsletter, handle subscriptions, or send an edition | [docs/newsletter.md](docs/newsletter.md) |
| Work on the pilot | [docs/medicao-do-piloto.md](docs/medicao-do-piloto.md) |
| Write or check a scene, decision, or asset of the game | [docs/jogo-das-comissoes.md](docs/jogo-das-comissoes.md) |
| Work on hosting workflows, deployments, or variables | [docs/hospedagem.md](docs/hospedagem.md) |
| Decide what belongs in the product | [PRODUCT.md](PRODUCT.md) and [docs/adr/](docs/adr/) |

## Before you finish

- Update the README when a command or setup step changes.
- Add new working conventions to this file.
- Record a newly discovered gotcha in the document for that topic.
