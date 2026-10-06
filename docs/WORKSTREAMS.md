# Plan parallèle — 4 sessions Claude

Source de vérité : `BRIEF.md` (produit, UX, décisions, pièges) et `docs/masumi/agent-guide.md` (guide officiel,
à donner à chaque session). Implémentation de référence vérifiée par Masumi :
`~/dev/demo-agent-token2049/live-team-names-20261006/` (branche `live-demo-name-finder`).

## Règles communes

- Node 24 obligatoire : `export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH` (CLI `sokosumi` 1.0.4 installé dessus).
- Un seul écrivain par fichier, base de données et wallet. Chaque session n'écrit que dans son périmètre.
- Chaque session tient son état dans `docs/state/<stream>.md` (IDs, ports, checkpoints prouvés, blocages).
- Aucun secret dans le chat, le code, les logs ou l'état : `.env.local` (ignoré par Git) et le coffre du CLI.
- Un seul exécuteur de Tasks par Coworker. Ne jamais recréer un Vendor, un Coworker ou des wallets existants.

## A — Compte et Coworker (`docs/state/account.md`)

Étapes 1-2 du guide. Actions humaines (Armand) : inscription sur preprod.sokosumi.com, création d'une
organisation démo dans le Workspace switcher, `sokosumi --preprod auth login` (navigateur).
Livrables : Vendor ID, Coworker ID (`--capability tasks --personal`), accès `GRANTED`, clé runtime
importée dans `.env.local` + coffre via la commande Node du guide, Task d'exécution manuelle `COMPLETED`.

## B — Agent eve (`agent/`, `docs/state/agent.md`)

Étape 3 du guide + `BRIEF.md` §3-6. `npx eve@latest init`, modèle OpenAI (`openai("gpt-6-luna")` en dev,
`gpt-6.1-sol` pour la démo, `OPENAI_API_KEY`), `agent/instructions.md` (personnalité Reach, intake, deux modes,
format de rapport, garde-fous, fraîcheur), `agent/niches/*.md` (4 fiches), outils `web_search` / `web_fetch` /
`ask_question`, puis outil custom `agent_reach`.
Livrable : les 4 scénarios de démo (`BRIEF.md` §4) rendent un rapport sourcé, vérifié à la main.

## C — Nœud de paiement MPS (`~/dev/masumi-payment-service`, `docs/state/payment.md`)

Étape 4 du guide, partie MPS. PostgreSQL sur le serveur d'Armand, base dédiée `mps_hackathon`
(en local, Docker est absent et seul `libpq` est installé).
Actions humaines : clé Blockfrost Preprod, financement du selling wallet via dispenser.masumi.network.
Livrables : `/api/v1/health` OK, wallets seedés (sortie supprimée), selling wallet financé, agent enregistré
en `Dynamic` avec `RegistrationConfirmed`, clé MPS scopée pour le worker.

## D — Worker (`worker/`, `docs/state/worker.md`)

Part de la référence (`worker.mjs`, `paid-task.mjs`, `comments.mjs`, `worker-lock.mjs`, `settlement.mjs`).
Ajoute l'intake **avant** la demande de paiement (`BRIEF.md` §6.3) : quand eve renvoie `status:"waiting"` avec
`inputRequests`, poster `{"status":"INPUT_REQUIRED","comment":…}` via `createTaskEvent`, attendre le commentaire
humain, `session.respond()`, repasser la Task en `RUNNING`. La référence traite `inputRequests` comme un échec.
Branche A (IDs, clé runtime), B (URL eve) puis C (MPS) dès qu'ils sont prêts.
Livrables : Task payée 1 test USDM → résultat → `runtime receipt` avec `settled: true` et hash de collecte.

## Ensuite (une seule session)

Déploiement sur le serveur d'Armand (Docker) : PostgreSQL, MPS, worker, eve + Agent-Reach (Python) ; pas de
serverless, redémarrage auto, journaux persistants. Test ordinateur éteint, demande d'accès au Workspace TOKEN2049,
preuves de soumission et slides. Front vitrine en parallèle (indépendant du chemin de paiement).
