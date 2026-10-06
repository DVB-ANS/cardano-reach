# cardano-reach — Coworker Sokosumi « Reach » (TOKEN2049 Origins, track Cardano / Masumi)

Historique et décisions : `docs/DEVLOG.md`.

## Objectif

Coworker payant sur Sokosumi Preprod (standard Masumi, 1 test USDM par Task) : « Reach », shortlist sourcée et
datée d'entreprises, mode `sourcing` (fournisseurs) ou `leads` (clients, style TamTam), par niche.
Brief complet : `BRIEF.md`. Plan d'implémentation (lots, contrat, jalons M0-M6) : `docs/PLAN.md`.
Pour reprendre le projet (coéquipier, nouvelle session) : `docs/ONBOARDING.md`.
Roadmap (démo → e-mail entreprise → envoi validé) : `docs/ROADMAP.md`. Qui fait quoi : `docs/TASKS.md`.

## Structure

| Chemin | Propriétaire | Contenu |
| --- | --- | --- |
| `apps/reach-agent/` | Armand | eve 0.71.0 : `agent/` (instructions, fiches de niche, outils), `src/search/` (moteur), `scripts/` |
| `apps/worker/` | coéquipier | worker Sokosumi + paiement Masumi (TS natif Node 24) |
| `infra/` | Armand | docker-compose, Postgres + MPS, Caddy, runbook (VPS d'Armand) |
| `front/` | coéquipier (déploiement : Armand) | landing statique Nuxt 4 + Tailwind 4 (pnpm) |
| `packages/contract/`, `docs/CONTRACT.md` | partagé, gelé | protocole worker ↔ agent (PR dédiée pour toute modif) |
| `docs/state/agent.md`, `docs/state/worker.md` | chacun le sien | IDs, ports, checkpoints prouvés, blocages |

Un `package.json` + lockfile par app, pas de workspaces npm. TS strict (`tsconfig.base.json`), sans `any`.

## Commandes

- Node 24 : `export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH`
- Agent (dans `apps/reach-agent`) : `npm run dev` (eve sur 127.0.0.1:21949), `npm test`, `npm run typecheck`,
  `node scripts/research.ts --text "…" [--answer 1]`, `node scripts/bench-search.ts "…"`, `npm run golden`.
- Front (dans `front`) : `pnpm install`, `pnpm dev` (http://localhost:3000), `pnpm generate` (→ `.output/public`).
- CLI Sokosumi : `sokosumi --preprod auth whoami --json`

## Conventions

- Branches `feat/agent-<sujet>` / `feat/infra-<sujet>` / `feat/worker-<sujet>` / `docs/<sujet>`, PR squash sur `main`,
  CI verte ; personne ne commit ni ne pousse directement sur `main`.
- **Armand : voir avec Noé avant de merger une PR ou de pousser sur `main`** (rebase sur `main` juste avant le merge).
- Un seul exécuteur de Tasks Sokosumi à la fois (worker du coéquipier) ; Armand teste avec `research.ts`.

## État

- Fait : étape 0 (M0 vérifié), moteur de recherche (API Exa, X, Reddit, GitHub, YouTube), outils eve,
  instructions + 4 fiches, golden, Dockerfile agent, 22 tests verts (détails : `docs/state/agent.md`) ;
  landing `front/` (PR #7, non déployée). Seule branche : `main`.
- À faire (Armand) : golden vert avec `gpt-6.1-sol`, comptes X / Reddit, image Docker + Postgres + MPS sur le VPS,
  déploiement M4 et front (détail : `docs/TASKS.md`).
- À faire (coéquipier) : compte Sokosumi, worker, paiement, M1 → M2 (éliminatoire), tooling restant, puis phase 5.
- Bloquants : `EXA_API_KEY`, `OPENAI_API_KEY`, compte Sokosumi / Coworker, Blockfrost, accès VPS, domaine ;
  worker de référence Masumi à cloner dans `../demo-agent-token2049`.
