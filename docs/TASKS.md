# Répartition des tâches

Qui fait quoi, par ordre de priorité. Le chemin critique est **M2 : Task payée, collecte confirmée on-chain**
(éliminatoire). Détails techniques : `docs/PLAN.md` ; vision complète : `docs/ROADMAP.md`.

## Armand — agent, VPS, Docker, déploiement

1. **Agent prêt pour la démo**
   - [ ] `OPENAI_API_KEY` et `EXA_API_KEY` dans `apps/reach-agent/.env.local`.
   - [ ] Golden 9/9 avec `gpt-6.1-sol` (`npm run golden`).
   - [ ] Plafond de coût par session (`limits.maxTokenCostUsdPerSession` dans `agent/agent.ts`).
   - [ ] Vérification codée des liens avant de rendre le rapport (« no link, no line » garanti par le code).
1 bis. **Golden et robustesse de l'agent** (relecture du 2026-10-07)
   - [ ] Golden : retirer le cas 6 (market maker), passer le 5 à `minRows: 3`, exiger 0 ligne au 9, préciser le 7 ;
     plus tard ajouter les cas « personne » 6, 10, 11 du `BRIEF.md` §4 et un cas EN, hors périmètre, hors niche.
   - [ ] `golden.ts` : vérifier que les liens répondent, une date ou « non daté » par ligne, verdict et premier message
     présents, « why now » en mode leads, temps maximum.
   - [ ] `??` → `||` dans `scripts/launch.ts` (`EVE_PORT`) et `src/search/cache.ts` (`REACH_CACHE_DIR`).
   - [ ] Refuser de démarrer sans `OPENAI_API_KEY` en `start` ; vérifier au premier `docker build` que `eve build` ne
     fige pas `chatgpt()` dans l'image.
   - [ ] Modèle de démo forcé (`REACH_MODEL=gpt-6.1-sol`) et plafond de coût par session.
2. **Canaux sociaux**
   - [ ] Comptes X et Reddit dédiés au projet, identifiants configurés (`TWITTER_AUTH_TOKEN`, `TWITTER_CT0`,
     `credential.json` de rdt-cli).
   - [ ] Bench des canaux depuis l'IP du VPS (YouTube, X, Reddit, Exa, GitHub).
3. **VPS et Docker** (`infra/`)
   - [ ] Construire l'image agent sur le VPS (`docker build -f apps/reach-agent/Dockerfile -t reach-agent .`), la lancer
     sur `127.0.0.1:3000` uniquement, tester avec `research.ts` via `EVE_URL`.
   - [ ] **Postgres + MPS : suivre `docs/MPS-SETUP.md`** (installation, vérifications, financement, valeurs à transmettre).
   - [ ] `infra/docker-compose.yml` : Postgres 16 (base `mps_hackathon`) + Masumi Payment Service (port 3012 sur
     127.0.0.1), clé Blockfrost Preprod, migrations, seed **avec sortie supprimée**, selling wallet financé via
     dispenser.masumi.network.
   - [ ] Donner à Noé l'accès au MPS (tunnel `ssh -N -L 3012:127.0.0.1:3012 <vps>`) et la clé MPS du worker.
   - [ ] Sauvegarde `pg_dump` quotidienne hors du VPS dès que les wallets existent.
   - [ ] Tester le port 25 sortant (`nc -vz gmail-smtp-in.l.google.com 25`) pour la vérification d'e-mails plus tard.
   - [ ] Domaine `REACH_DOMAIN` + Caddy (seule `https://REACH_DOMAIN/agent-api/` est publique).
4. **Déploiement final (M4)**
   - [ ] Compose complet : postgres, mps, reach-agent, worker, agent-api, caddy ; `restart: unless-stopped`.
   - [ ] Test ordinateurs fermés depuis un autre appareil ; `infra/RUNBOOK.md`.
   - [ ] **Front** : déploiement statique (`cd front && pnpm generate` → Cloudflare Pages ou Vercel), lien « Open
     Sokosumi » remplacé par l'URL du Coworker.

## Noé — Sokosumi, worker, paiement, tooling

1. **Compte Sokosumi** (B1)
   - [x] `sokosumi --preprod auth login`, Vendor, Coworker `--capability tasks --personal` (IDs : `docs/state/worker.md`).
   - [x] Clé runtime dans `apps/worker/.env.local` (`SOKOSUMI_COWORKER_API_KEY`) et dans le coffre du CLI.
   - [x] Fiche marketplace du Coworker (accroche + description EN, `docs/coworker-profile.md`).
   - [ ] Demander tôt l'accès au Workspace TOKEN2049 (validation humaine chez Masumi).
2. **Worker** (B2, B3) → **M1**
   - [x] Cloner la référence à côté du repo : `git clone -b live-demo-name-finder https://github.com/masumi-network/demo-agent-token2049 ../demo-agent-token2049`.
   - [x] Portage TS strict dans `apps/worker/src/` : partie Sokosumi + intake (paiement : à faire, voir 3).
   - [x] Questions `INPUT_REQUIRED` **avant** paiement, reprise sans doublon (`PLAN.md` §B3).
   - [x] M1 : Task gratuite avec question → réponse → rapport (preuves : `docs/state/worker.md`).
3. **Paiement** → **M2**
   - [x] Porter `payment.ts`, `settlement.ts`, `registration.ts`, `agent-api.ts` (testés avec un faux MPS).
   - [ ] Brancher le worker sur le MPS d'Armand (tunnel SSH), enregistrement Masumi (B4).
   - [ ] M2 : Task payée → `runtime receipt` `settled: true` → hash de collecte ouvert sur l'explorateur.
   - [ ] Image worker + agent-api (Dockerfile dans `apps/worker/`) pour le compose d'Armand.
4. **Tooling restant** (dans les temps morts)
   - [x] Job worker dans la CI (typecheck + tests).
   - [x] README racine (quoi, schéma, lancer en local, déployer).
   - [x] Biome (lint + format) sur `front/`, en CI ; Dependabot (agent, worker, front, actions ; majeures de
     `@types/node` ignorées).
   - [ ] Biome pour `apps/worker/` (et `apps/reach-agent/` si Armand le veut).
   - [ ] Logs JSON avec `taskId` / `sessionId`, healthchecks.
   - [ ] Protection de `main` quand le repo passe public.
5. **Juste après M2 : « le bon humain » (personne / e-mail / hook)** (`ROADMAP.md` phase 5, décision produit du 2026-10-07)
   - [ ] Lot 1 gratuit : Exa people, LinkedIn public, pages équipe, plateformes freelance, theHarvester, variantes,
     MX / catch-all, actus + ATS, `gh api`, règle du hook et sa vérification codée.
   - [ ] Préalables avec Armand : PR contrat, réécriture du garde-fou e-mails, conservation des données personnelles.

## Avant de passer le repo en public (ensemble)

- [ ] Plus d'e-mail perso, de chemin `/Users/...` ni d'ID privé dans les docs (fait pour `docs/state/worker.md` et
  `docs/PLAN.md` le 2026-10-07 ; relire le reste).
- [ ] Pitch, script vidéo, schéma du README et front alignés sur les canaux réellement actifs (web, LinkedIn public,
  GitHub) ; front : « 1 test USDM » au lieu de « 1 USDM », pas de « verified » tant que la vérification des liens
  n'est pas codée, liens « Open Sokosumi » vers le Coworker.
- [ ] Protection de `main` une fois public.

## Armand, ou le premier qui n'a plus rien à faire

- [ ] Vidéo de démo + slides (vidéo intégrée), livrables de soumission (`BRIEF.md` §10).

## Règles communes

- **Workflow Git (Armand en particulier)** : jamais de commit ni de push direct sur `main`. Toute modification passe
  par une branche (`feat/agent-<sujet>`, `feat/infra-<sujet>`, `docs/<sujet>`), puis une PR avec la CI verte
  (`secrets`, `agent`, `front`). **Voir avec Noé avant de merger ou de pousser sur `main`.** Rebase sur `main` juste
  avant le merge pour ne rien casser.
- Un seul exécuteur de Tasks à la fois : le worker de Noé, puis celui du serveur.
- Toute modification de `packages/contract/**` passe par une PR dédiée relue par l'autre.
