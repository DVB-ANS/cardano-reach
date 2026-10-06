# Roadmap — Richard

Objectif final : **« trouve-moi quelqu'un dans tel domaine »** → Richard trouve la bonne personne ou entreprise (y compris
sur les plateformes de freelance), trouve son e-mail professionnel, puis écrit un premier message avec un vrai hook,
accroché à un élément daté et sourcé. Tout se joue sur l'exécution : chaque phase a une condition de sortie vérifiable.
Ordre : tooling minimum → chemin payé (éliminatoire) → démo → reste du tooling → personnes, e-mails, hooks.

Propriétaires : **A** = Armand (agent, VPS, Docker, déploiement), **N** = Noé (Sokosumi, worker, paiement, tooling).
Liste de tâches par personne : `docs/TASKS.md`.
Ce qui n'est pas vérifié est marqué **[À VÉRIFIER]**. Plan détaillé des lots A/B : `docs/PLAN.md`. Vérifications
sourcées de la phase 5 : `docs/research/phase5.md`.

## État au 2026-10-07

| Brique | État |
| --- | --- |
| Contrat worker ↔ agent | fait, gelé (`packages/contract`) |
| Agent eve (`apps/reach-agent`) | fait : moteur multi-canaux, 4 niches, garde de phase, SSRF, 22 tests verts |
| Canaux | web / LinkedIn / lecture de pages via l'API Exa ; X et Reddit attendent des comptes dédiés ; YouTube bloqué en local |
| Front (`front/`) | landing statique faite, pas déployée |
| Coworker Sokosumi | Vendor « Cardano Reach », Coworker « Richard » (fiche remplie), clé runtime |
| Worker (`apps/worker`) | **M1 prouvé** sur Sokosumi Preprod ; paiement Masumi porté et testé hors ligne (26 tests) |
| MPS, wallets, infra | **rien** : attend Postgres + MPS sur le VPS d'Armand (seul blocage de M2) |

---

## Phase 0 — Tooling minimum (avant tout le reste)

Ce qui protège la démo plutôt que de la retarder : repo public à la soumission, clés et mnémoniques manipulés, deux
développeurs qui mergent en parallèle.

- [x] **CI GitHub Actions** (`.github/workflows/ci.yml`) : gitleaks sur tout l'historique, agent et worker (`npm ci`,
  typecheck, tests), front (Biome, `pnpm generate`). PR #9, #10, #17.
- [x] **gitleaks** : `.gitleaks.toml` (règles par défaut + faux positifs) et hook `.githooks/pre-commit` sur le staged.
  Activation par clone : `git config core.hooksPath .githooks` + `brew install gitleaks`.
- [x] **Template de PR** (quoi, pourquoi, comment tester, aucun secret).
- [x] **Suppression auto** des branches mergées (réglage GitHub activé).
- [ ] **Protection de `main`** (PR + checks `secrets`, `agent`, `worker`, `front` obligatoires) : refusée sur un repo privé
  d'organisation gratuite (HTTP 403) ; à activer dès que le repo passe public pour la soumission.
- [ ] **Plafond de coût eve** (A) : `limits.maxTokenCostUsdPerSession` dans `apps/reach-agent/agent/agent.ts`.
- [ ] **Sauvegarde MPS** (A) : `pg_dump` quotidien hors du VPS, **dès que les wallets existent**.

**Sortie** : une PR qui contient un faux secret est bloquée ; `main` ne reçoit que des PR vertes.

## Phase 1 — Éliminatoire : une Task payée et collectée (maintenant)

Sans ça, rien d'autre ne compte.

- [ ] **Clés** (A) : `OPENAI_API_KEY`, `EXA_API_KEY` dans `apps/reach-agent/.env.local`.
- [x] **B1 Compte** (N) : `sokosumi --preprod auth login`, Vendor, Coworker `--capability tasks --personal`, clé runtime.
- [ ] **B1 Serveur** (A) : SSH au VPS, Postgres + MPS en Docker (port 3012 sur 127.0.0.1), clé
  Blockfrost Preprod, seed (sortie supprimée), selling wallet financé.
- [x] **B2 Worker** (N) : cloner `masumi-network/demo-agent-token2049` (branche `live-demo-name-finder`), porter en
  TS strict dans `apps/worker/src/` (tableau de correspondance dans `PLAN.md` §B2). Paiement compris (#18).
- [x] **B3 Intake** (N) : questions `INPUT_REQUIRED` **avant** paiement, reprise sans doublon.
- [x] **M1** : Task gratuite avec question → réponse → rapport (#17, preuves dans `docs/state/worker.md`).
- [ ] **M2** : Task payée → `runtime receipt` `settled: true` → hash de collecte ouvert sur l'explorateur.

**Sortie** : un Task ID payé + un hash de collecte confirmé, notés dans `docs/state/worker.md`.

## Phase 2 — Démo et soumission (avant la fin du hack)

- [ ] **M4 Déploiement** (A) : `infra/docker-compose.yml` (postgres, mps, reach-agent, worker, agent-api, caddy),
  `restart: unless-stopped`, test **ordinateurs fermés** depuis un autre appareil.
- [ ] **Workspace TOKEN2049** (N) : demander l'accès **tôt** (validation humaine chez Masumi), puis `SOKOSUMI_SCOPE=org`.
- [ ] **Qualité du rapport** (A) : golden 9/9 avec `gpt-6.1-sol`, relecture manuelle des liens (grille `BRIEF.md` §9.2).
- [ ] **Vérification codée des liens** (A) : avant de rendre le rapport, re-fetch de chaque URL, suppression des lignes
  dont la source ne répond pas ou ne mentionne pas l'entreprise. « No link, no line » garanti par le code, pas le prompt.
- [ ] **Front en ligne** (A) : `pnpm generate` → Cloudflare Pages ou Vercel (statique), lien Sokosumi = URL du Coworker.
- [ ] **Vidéo + slides** (N + A) : Task aéro sourcing + Task leads, question à choix, lien cliqué, hash de collecte.
- [ ] **Livrables** (`BRIEF.md` §10) : repo public sans secrets, Coworker ID, Task IDs, hash + lien explorer,
  adresse vendeur, unité USDM, montant net, slides avec vidéo intégrée, date de disponibilité.

**Sortie** : soumission BuilderBase complète, agent qui répond ordinateurs fermés.

## Phase 3 — Le reste du tooling

Une fois le chemin payé en place.

| Outil | Pourquoi | Effort |
| --- | --- | --- |
| **Biome** (lint + format TS) par app | un style, zéro débat | 30 min |
| **Dependabot** ou Renovate | dépendances à jour, alertes CVE | 10 min |
| **Logs JSON** (pino) worker + agent, avec `taskId` et `sessionId` | déboguer une Task en prod | 1 h |
| **Healthchecks Docker** + Uptime Kuma (ou Better Stack) | savoir que l'agent est mort avant les juges | 1 h |
| **Job worker** dans la CI (typecheck + tests) dès que `apps/worker/` existe | idem agent | 15 min |
| **Compteur de coût par Task** dans les logs | suivre la marge réelle par Task | 30 min |
| **Golden nocturne** en CI (secrets GitHub, modèle luna) avec score par scénario | régressions de qualité visibles | 1 h |
| **README** racine : quoi, schéma, lancer en local, déployer | exigé par la soumission | 1 h |

## Phase 4 — Signaux plus riches et gratuits (après la démo)

Le « why now » fait la valeur du mode leads. Priorité aux sources **officielles, gratuites et datées**, moins
fragiles que le scraping social.

| Signal | Source | Accès |
| --- | --- | --- |
| Recrutements (croissance, besoin d'achat) | API publiques des ATS : Greenhouse `boards-api.greenhouse.io`, Lever `api.lever.co/v0/postings/<company>`, Ashby `api.ashbyhq.com/posting-api/job-board/<org>` ; JobSpy en secours (scrape LinkedIn / Indeed : IP de VPS bloquées, CGU) | gratuit, sans clé, dates de publication |
| Identité légale, effectif, date de création | France : `recherche-entreprises.api.gouv.fr` ; UK : Companies House ; US : SEC EDGAR ; monde : OpenCorporates | gratuit (clé gratuite pour Companies House) |
| Actualités datées | GDELT DOC API, Google News RSS ; date fiable extraite avec trafilatura (pas google-news-scraper, fragile) | gratuit |
| Stack technique | fingerprinting du site (fork open source de Wappalyzer) | gratuit, local |
| Crypto / DeFi | DefiLlama (TVL, levées), GitHub, explorateurs | gratuit |
| Certifications aéro / auto | IAQG OASIS (EN 9100), pages certifs des organismes | public **[À VÉRIFIER : conditions d'accès OASIS]** |
| Enrichissement à partir du domaine | `rahulchhabria/local-enrichment-tool` (taille, stack, recrutements) | **[À VÉRIFIER : maturité]** |

À coder (A) : un canal par source dans `src/search/channels/`, sorties normalisées `{ url, date, title, snippet }`,
fixtures réelles + tests, comme les canaux existants. Dédoublonnage des entreprises par **domaine**.

## Phase 5 — La personne, son e-mail, le hook (intégration)

> **Décision produit (2026-10-07)** : c'est le cœur du produit (« mettre en relation avec le bon humain »), pas une
> option. Elle démarre dès que M2 est prouvé. Le golden suit : cas 6 (market maker) retiré, cas « personne » 6, 10 et
> 11 ajoutés au `BRIEF.md` §4.

Demande type : « trouve-moi un dev Aiken freelance en Europe » ou « le responsable achats d'un usineur titane ».
Pour chaque ligne du rapport : **la personne** (nom, rôle, lien de profil public), **son e-mail** avec un statut,
**une accroche** tirée d'un fait daté et sourcé, et l'entreprise ou la structure (freelance = entreprise individuelle).

Tout est dans l'agent, porté par **N** (A relit, l'agent est son code) : outils eve dans `apps/reach-agent/agent/tools/`, canaux dans `src/search/channels/`,
fixtures réelles + tests comme les canaux existants. **Après M2.**

### 5.1 Trouver la personne

| # | Outil | Rôle | Effort |
| --- | --- | --- | --- |
| 1 | Exa `category: "people"` (vérifié ; ne jamais passer de filtre de date ni `excludeDomains` : erreur 400) | recherche sémantique de profils (« Head of Procurement, usinage aéro, France ») | très faible, attend `EXA_API_KEY` |
| 2 | Requêtes `site:linkedin.com/in "<rôle>" "<entreprise>"` (Exa / `web_search`) ou `m8sec/CrossLinked` | nom + poste sans compte LinkedIn | faible |
| 3 | Pages équipe / about / presse via `read_pages` (déjà là ; pas de crawl4ai, inutile) | confirme le rôle avec une URL officielle = preuve | faible |
| F | Plateformes freelance (Malt, Codeur.com, Comet, Crème de la Crème, Upwork, Fiverr, Toptal, Freelancer.com) : seulement le titre et l'URL renvoyés par Exa, **sans lire la page** ; Behance / Dribbble pour le design | le cas « trouve-moi quelqu'un dans tel domaine », contact **sur** la plateforme | faible |
| 14 | `gh api` (repos, PR, commits récents) | devs, crypto, SaaS : qui fait vraiment le travail | très faible (canal github existant) |
| 4 | `stickerdaniel/linkedin-mcp-server` | profil complet, ancienneté, posts | moyen ; **compte dédié, risque de ban, contraire aux CGU : jamais sur le chemin de la démo** |

Garde-fous plateformes (vérifiés, `docs/research/phase5.md` §2) : Malt, Upwork, Fiverr et Codeur.com interdisent la
collecte automatisée et le contournement. Liste de blocage de lecture (`read_pages`, Exa `/contents`) pour ces domaines ;
la ligne du rapport donne l'URL du profil et « contact via la plateforme », sans e-mail ni accroche hors plateforme.
Les CGU de Malt sont à relire à la main (lecture automatique bloquée).

### 5.2 Trouver et vérifier l'e-mail (outil eve `find_contact`)

| # | Outil | Rôle | Effort |
| --- | --- | --- | --- |
| — | `read_pages` sur contact, mentions légales / impressum, presse, page freelance, site perso | adresses **publiées** (les mentions légales FR / DE contiennent souvent un e-mail) | très faible |
| 5 | `laramies/theHarvester` (Python, dans le conteneur agent) | vrais e-mails publics du domaine → format (`p.nom@`, `prenom@`…) | faible |
| 6 | Générateur de variantes (~20 lignes de TS, sans dépendance) | `prenom.nom`, `pnom`, `prenom`… à partir du nom et du domaine | très faible |
| — | MX + détection catch-all (`node:dns`, adresse aléatoire) | élimine les domaines morts, repère les catch-all | très faible |
| 7 | `reacherhq/check-if-email-exists` (Docker, API HTTP) ; alternative `AfterShip/email-verifier` | vérification SMTP sans envoi | moyen ; port 25 sortant bloqué par défaut chez presque tous les hébergeurs (sauf OVHcloud) : tester le VPS (`nc -vz gmail-smtp-in.l.google.com 25`) ; une IP qui vérifie en série finit en liste noire |
| 8 | API Hunter.io (offre gratuite ~25 recherches / mois) | format du domaine + score quand 5 à 7 échouent | faible |

Statut affiché dans le rapport, avec la source de chaque adresse :

| Statut | Sens |
| --- | --- |
| 🟢 publié | adresse lue telle quelle sur une page publique (lien fourni) : le plus fiable |
| 🟢 vérifié | accepté par le serveur SMTP, domaine non catch-all |
| 🟡 deviné | format déduit (variantes, theHarvester, Hunter) ou domaine catch-all : non vérifié |
| ⚪ non trouvé | rien de solide : adresse générique de l'entreprise si elle existe |

Une adresse 🟡 n'est **jamais** envoyée automatiquement (les rebonds abîment la réputation du domaine de l'utilisateur).

### 5.3 Le fait pour l'accroche (daté, sourcé, moins de 6 mois)

| # | Source | Signal | Effort |
| --- | --- | --- | --- |
| 9 | GDELT / Google News RSS + trafilatura | levée, nouvelle usine, contrat, nomination | faible |
| 10 | API ATS (Greenhouse, Lever, Ashby), JobSpy en secours | « vous recrutez 3 ingénieurs qualité » : excellent déclencheur | faible |
| 14 | `gh api` | repos et PR récents | très faible |
| 12 | `youtube-transcript-api` | citation d'un talk, podcast, salon ; IP cloud souvent bloquées : blocage traité comme « pas de transcript » | faible |
| — | twitter-cli (déjà intégré, #6) | tweets récents, surtout crypto ; **pas twscrape**, doublon | compte dédié |
| 11 | posts LinkedIn de la personne (via n°4) | l'accroche la plus personnelle | hors démo, comme n°4 |

### 5.4 Règle du hook (dans `instructions.md`) et vérification codée

- un seul fait, daté de moins de 6 mois, avec son lien ;
- relié à l'offre de l'utilisateur, finit par une question ouverte ;
- l'accroche fait **2 phrases maximum**, le message entier 60 à 120 mots, dans la langue de la personne ;
- zéro flatterie générique (« j'adore votre travail ») ;
- pas de fait trouvé → pas d'accroche personnalisée : repli sur une accroche liée à l'entreprise.

Vérifié **en code** avant de rendre le rapport (même principe que « no link, no line ») : l'URL du fait a été lue par
`read_pages` dans la session et sa date a moins de 6 mois ; sinon, accroche remplacée par le repli entreprise.

### 5.5 Préalables (à trancher avec Armand)

- **Contrat** : le `Brief` est gelé ; un mode « personne » ou une option « contacts » passe par une PR qui ne contient
  que `packages/contract/**` et `docs/CONTRACT.md`.
- **Garde-fous** : réécrire la règle « pas d'e-mail ni de téléphone personnels » (`instructions.md`, `BRIEF.md` §3.4)
  en : adresses publiées par la personne ou génériques ; adresses devinées affichées 🟡 ; jamais de téléphone.
  Vérifié (`docs/research/phase5.md` §5) : en France, prospection B2B par e-mail possible si elle concerne la fonction
  de la personne, avec information et opposition dès le premier message ; en **Allemagne (§7 UWG), consentement
  préalable exprès même entre entreprises** → aucun envoi à froid vers l'Allemagne.
- **Données personnelles** : durée de conservation des noms et adresses dans le cache disque et les logs.
- **Golden** : ajouter 3 scénarios « personne / freelance » (ex. dev Aiken freelance, responsable achats aéro,
  designer Web3).

### 5.6 Ordre d'intégration

1. **Lot 1, gratuit, sans compte (~1 jour)** : 1 + 2 + 3 + freelances + 5 + 6 + MX / catch-all + 9 + 10 + 14, règle du
   hook et sa vérification codée. Résultat : la personne, un e-mail 🟢 publié ou 🟡 deviné, une accroche datée.
2. **7 (Reacher)** si le port 25 sortant du VPS est ouvert : passer de 🟡 à 🟢 vérifié. Sinon 8 (Hunter) en secours.
3. **12** (transcripts YouTube) en bonus.
4. **4 et 11** (LinkedIn connecté) en dernier, hors démo, avec un compte jetable.

**Sortie** : sur les golden (dont les 3 nouveaux), au moins 80 % des lignes ont une personne avec lien, un e-mail
🟢 ou 🟡 avec sa source, et une accroche dont le fait a été lu et date de moins de 6 mois.

## Phase 6 — Le message, puis l'envoi

- [ ] **v1 brouillons** (A) : un message par ligne, construit sur l'accroche de 5.4, 2 variantes (angle « problème » et
  angle « opportunité »). Prêt à copier.
- [ ] **v2 export** (N) : CSV / JSON compatible lemlist, Instantly, HubSpot, Pipedrive.
- [ ] **v3 envoi avec accord** (N) : OAuth Gmail / Microsoft Graph sur la **boîte de l'utilisateur**, envoi seulement
  après validation explicite (une question `INPUT_REQUIRED` « J'envoie ces 7 messages ? »), lien de désinscription,
  liste d'opposition, plafond d'envois par jour, journal de chaque envoi.
- **Hors périmètre** : DM LinkedIn automatisés (interdits par les CGU, risque de bannissement) ; envoi depuis un
  domaine à nous sans SPF / DKIM / DMARC et préchauffage (délivrabilité) ; envoi à froid vers l'Allemagne.
- L'envoi ne dépend jamais du port 25 : fournisseur d'e-mail (API HTTP ou SMTP authentifié 587/465).

Le principe du brief « l'agent prépare, l'humain envoie » reste vrai jusqu'à la v3, où l'humain **valide** chaque envoi.

## Phase 7 — Produit après le hack

- **Mode veille** : Richard relance la recherche chaque semaine et ne remonte que les nouveaux signaux.
- **Agent-à-agent** : Richard achète des sous-tâches à d'autres agents Masumi, et d'autres agents l'embauchent
  (API MIP-003 déjà prévue).
- **Formulaires MIP-003** (`radio`, `option`) pour les questions de départ au lieu du texte numéroté.
- **Tarification** : prix par Task selon la profondeur (5 lignes rapides, 10 lignes + contacts + messages).
- **Nouvelles niches** : une fiche Markdown par niche, sans code.
- **Mesure de qualité** : taux de liens valides, taux d'e-mails valides, taux de réponse aux messages (si v3).

---

## Ordre de priorité, en une ligne

Tooling minimum → M2 payé → déploiement + soumission → CI / secrets / README → vérification codée des liens → signaux ATS et registres
→ lot 1 personnes / e-mails / hooks (gratuit) → Reacher → envoi validé par l'humain → LinkedIn connecté (hors démo).
