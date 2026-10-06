# cardano-reach — Coworker Sokosumi « Reach » (TOKEN2049 Origins, track Cardano / Masumi)

Historique et décisions : `docs/DEVLOG.md`.

## Objectif

Coworker payant sur Sokosumi Preprod (standard Masumi, 1 test USDM par Task) : « Reach », shortlist sourcée et
datée d'entreprises, mode `sourcing` (fournisseurs) ou `leads` (clients, style TamTam), par niche.
Brief complet : `BRIEF.md`. Plan d'implémentation (lots, contrat, jalons M0-M6) : `docs/PLAN.md`.

## Structure

| Chemin | Propriétaire | Contenu |
| --- | --- | --- |
| `apps/reach-agent/` | Armand | eve 0.71.0 : `agent/` (instructions, fiches de niche, outils), `src/search/` (moteur), `scripts/` |
| `apps/worker/` | coéquipier | worker Sokosumi + paiement Masumi (TS natif Node 24) |
| `infra/` | coéquipier | docker-compose, Caddy, runbook |
| `packages/contract/`, `docs/CONTRACT.md` | partagé, gelé | protocole worker ↔ agent (PR dédiée pour toute modif) |
| `docs/state/agent.md`, `docs/state/worker.md` | chacun le sien | IDs, ports, checkpoints prouvés, blocages |

Un `package.json` + lockfile par app, pas de workspaces npm. TS strict (`tsconfig.base.json`), sans `any`.

## Commandes

- Node 24 : `export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH`
- Agent (dans `apps/reach-agent`) : `npm run dev` (eve sur 127.0.0.1:21949), `npm test`, `npm run typecheck`,
  `node scripts/research.ts --text "…" [--answer 1]`, `node scripts/bench-search.ts "…"`, `npm run golden`.
- CLI Sokosumi : `sokosumi --preprod auth whoami --json`

## Conventions

- Branches `feat/agent-<sujet>` / `feat/worker-<sujet>`, PR squash sur `main` ; personne ne pousse sur `main`.
- Un seul exécuteur de Tasks Sokosumi à la fois (worker du coéquipier) ; Armand teste avec `research.ts`.

## État

- Fait : étape 0 (M0 vérifié), moteur de recherche, outils eve, instructions + 4 fiches, golden, Dockerfile agent
  (détails et canaux actifs : `docs/state/agent.md`).
- À faire (Armand) : golden complet vert avec `gpt-6.1-sol` (M3/M5), Twitter/Reddit si comptes dédiés, build Docker sur le VPS.
- À faire (coéquipier) : lot B (worker, paiement, infra), M1 → M2 → M4.
- Bloqué sur Armand : `OPENAI_API_KEY`, compte Sokosumi / Coworker, Blockfrost, accès VPS, domaine.
