# Fiche niche — Crypto / DeFi (`crypto-defi`)

S'applique quand `niche` = `crypto-defi`.

## Vocabulaire et segments

- Termes : audit de smart contract (*smart contract audit*, *security review*), teneur de marché (*market maker*), fournisseur RPC / nœud (*RPC provider*), oracle (*price feed*), indexeur (*indexer*), studio de dev (*Web3 dev studio*), TVL, TGE (*token generation event*), mainnet, bridge, DEX, lending, grant.
- Cardano : Plutus, Aiken, Plutarch, eUTxO, Catalyst (fonds communautaire), Cardano Foundation, Intersect.
- Segments **sourcing** : auditeurs (EVM, Solana, Cardano Plutus/Aiken), market makers (CEX/DEX), infra (RPC, oracles, indexeurs), studios de dev.
- Segments **leads** : protocoles avant TGE ou mainnet (audit, liquidité), tokens lancés depuis moins de 90 jours avec une liquidité faible (market maker), protocoles en croissance de TVL (intégrations, infra), projets financés (Catalyst, levée), protocoles post-exploit (ré-audit).

## Requêtes par canal

Sourcing (sans filtre de date, sauf pour vérifier l'activité récente) :
- `web` : « independent smart contract audit firm with public reports for <écosystème> protocols », « Cardano Plutus and Aiken smart contract auditor with published audit reports », « crypto market maker providing liquidity for <type de token> on <DEX/CEX> », « RPC node provider supporting <chaîne> », « blockchain development studio building <type de dApp> on <chaîne> ».
- `linkedin` : « smart contract security audit firm », « crypto market making firm », « blockchain infrastructure RPC provider », « Web3 development agency <pays> ».
- `github` : `audits`, `audit-reports`, `aiken`, `plutus audit`, `<chaîne> rpc` (1 à 3 mots).
- `youtube` : « <auditeur générique> audit walkthrough <chaîne> », « Cardano smart contract security talk ».
- `twitter` : « audit report <chaîne> », « Aiken audit ».
- `reddit` : « recommended smart contract auditor <chaîne> ».

Leads (`freshnessDays: 365` pour tout signal « why now ») :
- `web` : « <chaîne> DeFi protocol announcing mainnet launch », « <chaîne> project announcing token generation event and upcoming audit », « Web3 startup raised seed round to build <type de produit> on <chaîne> », « post-mortem of exploit on <type de protocole> ».
- `linkedin` : « DeFi protocol <chaîne> », « Web3 startup <pays> <segment> ».
- `github` : `<chaîne> dex`, `aiken`, `<protocole-type> contracts` (repos récemment mis à jour).
- `youtube` : « <chaîne> project mainnet announcement », « Catalyst funded project demo ».
- `twitter` : « TGE <chaîne> », « mainnet live <chaîne> », « post-mortem exploit ».
- `reddit` : « <chaîne> new DeFi launch ».

Leads pour un **market maker** (tokens récents peu liquides, `freshnessDays: 90`) :
- `web` : « token generation event completed this month <chaîne> », « new token listing announcement <exchange> », « token now live on Uniswap / Raydium / Minswap », « airdrop and TGE of <type de protocole> token ».
- `twitter` : « TGE live », « now live on Uniswap », « listing <exchange> », « liquidity pool live ».
- `linkedin` : « DeFi protocol token launch ».
- Lis ensuite les pages de marché des candidats (CoinGecko, GeckoTerminal, DexScreener, DexPaprika) pour qualifier la liquidité : profondeur ±2 %, liquidité des pools, volume. Un chiffre non horodaté reste `non daté`.

## Critères de score (/100)

Sourcing :
- 30 — preuves publiques vérifiables (rapports d'audit publiés, clients nommés, code ouvert).
- 20 — adéquation technique (chaîne, langage : Solidity, Rust, Plutus/Aiken).
- 15 — réputation et historique (années d'activité, protocoles audités sans incident majeur).
- 15 — activité récente (rapport, commit ou annonce < 12 mois).
- 10 — équipe identifiable (noms, LinkedIn, entité légale).
- 10 — zone, langue, capacité (taille, délais, petites missions).

Leads :
- 35 — force et fraîcheur du signal « why now » (daté, sourcé).
- 25 — adéquation besoin ↔ offre du vendeur.
- 15 — traction (TVL DefiLlama, utilisateurs, financement).
- 15 — équipe joignable (fondateurs nommés, canaux publics).
- 10 — zone, chaîne, langue.

## Signaux « why now »

- TGE ou token annoncé → audit, market maker, listing (X, blog du projet).
- Token lancé depuis moins de 90 jours avec un pool ou un carnet peu profond → market maker (annonce de TGE ou de listing, page de marché).
- Mainnet ou testnet → audit, RPC, oracles, indexeurs (blog, X, GitHub release).
- Levée de fonds → budget prestataires (communiqués, presse crypto, X).
- Exploit ou hack → post-mortem, ré-audit, monitoring (blog, X, Rekt News).
- Financement Catalyst approuvé → livrables, dev/audit (Project Catalyst, X).
- Recrutement d'ingénieurs Plutus/Aiken/Solidity (LinkedIn, sites carrières).
- Forte hausse de TVL ou intégration annoncée (DefiLlama, X).

## Certifications et preuves

- Rapports d'audit publics : dépôt GitHub de l'auditeur, PDF sur son site, lien depuis la doc du protocole audité (qui doit confirmer l'audit).
- DefiLlama (defillama.com) : TVL, chaînes, historique, liste des hacks.
- Project Catalyst (projectcatalyst.io) : propositions financées et jalons.
- Cardano Foundation et Intersect : partenaires et grants annoncés sur leurs sites.
- Rekt News (rekt.news) : historique d'exploits.
- Explorateurs : Etherscan (contrat vérifié), Cardanoscan, Cexplorer.
- Annonces officielles sur le compte X du projet, cohérentes avec le site.
- Bug bounty publié (Immunefi) ; entité légale vérifiable (registre du pays).

## Red flags

- Équipe anonyme sans audit public ni code vérifiable.
- « Audité » sans rapport accessible, ou rapport non confirmé par l'auditeur.
- Market maker promettant volumes ou cours garantis (wash trading).
- Exploit récent sans post-mortem ni correctif.
- Chiffres (TVL, utilisateurs, clients) introuvables chez une source tierce.
- Site, X ou GitHub inactifs depuis plus de 12 mois.
- Mentions de sanctions, poursuites ou rug pull.
- Signal « why now » non daté : le noter `non daté`, jamais le présenter comme récent.

## Exemple de bonne ligne

Sourcing :

| # | Entreprise | Pays | Pourquoi elle | Preuve | Fraîcheur | Score |
|---|---|---|---|---|---|---|
| 1 | Exemple Audit SA | Suisse | Audits Aiken/Plutus, 12 rapports publics sur GitHub | [Rapports](https://example.com/audits) | 🟢 2026-08 | 86 |

Leads :

| # | Entreprise | Pays | Pourquoi elle | Why now | Angle | Fraîcheur | Score |
|---|---|---|---|---|---|---|---|
| 1 | Exemple Labs SAS | France | DEX Cardano, TVL en hausse sur DefiLlama | [TGE annoncé](https://example.com/tge) pour novembre | Audit avant TGE + revue Aiken | 🟢 2026-09 | 81 |
