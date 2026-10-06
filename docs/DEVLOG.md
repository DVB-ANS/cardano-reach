# DEVLOG

## 2026-10-06 — Cadrage et setup

**Quoi** : choix du produit (Coworker de sourcing / leads par niche) et préparation du setup Masumi.

**Pourquoi** : la track Masumi récompense un agent B2B utile, vivant sur Sokosumi Preprod, avec un paiement
vendeur prouvé on-chain. Le web3 n'est pas un critère.

**Cheminement** :
- Une seule niche écartée après échange avec les devrels : trop étroit ; quatre fiches de niche, sans tout
  approfondir.
- Deux modes (`sourcing` + `leads`) sur le même moteur plutôt que deux agents.
- Questions de départ : le mécanisme vérifié dans la doc du CLI est `INPUT_REQUIRED` + commentaire texte ;
  les boutons ne sont pas confirmés, d'où des choix numérotés.
- Agent-Reach gardé pour les canaux sans cookies ; Twitter / Reddit connectés écartés en déploiement.

**Bugs & fix** : `nvm use 24` échoue dans le shell outil ; contourné en préfixant le `PATH` avec le binaire
Node 24.21.0.

## 2026-10-06 — Brief, UX des questions, choix du modèle

**Quoi** : `BRIEF.md` remplace `docs/SPEC.md` (produit, use cases, UX, archi, coûts, tests, pitch, pièges, priorités).

**Pourquoi** : ~20 % de la note sur l'UI/UX et tout le monde a la même interface Sokosumi ; il faut un document
unique pour aligner les sessions parallèles et le pitch.

**Cheminement** :
- Boutons dans une Task : impossible, vérifié dans le code de Sokosumi (TaskEvent sans schéma, composer texte).
  Les vrais widgets (`radio`, `option`, `boolean`) n'existent que pour les Jobs MIP-003, sur la page du Job.
  Retenu : `INPUT_REQUIRED` + choix numérotés ; widgets MIP-003 en bonus.
- Questions avant paiement : l'escrow signe un `inputHash` et ses délais courent pendant l'attente humaine.
- Modèle : OpenAI direct (clé dispo) ; gpt-6.1-sol ~0,48 $ / Task avec recherche, gpt-6-luna en dev ;
  gpt-6-astra écarté (plus cher que la Task).
- Agent-Reach : Twitter / Reddit / LinkedIn réintégrés à la demande d'Armand, avec comptes dédiés et proxy ;
  le rapport doit tenir sans eux. OpenCLI écarté (Chrome de bureau requis).
- Hébergement sur le serveur d'Armand : Docker permet de lancer Agent-Reach (Python) depuis eve, ce que
  just-bash (sandbox eve sans Docker) ne permet pas.

## 2026-10-06 — Socle commun et moteur de recherche de l'agent

**Quoi** : contrat worker ↔ agent (`packages/contract`, `docs/CONTRACT.md`), app eve `apps/reach-agent`, simulateur
`scripts/research.ts`, moteur `src/search/` (Exa web + LinkedIn, GitHub, YouTube, lecture de pages), outils
`reach_search` / `read_pages` / `web_search`, instructions finales + 4 fiches de niche, golden, Dockerfile.

**Pourquoi** : le modèle planifie un lot de requêtes, le code les exécute en parallèle sous budget (25 s recherche,
20 s pages) ; un rapport tient en 3 à 5 allers-retours modèle, sans sous-agents.

**Cheminement** :
- Fiches de niche dans `agent/instructions/` (toujours chargées) plutôt que `load_skill` : un aller-retour de moins.
- Plafonds de concurrence par canal au niveau du processus (partagés entre sessions) pour ménager les quotas.
- Garde SSRF sur la lecture de pages : schéma, noms locaux, IP privées après résolution DNS, et redirections suivies
  à la main pour revérifier chaque saut.
- Sans clé OpenAI en local : `chatgpt()` (abonnement via Codex), `openai()` dès que `OPENAI_API_KEY` existe.

**Bugs & fix** :
- `result.status === "waiting"` vaut aussi pour une session au repos après une réponse finale : le simulateur
  (et le worker) doivent tester `inputRequests`, pas le statut. Ajouté au contrat.
- `eve build` évalue `agent/channels/eve.ts` : une vérification d'env au chargement cassait le build ; les identifiants
  Basic sont lus par requête et vérifiés au démarrage par `scripts/launch.ts start`.
- `eve build` cherchait microsandbox sur macOS sans Docker : sandbox fixé sur just-bash (`agent/sandbox.ts`).
- `gh search repos` fait un ET sur les mots : les requêtes longues rendent 0 résultat ; consigne « 1 à 3 mots-clés ».

## 2026-10-06 — Audit du lot agent avant merge

**Quoi** : revue de la PR agent puis corrections ; golden rejoué.

**Pourquoi** : merger dans `main` un agent qui tient en démo, sans faille SSRF ni image Docker cassée.

**Cheminement** :
- SSRF : `::ffff:127.0.0.1` est canonicalisé en `::ffff:7f00:1` et passait la regex ; plages IPv6 qui embarquent une
  IPv4 bloquées en entier, listes IPv4 / IPv6 séparées (une `BlockList` avec `::ffff:0:0/96` matche toutes les IPv4).
- DNS rebinding : le GET direct passe par `node:http(s)` avec un `lookup` épinglé sur l'adresse validée, à chaque saut.
- Limiteur : une attente annulée par l'échéance sort de la file au lieu d'occuper un slot plus tard.
- Garde de phase codée : `reach_search` / `read_pages` refusent en `PHASE: INTAKE` (luna rédigeait le rapport en intake).

**Bugs & fix** :
- Le MCP Exa gratuit renvoie HTTP 429 après quelques golden : serveur mcporter `exa-key` (header Bearer
  `${EXA_API_KEY}`) utilisé dès que la clé existe. Clé à créer.
- `web_search` n'est pas exposé avec `chatgpt()` : le secours n'existe qu'avec `openai()`.
- `.gitignore` `tests/golden/out/` était ancré à la racine : sorties golden versionnées par erreur, motif corrigé.

## 2026-10-06 — Front vitrine

**Quoi** : `front/` (Nuxt 4 + Tailwind 4, statique via `pnpm generate`), landing en anglais. Version finale : hero,
exemple de Task, deux modes, « how it works », paiement Masumi, footer.

**Pourquoi** : ~20 % de la note sur l'UI/UX ; la vitrine reste hors du chemin de paiement.

**Cheminement** :
- DA reprise des illustrations (bleu outremer, crème, rouge, pointillé) ; le phare sert de métaphore à Reach.
- Hero : canvas superposé à l'image (vortex, ondes, lampe) recalé avec le calcul `object-fit: cover`.
- Démo : rapport illustratif aux noms anonymisés, pour ne présenter aucune entreprise réelle comme vérifiée.
- Refonte inspirée de lvcidia.xyz : cadre sombre à encoches concaves, typo extra-large (Archivo 125 %),
  labels mono `// …`, puces, caractères qui scintillent, révélations au scroll, Lenis, menu plein écran.
  6 images seulement, la DA bleu/crème reste celle des illustrations.
- Recentrée en landing page (retour de Noé) : hero statique sans canvas, exemple de Task réduit, deux modes,
  « how it works » en 3 étapes, paiement, footer. Retirés : manifeste, carrousel d'étapes, démo de Task, niches, garde-fous.
- Slogan « Leads with receipts. » (receipts = preuves + reçu de paiement), accent orange retiré (survols en noir et
  blanc), image rouge du mode leads remplacée (cabine sous la galaxie), flux de paiement réduit à une ligne.

## 2026-10-07 — Intégration et ménage Git

**Quoi** : front mergé (PR #7), correctif `front/dist` (PR #8), API Exa + X / Reddit d'Armand (PR #6) ; toutes les
branches mergées supprimées, `main` seule branche ; `docs/ROADMAP.md` (démo → signaux → e-mail entreprise → envoi validé).

**Pourquoi** : partir du lot B sur un `main` propre et partagé.

**Cheminement** :
- Branches squash-mergées : Git les voit « en avance » ; vérifié que chaque tête de branche = tête de sa PR mergée
  avant suppression.
- Roadmap : adresses génériques d'entreprise par défaut, nominatives seulement avec base légale validée ; DM LinkedIn
  automatisés exclus (CGU) ; envoi depuis la boîte de l'utilisateur après validation explicite.

**Bugs & fix** :
- `nuxt generate` crée `front/dist`, lien absolu vers `.output/public` ; le motif `dist/` ne matche pas un lien et il a
  été commité. Retiré, motif `dist`.
- `origin/HEAD` local pointait sur `feat/masumi-setup` (figé au clone) : `git remote set-head origin --auto`.

## 2026-10-07 — Tooling minimum

**Quoi** : CI GitHub Actions (gitleaks sur l'historique, agent typecheck + tests, front build), `.gitleaks.toml`,
hook `.githooks/pre-commit`, template de PR, pnpm épinglé (PR #9) ; suppression auto des branches mergées.

**Pourquoi** : repo public à la soumission, clés et mnémoniques manipulés, deux devs qui mergent en parallèle.

**Bugs & fix** :
- gitleaks : faux positif `twitter-api-key` sur l'identifiant `twitterCredentialsPresent` → allowlist dans `.gitleaks.toml`.
- pnpm 12 avec `packageManager` enregistre sa version dans le lockfile : `--frozen-lockfile` échouait tant que le
  lockfile n'était pas régénéré.
- Protection de branche : HTTP 403 sur un repo privé d'organisation gratuite ; à activer quand le repo sera public.

## 2026-10-07 — Tooling restant (README, Dependabot, Biome front)

**Quoi** : `README.md` racine (quoi, schéma, structure, lancer en local, CI, liens), `.github/dependabot.yml`
(npm agent, front, actions ; hebdomadaire, PR groupées), Biome 2.5 sur `front/` (`pnpm lint`, étape du job `front`).

**Pourquoi** : README exigé par la soumission ; dépendances à jour sans bruit ; un style vérifié en CI.

**Cheminement** :
- Biome calé sur le style existant (2 espaces, quotes simples, sans point-virgule) pour éviter un reformatage massif ;
  formateur CSS désactivé (aurait éclaté toutes les règles sur une ligne), lint CSS gardé avec `tailwindDirectives`.
- `html.experimentalFullSupportEnabled` : sans lui, Biome ne voit pas les templates Vue et signale à tort les
  variables de `<script setup>` comme inutilisées. Formateur HTML/Vue désactivé.
- Corrigé dans `front/` : deux `!` non nuls (`obs` du callback d'IntersectionObserver, `charAt`), `type="button"`,
  `!important` du `prefers-reduced-motion` gardés avec une suppression ciblée.

## 2026-10-07 — Worker Sokosumi et M1

**Quoi** : compte Sokosumi (organisation de démo, Vendor « Cardano Reach », Coworker « Reach », clé runtime) et
`apps/worker/` : client Sokosumi, verrou d'exécuteur unique, journal atomique par Task, machine de phases avec
questions `INPUT_REQUIRED` avant paiement, réponses aux commentaires. M1 prouvé sur Sokosumi Preprod.

**Pourquoi** : M2 (Task payée) est éliminatoire ; le paiement se branche entre le brief et la recherche.

**Cheminement** :
- Sonde manuelle avant le code : Sokosumi accepte `INPUT_REQUIRED` posté par le Coworker ; la réponse humaine est un
  événement `user` sans statut ; la Task reste `INPUT_REQUIRED` jusqu'au `RUNNING` du worker.
- Polling par la clé runtime (`GET /v1/tasks?coworkerId=…&status=READY`) plutôt que `sokosumi tasks list`, qui dépend
  de l'OAuth du compte (jeton de quelques heures) ; `runtime start` / `complete` restent sur le CLI (`--api-key-stdin`),
  qui vérifie identité, Task et Workspace.
- Reprise : les tours modèle (intake, réponse, recherche) sont rejoués dans une nouvelle session eve à partir de
  Sokosumi (description + réponses humaines en `Commentaire:`), sans effet externe à dédoublonner ; une question déjà
  postée est retrouvée dans les événements au lieu d'être reposée.
- Deux questions au plus, puis hypothèses explicites ; 3 échecs d'un tour modèle → Task `FAILED` (statut vérifié dans
  l'enum `TaskStatus` de Sokosumi).

**Bugs & fix** :
- `EVE_PORT=` et `REACH_CACHE_DIR=` vides dans `.env.local` : `launch.ts` refuse le port 0 et le cache part à la racine
  de l'app (`??` au lieu de `||`). Contourné en les passant en variables d'environnement ; correctif côté agent.
- La commande `coworkers register` renvoie déjà une clé dans sa réponse ; seule celle de `coworkers api-key`, récupérée
  par le script du guide, est stockée.

## 2026-10-07 — Paiement Masumi porté (M2 prêt à brancher)

**Quoi** : `apps/worker/src/` : `payment.ts` (escrow Masumi sur la Task), `settlement.ts` (preuve de collecte),
`registration.ts` (clé MPS limitée, enregistrement, statut), `agent-api.ts` (API standard MIP-003), `hash.ts` ;
branchés dans la machine de phases entre le brief et la recherche (`PAID_TASKS_ENABLED=true`).

**Pourquoi** : M2 est éliminatoire ; tout ce qui ne dépend pas du MPS d'Armand est prêt et testé.

**Cheminement** :
- Échéances +5 / +30 / +46 / +62 min (au lieu de +20 dans la référence) : une recherche dure plusieurs minutes ; la
  recherche n'est lancée qu'avec au moins 8 min de marge avant `submitResultTime`, sinon Task `FAILED` et remboursement.
- Le rapport est `trim()` avant hachage, et la complétion poste ce texte exact sur Core sans passer par le CLI ni par
  `postEvent` (qui retaille le commentaire) : le hash soumis et le texte livré restent identiques octet pour octet.
- Conditions expirées avant l'achat : renégociées (rien n'a été posté) ; toute étape `*-pending` d'issue inconnue
  (sauf la recherche) passe en `inspection-required`, jamais rejouée.
- Après la complétion, le worker suit le retrait jusqu'à `settled` (reçu Core + transaction MPS confirmée + montant net
  mesuré via Blockfrost).

## 2026-10-07 — Docs, recherche phase 5, Dependabot, fiche du Coworker

**Quoi** : PR #13 (fiche marketplace), #14 (checklist de soumission, slides, script vidéo), #15 (recherche sourcée de
la phase 5), #16 (Dependabot suit `apps/worker`, ignore les majeures de `@types/node`), #11 (actions GitHub v7) ;
fiche du Coworker appliquée sur Sokosumi ; README, ROADMAP, TASKS, ONBOARDING, CLAUDE et BRIEF §13 remis à jour.

**Pourquoi** : la doc décrivait encore le worker comme « à venir » et la roadmap des points tranchés par la recherche.

**Cheminement** :
- Fiche : seuls les canaux actifs sont cités (web, LinkedIn public, GitHub) ; X, Reddit et YouTube viendront quand ils
  tourneront sur le VPS.
- Recherche phase 5 intégrée à la roadmap : Exa `category: "people"` sans filtre de date ; pas de lecture des pages
  Malt / Upwork / Fiverr / Codeur.com (CGU), lien seulement ; Allemagne : consentement préalable même en B2B ; envoi
  d'e-mails par un fournisseur, jamais par le port 25.
- `@types/node` 26 proposé par Dependabot (#12) refusé : les types doivent suivre le runtime Node 24.

**Bugs & fix** :
- `coworkers update --company` : l'API répond 422 « Unrecognized key: company » ; seuls `caption` et `description` ont
  été appliqués.
