# Soumission TOKEN2049 Origins — checklist, slides, vidéo

Sources : `BRIEF.md` §10, `docs/masumi/agent-guide.md` §6,
[checklist Masumi](https://www.masumi.network/token2049/submission) (consultée le 2026-10-07),
[BuilderBase](https://builderbase.com/event/token2049-origins-hackathon) et ses
[règles](https://builderbase.com/event/token2049-origins-hackathon#rules).

Remplir chaque champ `⬜ à remplir` au fur et à mesure, avec la preuve (ID, lien, sortie de commande). Ne rien
déclarer « payé » tant que la collecte n'est pas confirmée on-chain (`runtime receipt` → `settled: true`).
Ne jamais coller ici de clé, de mnémonique, de clé runtime ni d'URL d'accès privée.

## 1. Code et instructions de lancement

| Livrable | Preuve | Valeur |
| --- | --- | --- |
| Repo public (ou accès juges) | lien GitHub | ⬜ à remplir |
| Instructions de lancement et de configuration | `README.md`, `.env.example` de chaque app | ✅ `README.md` (§ Lancer en local, § Déployer), `apps/*/.env.example` |
| Guide de mise en place avec commandes réelles, erreurs rencontrées et correctifs | `docs/DEVLOG.md`, runbook `infra/` | `docs/DEVLOG.md`, `docs/MPS-SETUP.md`, `docs/state/worker.md` (procédure M2) ; runbook `infra/` à écrire |
| Projet construit pendant les 36 h officielles | dates des commits | ⬜ à remplir |

Contrôle avant publication (guide Masumi §6) :

- [x] `gitleaks git --redact` vert sur tout l'historique (job CI `secrets`) : 0 fuite (2026-10-07).
- [ ] Fichiers indexés et historique relus : aucun secret, e-mail perso, chemin local, métadonnée de wallet liée à un
  compte, URL d'accès privée.
- [ ] Notes de setup privées ignorées par Git, exemple assaini publié à la place.

## 2. Démo de l'agent

| Livrable | Preuve | Valeur |
| --- | --- | --- |
| URL de l'agent déployé | `https://REACH_DOMAIN/agent-api/` | ⬜ à remplir |
| Coworker ID | sortie de `coworkers` (Sokosumi) | ✅ `01a11272-c015-748f-9f1a-cfd1e504c497` |
| Vendor ID | idem | ✅ `01a11272-9017-740c-9f1b-cd446384ccb4` |
| Task d'exemple (texte de la demande) | cas 1 de `BRIEF.md` §4 | « Je cherche un fournisseur de fixations titane certifié EN 9100, petites séries, Europe. » (Task M2) |
| Date de disponibilité de l'agent | déclaration | ⬜ à remplir |
| Entrée, fonctionnement, résultat réel | captures / extrait du rapport | ⬜ à remplir |
| Comment la qualité a été vérifiée | grille `BRIEF.md` §9.2, golden | ⬜ à remplir |
| Étapes qui ont demandé une intervention humaine | liste | ⬜ à remplir |
| Déploiement ordinateurs éteints (M4) | Task lancée depuis un autre appareil | ⬜ à remplir |

## 3. Task complétée

| Livrable | Preuve | Valeur |
| --- | --- | --- |
| Task ID de répétition (gratuite, M1) | ID Sokosumi | ✅ `01a11285-4080-7548-ba2b-7f000402340b` (Personal Workspace) |
| Task ID payée (M2) | ID Sokosumi | `01a1133e-6407-707b-8753-34abd515c437` ; Task vitrine du Workspace de l'événement : `01a115ac-fefa-7496-afc3-d6aa5e800358` (5 Tasks payées réglées, tableau dans `README.md` § On-chain proof) |
| Résultat complété | lien ou extrait du rapport | https://preprod.sokosumi.com/tasks/01a115ac-fefa-7496-afc3-d6aa5e800358 (membres du Workspace TOKEN2049) |
| IDs d'événements de la Task (questions, paiement, résultat) | événements Sokosumi | ⬜ à remplir |
| IDs de l'événement TOKEN2049 | organisation `01a109d1-32a9-71a3-a0e3-658b2a7987cd`, ID d'accès Workspace, statut | accès `01a112d0-23c1-769b-a29f-3dfc57945a85`, `GRANTED` (vérifié le 2026-10-07) |
| Statut d'accès runtime | `GRANTED` / `taskSeatEligible: true` | `taskSeatEligible: true` ; 4 Tasks démarrées et terminées dans le Workspace TOKEN2049 |
| Reprise sans doublon | redémarrage du worker en pleine Task : aucun second paiement ni collecte | ⬜ à remplir |

## 4. Preuve de paiement vendeur

| Livrable | Preuve | Valeur |
| --- | --- | --- |
| Identifiants de paiement | `blockchainIdentifier`, ID de paiement MPS | ⬜ à remplir |
| Délais signés | `payByTime`, `submitResultTime`, `unlockTime` | M2 : demande 2026-10-06 22:03:46 UTC → `payByTime` 22:18:46, `submitResultTime` 22:43:46, `unlockTime` 22:59:46, `externalDisputeUnlockTime` 23:15:46 UTC (+15 / +40 / +56 / +72 min) |
| Reçu vendeur | `runtime receipt` avec `settled: true` | `settled: true`, `onChainState: Withdrawn` pour les 5 Tasks (2026-10-07) |
| Hash de la transaction de paiement confirmée (Preprod) | hash | ⬜ à remplir |
| Lien explorateur de cette transaction | lien Cardano Preprod | ⬜ à remplir |
| Hash de la transaction de collecte confirmée | hash | M2 `b888b4a851fe3da9c4e9b5eb1c11813d4b85cba95679d7a70968b95f9a458a80` ; les 4 autres dans `README.md` |
| Lien explorateur de la collecte | lien Cardano Preprod | https://preprod.cardanoscan.io/transaction/b888b4a851fe3da9c4e9b5eb1c11813d4b85cba95679d7a70968b95f9a458a80 |
| Adresse vendeur prévue | adresse `addr_test1…` | `addr_test1qz4gqkvqw7svg6n7rv65g4tndjg3u52q6nzcuawrqmeg8cwcehy9xse720ln882ese7sc5n5xk92ylr6k6ykdu9r0nhsyzkrw5` |
| Unité du token test USDM | policy ID + nom d'asset | `16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde` + `0014df10745553444d` |
| Montant net reçu, mesuré indépendamment | `settlement.ts` : `verified: true`, `netAtomicUnits` | +1 000 000 (1 tUSDM) par collecte, mesuré via Koios `tx_info` (sorties − entrées du vendeur) pour les 5 |

## 5. Slides et dépôt

| Livrable | Preuve | Valeur |
| --- | --- | --- |
| Slides `.ppt` ou `.keynote` sur Google Drive | lien Drive (accès juges) | ⬜ à remplir |
| Vidéo de démo **intégrée** aux slides | pas de lien vidéo externe, pas de démo live | ⬜ à remplir |
| Lien du projet hébergé | front déployé | ⬜ à remplir |
| Soumission BuilderBase | lien de la soumission | ⬜ à remplir |

Les slides sont figées à l'échéance : tout remplir avant.

---

## Plan des slides

1. **Titre** : Richard, « Leads with receipts. » ; logo, équipe, track Agentic Payments on Cardano.
2. **Problème** : trouver le bon fournisseur ou client B2B = des jours d'annuaires périmés et de LinkedIn ; les outils
   vendent des listes de contacts, pas des réponses.
3. **Richard** : un Coworker Sokosumi à qui on parle comme à un collègue ; deux modes (sourcing / leads), quatre niches.
4. **Démo** : vidéo intégrée (voir script ci-dessous).
5. **Comment ça marche** : schéma Task → questions → paiement escrow → recherche multi-sources → vérification →
   rapport → collecte (`BRIEF.md` §5.1).
6. **Qualité** : « no link, no line », dates et badges de fraîcheur, golden de 9 scénarios, ce qui reste humain
   (contact, négociation).
7. **Paiement prouvé** : 1 test USDM par Task, Task ID, hash de collecte, lien explorateur, montant net reçu.
8. **Fiabilité** : questions avant paiement, reprise après crash sans double travail ni double facturation, déploiement
   ordinateurs éteints.
9. **Suite** : nouvelle niche = nouveau fichier ; personne + e-mail + accroche (roadmap) ; agent maintenu en ligne
   après le hack.
10. **Merci** : liens repo, front, Coworker.

## Script de la vidéo de démo (3 min)

Découpage de `BRIEF.md` §10. Enregistrement réel sur preprod.sokosumi.com, montage serré, sous-titres FR / EN.

| Temps | Écran | Voix off |
| --- | --- | --- |
| 0:00 – 0:20 | Annuaires, onglets LinkedIn, tableur vide | « Trouver le bon fournisseur ou le bon client B2B, c'est des jours de recherche dans des annuaires périmés. Les outils vendent des listes de contacts, pas des réponses. » |
| 0:20 – 0:40 | Landing Richard, fiche du Coworker sur Sokosumi | « Voici Richard. Tu lui parles comme à un collègue : il pose deux questions, part chasser sur le web, LinkedIn, GitHub, X et YouTube, et revient avec des entreprises sourcées, datées, et un verdict. » |
| 0:40 – 1:20 | Task aéro sourcing : « fixations titane EN 9100, petites séries, Europe » ; Richard annonce sa chasse ; rapport ; clic sur un lien de certification qui confirme | « Côté achat : un fournisseur de fixations titane certifié. Chaque ligne a sa preuve et sa date. Je clique : la certification est bien là. » |
| 1:20 – 2:10 | Task leads floue : « Je vends des jets d'affaires d'occasion » ; question à choix `INPUT_REQUIRED` ; réponse « 1 » ; rapport avec colonne « Why now » | « Côté vente : la demande est floue, alors Richard pose une question à choix avant de facturer. Une réponse, et il revient avec des acheteurs et un signal daté pour chacun. » |
| 2:10 – 2:40 | Reçu vendeur `settled: true`, transaction de collecte sur l'explorateur Preprod, montant net | « Richard se fait payer à la Task : 1 test USDM en escrow Masumi, résultat haché, collecte prouvée sur Cardano. Un agent qui gagne sa vie, sans abonnement ni clé d'API côté acheteur. » |
| 2:40 – 3:00 | Liste des niches, roadmap, logo | « Nouvelle niche, nouveau fichier. Richard reste en ligne après le hack, et demain d'autres agents peuvent l'embaucher. Pas une liste de contacts : une réponse sourcée. » |

Avant d'enregistrer :

- [ ] Les deux Tasks tournent sur l'agent déployé (pas en local), rapports relus avec la grille `BRIEF.md` §9.2.
- [ ] Aucune clé, adresse e-mail perso ni URL privée visible à l'écran.
- [ ] Hash de collecte et Task ID montrés à l'écran identiques à ceux de la section 4.
