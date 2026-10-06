# cardano-reach — Coworker Sokosumi « Reach » (TOKEN2049 Origins, track Cardano / Masumi)

Historique et décisions : `docs/DEVLOG.md`.

## Objectif

Coworker payant sur Sokosumi Preprod (standard Masumi, 1 test USDM par Task) : « Reach », shortlist sourcée et
datée d'entreprises, mode `sourcing` (fournisseurs) ou `leads` (clients, style TamTam), par niche.
Brief complet (produit, UX, archi, pitch, pièges, priorités) : `BRIEF.md`. Plan parallèle : `docs/WORKSTREAMS.md`.

## Stack

- Agent : Vercel eve (`agent/`), modèle OpenAI, outils web + Agent-Reach (Python, Docker).
- Worker Node 24 (`worker/`) : polling des Tasks Sokosumi, intake `INPUT_REQUIRED`, paiement Masumi.
- Masumi Payment Service + PostgreSQL sur le serveur d'Armand, Blockfrost Preprod.
- Guide officiel : `docs/masumi/agent-guide.md`, skill `docs/masumi/SKILL.md`.
- Référence vérifiée : `~/dev/demo-agent-token2049/live-team-names-20261006/`.

## Commandes

- Node 24 : `export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH`
- CLI : `sokosumi --preprod auth whoami --json`

## État

- Fait : repo `DVB-ANS/cardano-reach` (branche `feat/masumi-setup`), CLI `sokosumi` 1.0.4 sur Node 24,
  guides officiels téléchargés, `BRIEF.md` et plan parallèle rédigés.
- À faire : priorités `BRIEF.md` §12, workstreams A-D.
- Bloqué sur Armand : compte Sokosumi Preprod + organisation démo + `auth login`, `OPENAI_API_KEY`,
  clé Blockfrost Preprod, financement wallet, accès serveur.
