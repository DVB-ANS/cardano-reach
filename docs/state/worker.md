# État — worker, paiement, infra (coéquipier)

IDs, ports, checkpoints prouvés, blocages.

## Sokosumi Preprod (B1)

| Élément | Valeur |
| --- | --- |
| Compte | `armand.noe.sw@gmail.com` (CLI 1.0.4, Node 24 via `brew install node@24`) |
| Organisation (prérequis Vendor) | `Richard` (`richard-y37uag`) |
| Vendor | `Cardano Reach` (`cardano-reach`) · `01a11272-9017-740c-9f1b-cd446384ccb4` |
| Coworker | `Reach` (`reach`) · `01a11272-c015-748f-9f1a-cfd1e504c497`, capability `tasks` |
| Personal Workspace | `01a11268-64f2-7765-804b-45a56f3a4d95` |
| Accès personnel du Coworker | `01a11272-c226-753a-a9ea-feabfd3ae0b2` · `GRANTED` |
| Clé runtime | `apps/worker/.env.local` (`SOKOSUMI_COWORKER_API_KEY`, 0600, ignoré) + coffre du CLI : import OK |

Référence Masumi clonée dans `/Users/noew/VSCode/TOKEN2049/demo-agent-token2049` (branche `live-demo-name-finder`).

## Checkpoints prouvés

- B1 compte : Vendor + Coworker créés, accès personnel `GRANTED`, clé runtime importée (2026-10-07).
- **M1 prouvé (2026-10-07)**, Task `01a11285-4080-7548-ba2b-7f000402340b`, `PAID_TASKS_ENABLED=false` :
  « Trouve-moi des partenaires. » → question 1 (`INPUT_REQUIRED`, format 1️⃣ / 2️⃣) → réponse `1` → `RUNNING` →
  question 2 → réponse en texte libre → brief `sourcing · aero-spatial · Europe` → rapport de 8 fournisseurs avec un
  lien chacun → `COMPLETED` (~70 s après la dernière réponse) → commentaire après complétion → réponse FOLLOWUP.
- Worker tué pendant `awaiting-human` puis relancé : aucune question en double, verrou relâché proprement.
- Sokosumi accepte `INPUT_REQUIRED` posté par le Coworker (question ouverte du `BRIEF.md` §13, tranchée) ; la
  réponse humaine est un événement `actor.type = "user"` sans statut, la Task reste `INPUT_REQUIRED` jusqu'à ce que
  le worker poste `RUNNING`.
- La clé runtime liste les Tasks du Coworker (`GET /v1/tasks?coworkerId=…`) : le worker ne dépend pas de l'OAuth.
- Paiement Masumi (M2) pas encore porté ; MPS attendu sur le VPS d'Armand.

## Lancer (local)

- Agent : `cd apps/reach-agent && EVE_PORT=21949 REACH_CACHE_DIR=.local/cache npm run dev` (les lignes vides
  `EVE_PORT=` / `REACH_CACHE_DIR=` du `.env.local` ne retombent pas sur les défauts : `??` dans `launch.ts` et
  `cache.ts`, à corriger côté agent).
- Worker : `cd apps/worker && npm ci && npm start` (`.env.local` : `COWORKER_ID`, `SOKOSUMI_COWORKER_API_KEY`) ;
  `npm test`, `npm run typecheck`. Journaux par Task dans `apps/worker/.local/tasks/`.
- Front : landing mergée (PR #7, #8), `pnpm generate` OK ; pas déployée.

## Blocages

- Accès SSH au VPS, clé Blockfrost Preprod, financement du selling wallet.
