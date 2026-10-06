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
