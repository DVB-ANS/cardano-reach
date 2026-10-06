# Masumi Payment Service sur le VPS — à faire par Armand

Ce qui manque pour **M2** (Task payée, collecte confirmée, éliminatoire). Le worker de Noé est prêt et testé
(`apps/worker`, #17, #18) : il ne lui faut plus que ce nœud de paiement. Source officielle :
`docs/masumi/agent-guide.md` §4 (« Prepare your payment node » à « Register your paid agent »).

Règles : aucun secret dans ce fichier, dans Git, dans le chat ou dans une capture. Les valeurs publiques vont dans le
tableau du §5 ; les secrets passent par un canal privé (gestionnaire de mots de passe partagé, message éphémère).

## 1. Ce qui tourne sur le VPS

| Service | Détail |
| --- | --- |
| PostgreSQL 16 | base dédiée `mps_hackathon`, utilisateur `mps`, volume persistant, **pas exposé** (127.0.0.1 ou réseau Docker) |
| Masumi Payment Service | clone de `masumi-network/masumi-payment-service`, `PORT=3012`, écoute sur **127.0.0.1 uniquement** |

Le worker tourne sur la même machine (Noé n'a pas d'accès SSH) et y accède en `http://127.0.0.1:3012`, puis par le
réseau Docker une fois déployé (M4). MPS n'est jamais public ; seule l'API agent passera par Caddy.

## 2. Installation (guide §4, dans l'ordre)

- [x] Outils : Git, Node.js 24, pnpm 10.30.2 (version demandée par le guide), Docker.
- [x] Postgres : `.postgres.env` privé (`POSTGRES_USER=mps`, `POSTGRES_DB=mps_hackathon`, mot de passe aléatoire neuf,
  `chmod 600`), conteneur `postgres:16` avec volume nommé, `pg_isready` OK avant de continuer.
- [x] `git clone https://github.com/masumi-network/masumi-payment-service.git` puis noter `git rev-parse HEAD` (§5).
- [x] `.env` de MPS (copie de `.env.example`, `chmod 600`) :
  - `DATABASE_URL` vers `mps_hackathon` (mot de passe encodé pour une URL) ;
  - `ENCRYPTION_KEY` : secret aléatoire ≥ 32 caractères, **à sauvegarder avec la base** (le changer rend les wallets
    illisibles) ;
  - `ADMIN_KEY` : autre secret aléatoire ≥ 32 caractères ;
  - `BLOCKFROST_API_KEY_PREPROD` : projet gratuit sur blockfrost.io, réseau **Cardano Preprod** ;
  - `PORT=3012`, `SEED_ONLY_IF_EMPTY=true`, `AUTO_WITHDRAW_PAYMENTS=true` (collecte automatique après `unlockTime`) ;
  - laisser vides : tout ce qui est Mainnet, `SEED_V1_LEGACY`, les mnémoniques (le seed génère des wallets dédiés) ;
  - **supprimer** `COLLECTION_WALLET_V2_PREPROD_ADDRESS` du `.env` et de l'environnement (vide ≠ absent).
- [x] `pnpm install --frozen-lockfile`, `pnpm run prisma:generate`, `pnpm run prisma:migrate` (uniquement sur cette base).
- [x] `pnpm run prisma:seed >/dev/null 2>&1` puis vérifier le code de sortie : **la sortie contient les mnémoniques**,
  elle ne doit jamais s'afficher ni finir dans un log.
- [x] `pnpm -C frontend run build`, puis lancer MPS (`pnpm run dev`) comme service qui redémarre seul et ne s'arrête
  pas (systemd, `tmux` en dépannage, ou service du compose). Fait : service `systemctl --user` `masumi-payment-service`
  (`Restart=always`). MPS écoute sinon sur toutes les interfaces : `infra/mps/bind-localhost.mjs`, préchargé par
  `NODE_OPTIONS=--import=…` avec `PORT=3012` dans l'unité, le limite à `127.0.0.1` (vérifié : `ss`, refus depuis le LAN).

## 3. Vérifications

- [x] `curl --fail http://127.0.0.1:3012/api/v1/health` → `status: "success"`, `data.status: "ok"`.
- [ ] Dashboard `http://127.0.0.1:3012/admin/` (depuis ta machine, connexion avec l'`ADMIN_KEY`) : source de paiement
  **Preprod `Web3CardanoV2`**, wallet d'achat, wallet de vente.
- [x] Wallet de vente : `collectionAddress` doit valoir `null` (paiement versé au vendeur par défaut).
- [ ] `pg_dump` de `mps_hackathon` testé une fois (fait : dump `-Fc` restaurable, 59 tables, `~/backups/mps/`), et
  sauvegarde quotidienne hors du VPS (avec l'`ENCRYPTION_KEY`) : destination à choisir.

## 4. Financement

- [x] Envoyer du **test ADA** sur l'**adresse publique du wallet de vente** via https://dispenser.masumi.network
  (Cardano Preprod) : enregistrement, collatéral et frais de collecte. Pas besoin de test USDM côté vendeur : pour une
  Task Sokosumi, c'est Core qui finance l'escrow après débit des crédits du Workspace.
- [x] Relever le solde réel après financement (§5).

## 5. À nous transmettre

Valeurs **publiques** : les écrire directement ici (dans une PR `docs/mps-setup`).

| Valeur | Où la trouver | Valeur |
| --- | --- | --- |
| Hébergeur de la machine (FAI si machine perso) | décide si le port 25 sortant est ouvert, voir `docs/research/phase5.md` §4 | Machine perso (VM KVM) derrière une box Free (AS12322). Port 25 sortant **bloqué** (timeout vers `gmail-smtp-in.l.google.com:25`, 587 ouvert), testé le 2026-10-07 |
| Révision MPS | `git rev-parse HEAD` | `d569a338ca54d5be7441564770d75ebf89b71f12` |
| ID du wallet de vente (`MPS_SELLING_WALLET_ID`) | dashboard ou `GET /api/v1/wallet` | `cmux5qdhk00091p154eefbh50` |
| ID de la source de paiement Preprod V2 (`MPS_PAYMENT_SOURCE_ID`) | dashboard ou `GET /api/v1/payment-source` | `cmux5qdhg00041p15x4fdp05a` |
| Adresse publique du wallet de vente | dashboard | `addr_test1qz4gqkvqw7svg6n7rv65g4tndjg3u52q6nzcuawrqmeg8cwcehy9xse720ln882ese7sc5n5xk92ylr6k6ykdu9r0nhsyzkrw5` |
| Solde du wallet de vente (test ADA) | dashboard / Blockfrost | 105 tADA + 100 tUSDM (Blockfrost, bloc 5261916, 2026-10-07) |
| `collectionAddress` du wallet de vente | doit être `null` | `null` (vérifié par l'API le 2026-10-07) |

Valeurs **secrètes** : par canal privé, **jamais** dans ce fichier.

| Secret | Pour quoi | Durée |
| --- | --- | --- |
| Clé runtime du Coworker (`SOKOSUMI_COWORKER_API_KEY`), de Noé vers Armand | le worker tourne sur ta machine | permanent |
| `ADMIN_KEY` de MPS | reste chez toi : `npm run registration -- key` et `register` se lancent sur ta machine | retirée du `.env.local` du worker juste après |

La clé Blockfrost du worker (vérification de la collecte) : celle du MPS convient, le worker tourne sur la même machine.

## 6. Ensuite : M2 sur ta machine

Procédure détaillée : `docs/state/worker.md` § « Procédure M2 (sur la machine d'Armand) ». Commence par
`cd apps/worker && npm ci && npm run doctor -- --paid` : il dit exactement ce qui manque.

En bref : clé runtime du Coworker reçue de Noé → `npm run doctor` → `npm run registration -- key` →
`npm run agent-api` + `register` + `status` (jusqu'à `RegistrationConfirmed`) → `npm run doctor -- --paid` tout vert →
`PAID_TASKS_ENABLED=true npm start` → Noé crée la Task payée → suivi jusqu'à `settled`.

**Un seul exécuteur de Tasks** : le worker de ta machine. Noé arrête le sien avant.
