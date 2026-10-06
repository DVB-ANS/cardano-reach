# 🎯 Reach — 4 pistes d’auditeurs Cardano pour votre DEX

**Verdict** : commencez par **Tweag** et **MLabs** pour comparer deux approches solides, toutes deux directement centrées sur la sécurité Cardano. Tweag publie des audits de DEX Cardano ; MLabs décrit une offre couvrant explicitement Aiken et l’ensemble du protocole, y compris l’off-chain. Demandez à chacun un périmètre et un devis sur le même commit.

**Votre brief** : sourcing · crypto / DeFi · audit de smart contracts Plutus et/ou Aiken · DEX Cardano  
**Hypothèses** : zone, budget et calendrier non précisés. Les scores sont indicatifs ; les tarifs, délais et disponibilités sont à confirmer.

| # | Entreprise | Pays | Pourquoi elle | Preuve | Fraîcheur | Score |
|---|---|---|---|---|---|---:|
| 1 | [Tweag](https://www.tweag.io/audits/) | Non précisé | Expérience directement pertinente : sa liste documente des audits de DEX Cardano, dont MinSwap, Genius Yield et Cerra AMM. La rétrospective publiée en 2026 indique plus de 20 audits Cardano. Confirmez que l’équipe prend en charge votre langage et votre périmètre actuels. | [Audits et rapports publics](https://www.tweag.io/audits/) · [rétrospective](https://www.tweag.io/blog/2026-07-23-cardano-audits-retrospective/) | 🟢 2026-07 pour la rétrospective ; audits listés jusqu’à 2025 | 94 |
| 2 | [MLabs](https://www.mlabs.city/audit) | Non précisé | Offre spécialisée Cardano : Aiken, Plutarch et Plinth. L’audit annoncé couvre le code on-chain, le transaction-building off-chain et la conception du protocole — bon alignement avec un DEX. Aucun rapport de DEX nommé n’a été confirmé dans les pages consultées. | [Périmètre et méthode d’audit](https://www.mlabs.city/audit) | non daté | 88 |
| 3 | [Vacuumlabs](https://vacuumlabs.com/services/smart-contract-auditing/) | Non précisé | Présente une expertise d’audit de smart contracts Cardano et nomme Plutus, Plutarch et Aiken. Demandez des rapports Cardano comparables et confirmez la portée du contrôle off-chain. | [Service d’audit](https://vacuumlabs.com/services/smart-contract-auditing/) | 🔴 ancien — page datée du 2023-07-06 | 75 |
| 4 | [CertiK](https://www.certik.com/ecosystems/cardano) | Non précisé | Déclare couvrir les audits Plutus/Aiken et les risques EUTxO. La page indique une inscription au registre d’auditeurs Cardano CIP-52 ; vérifiez les références DEX Cardano et l’équipe assignée avant de retenir l’offre. | [Offre Cardano](https://www.certik.com/ecosystems/cardano) · [CIP-52](https://cips.cardano.org/cip/CIP-0052) | non daté | 73 |

**⚠️ Points de vigilance**
- Faites chiffrer le même périmètre : contrats on-chain, construction des transactions off-chain, tests, modèle de menace et ré-audit après correctifs.
- Pour un DEX, demandez une revue explicite des risques EUTxO : composition des transactions, concurrence, authentification des UTxO, redeemers, minting policies et risques de déni de service.
- Faites confirmer par écrit le langage effectivement audité — Plutus, Aiken ou les deux — et demandez des rapports Cardano publiés ou des références vérifiables. Un historique ne garantit pas l’absence de vulnérabilités.
- Les pages consultées ne confirment pas les prix, les délais, la disponibilité ni les conditions de confidentialité.

**✉️ Premier message (à copier)**  
> Bonjour,  
> Nous lançons un DEX sur Cardano et cherchons un audit de sécurité de nos contrats Plutus/Aiken.  
> Pouvez-vous préciser vos références DEX/Cardano, votre périmètre (on-chain, off-chain, conception), vos disponibilités et le format de devis ?  
> Nous pouvons partager le dépôt, la spécification et un commit cible pour cadrer l’estimation.  
> Merci.

**🔍 Ce que je n’ai pas trouvé** : tarif ou délai public comparable, ni preuve récente d’audit DEX pour chaque prestataire. Les pages de MLabs, Vacuumlabs et CertiK ne sont pas datées dans les contenus lus ; je ne les présente donc pas comme des signaux d’activité récents.