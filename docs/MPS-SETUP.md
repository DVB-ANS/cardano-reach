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

Le worker y accède par tunnel SSH en local (`ssh -N -L 3012:127.0.0.1:3012 <vps>`), puis par le réseau Docker une
fois déployé (M4). MPS n'est jamais public ; seule l'API agent passera par Caddy.

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
- [ ] Dashboard `http://127.0.0.1:3012/admin/` (par tunnel, connexion avec l'`ADMIN_KEY`) : source de paiement
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
| Hébergeur du VPS | (décide si le port 25 sortant est ouvert, voir `docs/research/phase5.md` §4) | |
| Hôte SSH pour le tunnel | `user@host` | |
| Révision MPS | `git rev-parse HEAD` | |
| ID du wallet de vente (`MPS_SELLING_WALLET_ID`) | dashboard ou `GET /api/v1/wallet` | |
| ID de la source de paiement Preprod V2 (`MPS_PAYMENT_SOURCE_ID`) | dashboard ou `GET /api/v1/payment-source` | |
| Adresse publique du wallet de vente | dashboard | |
| Solde du wallet de vente (test ADA) | dashboard / Blockfrost | |
| `collectionAddress` du wallet de vente | doit être `null` | |

Valeurs **secrètes** : par canal privé, **jamais** dans ce fichier.

| Secret | Pour quoi | Durée |
| --- | --- | --- |
| Accès SSH au VPS (clé publique de Noé ajoutée à `authorized_keys`) | tunnel vers MPS | permanent |
| `ADMIN_KEY` de MPS | une seule fois, pour créer la clé MPS limitée et enregistrer l'agent | Noé la retire de son `.env.local` juste après |

La clé Blockfrost du worker (vérification de la collecte) : Noé crée son propre projet gratuit, pas besoin de la tienne.

## 6. Ce que fait Noé ensuite (sans rien te redemander)

Procédure détaillée : `docs/state/worker.md` § « Procédure M2 ».

1. Tunnel SSH, puis `npm run registration -- key` : clé MPS **limitée au wallet de vente** (`canPay`, pas `canAdmin`).
2. `npm run agent-api`, puis `npm run registration -- register` (agent « Richard », tarif `Dynamic`, source Preprod V2) et
   `status` jusqu'à `RegistrationConfirmed`.
3. Crédits de test du Personal Workspace (Stripe test, carte `4242 4242 4242 4242`).
4. `PAID_TASKS_ENABLED=true npm start`, Task complète, suivi jusqu'à `settled` et hash de collecte sur l'explorateur
   Preprod.

**Un seul exécuteur de Tasks** : ne lance jamais le worker toi-même tant que celui de Noé tourne.
