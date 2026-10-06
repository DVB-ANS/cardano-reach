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
