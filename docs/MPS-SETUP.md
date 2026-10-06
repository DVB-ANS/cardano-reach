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

- [ ] Outils : Git, Node.js 24, pnpm 10.30.2 (version demandée par le guide), Docker.
- [ ] Postgres : `.postgres.env` privé (`POSTGRES_USER=mps`, `POSTGRES_DB=mps_hackathon`, mot de passe aléatoire neuf,
  `chmod 600`), conteneur `postgres:16` avec volume nommé, `pg_isready` OK avant de continuer.
- [ ] `git clone https://github.com/masumi-network/masumi-payment-service.git` puis noter `git rev-parse HEAD` (§5).
- [ ] `.env` de MPS (copie de `.env.example`, `chmod 600`) :
  - `DATABASE_URL` vers `mps_hackathon` (mot de passe encodé pour une URL) ;
  - `ENCRYPTION_KEY` : secret aléatoire ≥ 32 caractères, **à sauvegarder avec la base** (le changer rend les wallets
    illisibles) ;
  - `ADMIN_KEY` : autre secret aléatoire ≥ 32 caractères ;
  - `BLOCKFROST_API_KEY_PREPROD` : projet gratuit sur blockfrost.io, réseau **Cardano Preprod** ;
  - `PORT=3012`, `SEED_ONLY_IF_EMPTY=true`, `AUTO_WITHDRAW_PAYMENTS=true` (collecte automatique après `unlockTime`) ;
  - laisser vides : tout ce qui est Mainnet, `SEED_V1_LEGACY`, les mnémoniques (le seed génère des wallets dédiés) ;
  - **supprimer** `COLLECTION_WALLET_V2_PREPROD_ADDRESS` du `.env` et de l'environnement (vide ≠ absent).
- [ ] `pnpm install --frozen-lockfile`, `pnpm run prisma:generate`, `pnpm run prisma:migrate` (uniquement sur cette base).
- [ ] `pnpm run prisma:seed >/dev/null 2>&1` puis vérifier le code de sortie : **la sortie contient les mnémoniques**,
  elle ne doit jamais s'afficher ni finir dans un log.
- [ ] `pnpm -C frontend run build`, puis lancer MPS (`pnpm run dev`) comme service qui redémarre seul et ne s'arrête
  pas (systemd, `tmux` en dépannage, ou service du compose).

## 3. Vérifications

- [ ] `curl --fail http://127.0.0.1:3012/api/v1/health` → `status: "success"`, `data.status: "ok"`.
- [ ] Dashboard `http://127.0.0.1:3012/admin/` (depuis ta machine, connexion avec l'`ADMIN_KEY`) : source de paiement
  **Preprod `Web3CardanoV2`**, wallet d'achat, wallet de vente.
- [ ] Wallet de vente : `collectionAddress` doit valoir `null` (paiement versé au vendeur par défaut).
- [ ] `pg_dump` de `mps_hackathon` testé une fois, et sauvegarde quotidienne hors du VPS (avec l'`ENCRYPTION_KEY`).

## 4. Financement

- [ ] Envoyer du **test ADA** sur l'**adresse publique du wallet de vente** via https://dispenser.masumi.network
  (Cardano Preprod) : enregistrement, collatéral et frais de collecte. Pas besoin de test USDM côté vendeur : pour une
  Task Sokosumi, c'est Core qui finance l'escrow après débit des crédits du Workspace.
- [ ] Relever le solde réel après financement (§5).

## 5. À nous transmettre

Valeurs **publiques** : les écrire directement ici (dans une PR `docs/mps-setup`).

| Valeur | Où la trouver | Valeur |
| --- | --- | --- |
| Hébergeur de la machine (FAI si machine perso) | décide si le port 25 sortant est ouvert, voir `docs/research/phase5.md` §4 | |
| Révision MPS | `git rev-parse HEAD` | |
| ID du wallet de vente (`MPS_SELLING_WALLET_ID`) | dashboard ou `GET /api/v1/wallet` | |
| ID de la source de paiement Preprod V2 (`MPS_PAYMENT_SOURCE_ID`) | dashboard ou `GET /api/v1/payment-source` | |
| Adresse publique du wallet de vente | dashboard | |
| Solde du wallet de vente (test ADA) | dashboard / Blockfrost | |
| `collectionAddress` du wallet de vente | doit être `null` | |

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
