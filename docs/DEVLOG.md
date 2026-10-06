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

## 2026-10-07 — Décision produit : « le bon humain », garde-fous du mode payé

**Quoi** : le cœur du produit passe de « la bonne entreprise » à « le bon humain » (personne à contacter, e-mail
professionnel avec statut, accroche datée), écrit dans `BRIEF.md` §1, §3, §4, §6.4 et `ROADMAP.md` phase 5 ; cas golden 6
(market maker) retiré ; trois correctifs du worker en mode payé (#21) ; infos privées retirées des docs.

**Pourquoi** : une liste d'entreprises, beaucoup d'outils la font ; savoir à qui parler et quoi lui écrire, c'est ce
qui fait gagner des heures. Le socle livré pour la démo reste la shortlist sourcée ; la personne arrive juste après M2.

**Cheminement** :
- Erreurs sur une personne : chaque contact vient avec ses liens de preuve, l'humain vérifie avant d'écrire.
- Freelances : trouvés, mais sur Malt / Upwork / Fiverr / Codeur on donne seulement le lien du profil et le message à
  envoyer sur la plateforme (CGU, `docs/research/phase5.md`).
- Accroche : posts LinkedIn illisibles sans compte connecté (exclu) ; sources publiques (blog, GitHub, talks, presse,
  X dès que le compte dédié existe).
- Cas golden 6 : « tokens sans liquidité sérieuse » n'est pas prouvable avec une date sans source on-chain ; garder le
  refus de l'agent plutôt que de lui faire compléter avec des pistes faibles.

**Bugs & fix** (#21, relevés par l'audit) :
- Task déjà payée relancée avec `PAID_TASKS_ENABLED=false` : la recherche repartait en gratuit et le texte livré ne
  correspondait plus au hash on-chain. Elle reste maintenant en attente du mode payé.
- Recherche payée en échec relancée à chaque poll : plafonnée à 3 tentatives, puis `FAILED` (escrow remboursé).
- Échéance MPS illisible : `Number(undefined)` donnait `NaN`, et toute comparaison avec `NaN` est fausse, ce qui
  désactivait les contrôles de délai. Erreur explicite désormais.

## 2026-10-07 — L'agent s'appelle Richard

**Quoi** : le produit et l'agent passent de « Reach » à « Richard » : Coworker Sokosumi (nom + description), personnalité
et titre du rapport de l'agent, questions et messages du worker, nom d'enregistrement Masumi, front, docs. Front :
promesses alignées (« sourced & dated » au lieu de « verified », « 1 test USDM » sur Cardano Preprod). Demande de
connexion du Coworker au Workspace TOKEN2049 envoyée (`PENDING`).

**Pourquoi** : décision d'équipe sur le nom.

**Cheminement** :
- Gardés tels quels : noms techniques (repo `cardano-reach`, `apps/reach-agent`, variables `REACH_*`, outil
  `reach_search`, évènement `reach:loaded`), Vendor « Cardano Reach » (le CLI ne sait pas renommer un Vendor), slug du
  Coworker `reach`, et les entrées passées de ce DEVLOG.
- Footer du front : logo passé de 15,5 vw à 12,5 vw, sinon « RICHARD // » déborde.

## 2026-10-07 — Pré-vol, logs JSON et pouls du worker ; M2 chez Armand

**Quoi** : `npm run doctor` (pré-vol en lecture seule : config, CLI, clé runtime, Tasks, agent, exécuteur unique, et
avec `--paid` : MPS, enregistrement, clé MPS limitée, Blockfrost), logs JSON d'une ligne par évènement (`taskId`,
`phase`, `stage`), pouls `.local/health.json` et `npm run health` pour le `HEALTHCHECK` Docker.

**Pourquoi** : Noé n'a pas d'accès SSH à la machine d'Armand ; M2 se lance donc chez Armand, et il faut qu'il sache
en une commande si tout est prêt, sans aller-retour.

**Cheminement** :
- Le tunnel SSH du plan disparaît : le worker tourne sur la machine du MPS, la clé runtime du Coworker passe de Noé à
  Armand par canal privé, l'`ADMIN_KEY` ne quitte pas la machine d'Armand.
- Pouls tolérant (10 min) : une recherche occupe la boucle quelques minutes, un seuil court ferait redémarrer Docker
  en pleine Task.

## 2026-10-07 — M2 : première Task payée livrée, réparation des tableaux

**Quoi** : deuxième Task payée (`01a1133e-6407-707b-8753-34abd515c437`) : paiement verrouillé, résultat soumis on-chain,
Task `COMPLETED` avec un rapport de 7 fournisseurs réels ; collecte en attente du déverrouillage. Le worker répare
maintenant la ligne de séparation des tableaux Markdown avant hachage et livraison.

**Pourquoi** : le rapport livré avait un en-tête à 7 colonnes et une séparation à 8, ce qui casse l'affichage du
tableau, la partie la plus regardée.

**Cheminement** :
- Réparation dans `Agent.research` (avant `fitReport`, donc avant le hash en mode payé) : texte livré et hash restent
  identiques octet pour octet. Seule la ligne de séparation change ; l'alignement des colonnes existantes est gardé.

**Bugs & fix** :
- Première Task payée (`01a11321…`) en échec : le MPS ne constate l'escrow qu'après 20 confirmations et un poll de 3 min
  (~10 min), le devis ne laissait que 5 min pour payer → `FundsOrDatumInvalid`. Échéances passées à +15 / +40 / +56 / +72
  min (#26, Armand).
- L'agent d'Armand tournait sur une version d'avant le renommage : le rapport payé s'ouvre sur « Reach ». À mettre à
  jour après la collecte.
## 2026-10-06 — Validation Docker locale de l'agent

**Quoi** : contexte Docker protégé des fichiers `.env*`, correction de la copie du `tsconfig.base.json`, construction
de `reach-agent:local` avec Node 24.21.0 et smoke de l'authentification Basic.

**Bugs & fix** :
- Le `Dockerfile` déplaçait l'app dans `/app` mais ne copiait pas `/tsconfig.base.json` attendu par
  `apps/reach-agent/tsconfig.json` : `eve build` échouait. Le fichier racine est maintenant copié dans l'image.
- `.env.example` laissait les ports et chemins optionnels vides ; après copie, `PORT=` masquait la valeur Docker et
  empêchait le démarrage. Les valeurs locales sûres sont désormais explicites.
- Le `/` d'eve est public et ne vérifie pas l'authentification. Le smoke cible `/eve/v1/info` : 401 sans identifiants,
  200 avec les bons.
- `npm audit --omit=dev` signale 4 vulnérabilités modérées et 1 haute dans les dépendances transitives d'eve
  (`guarded-fetch` / `undici`) ; `npm audit fix --force` rétrograderait eve et n'a pas été appliqué.
- Canal twitter : `search` répondait HTTP 404 avec l'avertissement `Failed to init ClientTransaction`. twitter-cli 0.8.5
  récupère x.com **sans cookies** pour calculer `x-client-transaction-id` ; X sert maintenant une page déconnectée
  (`x-web/entry-client-logged-out-*.js`) sans marqueur `ondemand.s`. Avec `auth_token` + `ct0`, x.com sert encore
  l'ancienne page. Le `Dockerfile` épingle twitter-cli 0.8.5 et ajoute les cookies à cette requête d'init
  (public-clis/twitter-cli#78, toujours ouvert) ; le build échoue si la ligne patchée disparaît.

## 2026-10-07 — Golden dans Docker, retrait du cas 6

**Quoi** : golden `gpt-6.1-sol` contre `reach-agent-local` (canaux web, linkedin, github, twitter ; YouTube coupé) :
8/9. Segment « market maker » ajouté à la fiche crypto. Cas `6-crypto-leads` retiré du golden.

**Pourquoi** : « sans liquidité sérieuse » n'est pas prouvable avec une date sans source on-chain. L'agent rend 2 puis
4 pistes (après la fiche) et refuse d'ajouter des lignes sans liquidité horodatée : c'est la rigueur voulue, pas un
défaut. On n'ajoute pas de pistes « à confirmer » pour atteindre 5 lignes. Le cas sera remplacé par un scénario
« trouver la bonne personne » quand l'agent évoluera.

**Bugs & fix** :
- Golden en Docker : `EACCES` sur `tests/golden/out` monté (conteneur `node` UID 1000, hôte UID 1001) → lancer avec
  `--user "$(id -u):$(id -g)"`.
- `npm run golden` dans l'image affiche « .env.local not found » : attendu, `.dockerignore` l'exclut et les variables
  arrivent par `--env-file` ; appeler `node scripts/golden.ts` directement.

## 2026-10-07 — MPS sur le serveur d'Armand, enregistrement, 1re Task payée

**Quoi** : Postgres 16 + MPS (`docs/MPS-SETUP.md`) en services `systemctl --user`, wallet de vente financé,
enregistrement Masumi `RegistrationConfirmed`, `agent-api` et worker payé sur le serveur ; première Task payée en échec,
cause trouvée et corrigée.

**Bugs & fix** :
- MPS passe `listen: PORT` à express-zod-api, sans hôte : écoute sur toutes les interfaces (LAN + Tailscale).
  `infra/mps/bind-localhost.mjs`, préchargé par `NODE_OPTIONS`, ajoute `127.0.0.1` au seul port de MPS ; `PORT` est une
  chaîne (`CONFIG.PORT`), le module accepte nombre et chaîne.
- `sokosumi auth login` sur le serveur : pas de navigateur (`xdg-open ENOENT`), puis refus de stocker la session sans
  coffre système (`secret-tool`). Les Tasks se créent depuis le site, la clé runtime suffit au worker.
- Task `01a11321-…` : escrow de Core verrouillé en 3 min, mais MPS ne constate un verrouillage qu'après 20 confirmations
  et un poll de 3 min ; avec `payBy` +5 min et 300 s de grâce, il a classé le paiement `FundsOrDatumInvalid`. Échéances
  passées à +15 / +40 / +56 / +72 min (contraintes MPS : `payBy` ≤ `submitResult` − 5 min, 15 min entre `submitResult`,
  `unlock` et dispute). Le worker restait aussi bloqué en `awaiting-escrow` sur cet état : il fait maintenant échouer la
  Task (FAILED posté, escrow remboursé à Core).

## 2026-10-07 — Accès TOKEN2049 accordé, un worker pour deux Workspaces

**Quoi** : connexion du Coworker au Workspace TOKEN2049 `GRANTED`. Le worker lit le Workspace de chaque Task
(`organizationId`) et démarre/termine la Task avec `--personal` ou `--organization-id` ; `SOKOSUMI_SCOPE` retiré.

**Pourquoi** : avec un scope global, un même worker aurait échoué soit sur les Tasks des juges (Workspace de
l'événement), soit sur les Tasks personnelles. Le Workspace est une donnée de la Task, pas un réglage du worker.
