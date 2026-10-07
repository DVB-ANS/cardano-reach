# cardano-reach — Coworker Sokosumi « Richard » (TOKEN2049 Origins, track Cardano / Masumi)

Historique et décisions : `docs/DEVLOG.md`.

## Objectif

Coworker payant sur Sokosumi Preprod (standard Masumi, 1 test USDM par Task) : « Richard », shortlist sourcée et
datée d'entreprises, mode `sourcing` (fournisseurs) ou `leads` (clients, style TamTam), par niche.
Brief complet : `BRIEF.md`. Plan d'implémentation (lots, contrat, jalons M0-M6) : `docs/PLAN.md`.
Pour reprendre le projet (coéquipier, nouvelle session) : `docs/ONBOARDING.md`.
Roadmap (démo → e-mail entreprise → envoi validé) : `docs/ROADMAP.md`. Qui fait quoi : `docs/TASKS.md`.
Nœud de paiement Masumi (Postgres + MPS sur le VPS) : `docs/MPS-SETUP.md`.

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

- Node 24 : `export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH` (nvm) ou
  `export PATH=/opt/homebrew/opt/node@24/bin:$PATH` (Homebrew ; le `node` 26 par défaut de Homebrew ne convient pas)
- Agent (dans `apps/reach-agent`) : `npm run dev` (eve sur 127.0.0.1:21949), `npm test`, `npm run typecheck`,
  `node scripts/research.ts --text "…" [--answer 1]`, `node scripts/bench-search.ts "…"`, `npm run golden`.
- Worker (dans `apps/worker`) : `npm start` (gratuit), `PAID_TASKS_ENABLED=true npm start` (payé), `npm test`,
  `npm run typecheck`, `npm run registration -- key|register|status`, `npm run agent-api`.
- Front (dans `front`) : `pnpm install`, `pnpm dev` (http://localhost:3000), `pnpm generate` (→ `.output/public`).
- CLI Sokosumi : `sokosumi --preprod auth whoami --json`

## Conventions

- Branches `feat/agent-<sujet>` / `feat/infra-<sujet>` / `feat/worker-<sujet>` / `docs/<sujet>`, PR squash sur `main`,
  CI verte ; personne ne commit ni ne pousse directement sur `main`.
- **Armand : voir avec Noé avant de merger une PR ou de pousser sur `main`** (rebase sur `main` juste avant le merge).
- Un seul exécuteur de Tasks Sokosumi à la fois : le worker en service chez Armand ; aucun worker local en parallèle.

## État

- Fait : agent eve (moteur Exa, LinkedIn, GitHub, YouTube, X ; 4 fiches ; `find_contact`), image Docker, golden 8/8
  `gpt-6.1-sol` (détails : `docs/state/agent.md`) ; worker Sokosumi + paiement Masumi, **M1 et M2 prouvés**
  (5 Tasks payées et collectées, `README.md` § On-chain proof) ; Workspace TOKEN2049 `GRANTED` ; landing `front/`.
- En service chez Armand : Postgres + MPS, agent (Docker), worker et API MIP-003 (`systemctl --user`), sans port public.
- À faire (Armand) : test ordinateurs éteints (M4), redémarrage auto des services, sauvegarde MPS hors machine,
  déploiement du front, compte Reddit (détail : `docs/TASKS.md`).
- À faire (Noé) : preuves manquantes de `docs/SUBMISSION.md`, Coworker visible (`isShown`), décision `find_contact`
  vs fiche marketplace, Dockerfile worker / agent-api.
- Ensemble : accès juges au repo (historique avec infos perso), vidéo + slides, soumission BuilderBase.
