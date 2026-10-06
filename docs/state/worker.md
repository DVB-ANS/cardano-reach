# État — worker, paiement, infra (coéquipier)

IDs, ports, checkpoints prouvés, blocages.

## Sokosumi Preprod (B1)

| Élément | Valeur |
| --- | --- |
| Compte | compte Sokosumi de Noé (CLI 1.0.4, Node 24 via `brew install node@24`) |
| Organisation (prérequis Vendor) | `Richard` (`richard-y37uag`) |
| Vendor | `Cardano Reach` (`cardano-reach`) · `01a11272-9017-740c-9f1b-cd446384ccb4` |
| Coworker | `Richard` (`reach`) · `01a11272-c015-748f-9f1a-cfd1e504c497`, capability `tasks` |
| Accès personnel du Coworker | `GRANTED` |
| Workspace TOKEN2049 | membre ; connexion du Coworker demandée le 2026-10-07 : `PENDING`, `taskSeatEligible: true` |
| Fiche marketplace | nom « Richard » (slug technique `reach`, non modifiable par le CLI), accroche + description EN appliquées (`coworkers update`), Coworker encore privé (`isShown: false`) |
| Clé runtime | `apps/worker/.env.local` (`SOKOSUMI_COWORKER_API_KEY`, 0600, ignoré) + coffre du CLI : import OK |

Référence Masumi clonée à côté du repo (`../demo-agent-token2049`) (branche `live-demo-name-finder`).

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
- Paiement Masumi porté et testé hors ligne (faux MPS / faux Core, 26 tests) : devis signé (+5 / +30 / +46 / +62 min),
  achat posté sur la Task, recherche seulement après `FundsLocked` confirmé et ≥ 8 min avant `submitResultTime`, hash
  du résultat exact soumis, complétion au même texte, retrait vérifié (reçu Core + transaction MPS + Blockfrost).
  Jamais testé contre un vrai MPS : attend le MPS d'Armand.

## Procédure M2 (sur la machine d'Armand)

Le MPS n'écoute qu'en local sur la machine d'Armand et Noé n'y a pas d'accès SSH : **le worker tourne chez Armand**,
comme en M4. Noé ne lance plus de worker local à partir de là (un seul exécuteur de Tasks).

1. Noé transmet à Armand, par canal privé, la clé runtime du Coworker (`SOKOSUMI_COWORKER_API_KEY`) ; Armand crée
   `apps/worker/.env.local` sur sa machine (`COWORKER_ID`, la clé, `MPS_URL=http://127.0.0.1:3012`,
   `BLOCKFROST_API_KEY_PREPROD`, `EVE_URL`, et pour l'enregistrement seulement `MPS_ADMIN_KEY`,
   `MPS_SELLING_WALLET_ID`, `MPS_PAYMENT_SOURCE_ID`).
2. `npm ci && npm run doctor` : tout doit être ✅ sauf la partie payée.
3. `npm run registration -- key` (clé MPS limitée au wallet de vente, `.local/mps-runtime.env`, 0600), puis
   `npm run agent-api` et `npm run registration -- register`, puis `npm run registration -- status` jusqu'à
   `RegistrationConfirmed`. Retirer ensuite `MPS_ADMIN_KEY` du `.env.local`.
4. `npm run doctor -- --paid` : tout ✅.
5. Crédits de test sur le Personal Workspace de Noé (Stripe test `4242 4242 4242 4242`).
6. `PAID_TASKS_ENABLED=true npm start` ; Noé crée la Task complète (cas 1 du brief) depuis Sokosumi. Suivi :
   `docker compose logs` / sortie JSON (`task advanced`, `stage`), `.local/tasks/<id>.json` jusqu'à `settled` ;
   compter plus d'une heure (déverrouillage à +46 min, collecte ensuite). Lancer une deuxième Task payée en secours.
7. `sokosumi --preprod runtime receipt <id> --coworker-id … --json` → `settled: true` + `txHash` ; ouvrir le hash sur
   l'explorateur Preprod.

`npm run health` lit le pouls du worker (`.local/health.json`, écrit à chaque tour de boucle) : code 0 si le dernier
tour date de moins de `HEALTH_MAX_AGE_MS` (10 min par défaut, une recherche occupe la boucle quelques minutes). À
utiliser comme `HEALTHCHECK` Docker.

## Lancer (local)

- Agent : `cd apps/reach-agent && EVE_PORT=21949 REACH_CACHE_DIR=.local/cache npm run dev` (les lignes vides
  `EVE_PORT=` / `REACH_CACHE_DIR=` du `.env.local` ne retombent pas sur les défauts : `??` dans `launch.ts` et
  `cache.ts`, à corriger côté agent).
- Worker : `cd apps/worker && npm ci && npm run doctor && npm start` (`.env.local` : `COWORKER_ID`,
  `SOKOSUMI_COWORKER_API_KEY`) ; `npm test`, `npm run typecheck`. Journaux par Task dans `apps/worker/.local/tasks/`,
  logs en JSON (une ligne par évènement, `taskId`, `phase`, `stage`).
- Front : landing mergée (PR #7, #8), `pnpm generate` OK ; pas déployée.

## Blocages

- MPS sur la machine d'Armand (clé Blockfrost, seed, wallet de vente financé) ; M2 se lance chez lui.
