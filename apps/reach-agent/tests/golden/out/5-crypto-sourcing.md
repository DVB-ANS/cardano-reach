# 🎯 Reach — 5 auditeurs Cardano Plutus/Aiken pour ton DEX

**Verdict** : commence par **Tweag** pour une revue DEX avec références directement comparables. Mets **MLabs** en parallèle si tu veux aussi cadrer l’off-chain et la phase de re-audit.

**Ton brief** : sourcing · crypto/DeFi · audit Plutus/Aiken d’un DEX Cardano · zone mondiale  
**Hypothèses** : budget, taille du code et échéance non précisés. Les scores évaluent l’adéquation et les preuves publiques, pas la qualité garantie de l’audit.

| # | Entreprise | Pays | Pourquoi elle | Preuve | Fraîcheur | Score |
|---|---|---|---|---|---|---:|
| 1 | **Tweag** | Non précisé dans les sources consultées | Références directes sur des DEX Cardano — Genius Yield, CardaxDEX, MinSwap — et plus de 20 audits Cardano revendiqués dans sa rétrospective publiée le 23 juillet 2026. | [Portefeuille d’audits](https://www.tweag.io/audits/) · [Rétrospective](https://tweag.io/blog/2026-07-23-cardano-audits-retrospective/) | 🟢 2026-07 pour la rétrospective ; références DEX anciennes | 92 |
| 2 | **MLabs** | Non précisé dans les sources consultées | Audit indépendant annoncé pour Aiken, Plutarch et Plinth ; décrit une méthode avec tests reproductibles, revue du code on-chain et off-chain, puis re-audit. Un article de sécurité Cardano est daté du 7 septembre 2025. | [Service d’audit](https://www.mlabs.city/audit) · [Article](https://www.mlabs.city/blog/from-bugs-to-breakthroughs) | 🟡 2025-09, ancien de 13 mois au 2026-10-06 | 89 |
| 3 | **Anastasia Labs** | Non précisé dans les sources consultées | Audit Aiken confirmé par un rapport FluidTokens de 2024 et audit des contrats DEX de Genius Yield attesté par leur documentation publique. | [Rapport Aquarium, déc. 2024](https://fluidtokens.com/audits/FluidTokens_Aquarium_Anastasia_Labs.pdf) · [Référence DEX Genius Yield](https://github.com/geniusyield/dex-contracts-api/blob/main/geniusyield-onchain/src/GeniusYield/OnChain/DEX/README.md) | 🔴 2024-12, ancien | 86 |
| 4 | **Vacuumlabs** | Non précisé dans les sources consultées | Propose explicitement l’audit Cardano et mentionne de l’expertise en Plutus, Plutarch et Aiken. La page consultée est datée du 6 juillet 2023 ; preuve d’expérience précise sur un DEX non trouvée. | [Service d’audit](https://vacuumlabs.com/services/smart-contract-auditing/) | 🔴 2023-07, ancien | 76 |
| 5 | **MLabs / audit de l’écosystème Cardano (preuve historique)** | — | L’audit MuesliSwap v2 par MLabs est rapporté par le projet ; c’est une référence DEX utile à demander lors du cadrage, mais la preuve publique consultée date de 2022. | [Annonce MuesliSwap](https://medium.com/@muesliswap/muesliswap-v2-smart-contract-successfully-passed-an-audit-by-mlabs-fb2434771521) | 🔴 2022-02, ancien | 68 |

**⚠️ Points de vigilance**
- Un audit vaut pour un périmètre, un commit et un instant donnés. Fais chiffrer séparément les contrats **on-chain**, le code de construction des transactions **off-chain**, les tests et le re-audit.
- Demande les références DEX récentes et les disponibilités actuelles : plusieurs références publiques datent de 2022–2024.
- Pour Aiken, vérifie explicitement ce qui est inclus ou exclu : outil de compilation, bibliothèques, configuration de déploiement et scripts de migration.
- La page de MLabs indique que la durée dépend du périmètre et ajoute typiquement une à deux semaines pour le délai de correction côté client. Aucun prix ferme n’a été trouvé dans les sources consultées.

**✉️ Premier message (à copier)**

> Bonjour,  
> Nous lançons un DEX sur Cardano et cherchons un audit indépendant de nos contrats Plutus/Aiken.  
> Pouvez-vous nous partager vos références DEX comparables, votre périmètre type (on-chain et off-chain), vos délais et vos modalités de re-audit ?  
> Nous pouvons transmettre le dépôt et le commit ciblé pour cadrer le devis.  
> Merci.

**🔍 Ce que je n’ai pas trouvé** : tarifs et disponibilités vérifiables pour ces auditeurs ; confirmation publique de leur capacité actuelle ; comparatif indépendant permettant de départager la qualité des équipes.