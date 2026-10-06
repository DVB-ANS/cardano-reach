# Fiche niche — SaaS / Tech B2B (`saas-tech-b2b`)

S'applique quand `niche` = `saas-tech-b2b`.

## Vocabulaire et segments

- Termes : intégrateur (system integrator, SI), ESN (IT services company), agence produit (product studio, dev agency), freelance / studio spécialisé, partenaire certifié (certified partner, solutions partner), éditeur SaaS (SaaS vendor), scale-up, levée de fonds (funding round, Series A/B), stack technique (tech stack), RevOps, DPO, RSSI (CISO), conformité (compliance), migration, implémentation (implementation), MSP / MSSP.
- Sourcing (le client achète une prestation) : intégrateurs CRM/ERP (Salesforce, HubSpot, SAP, Odoo, Microsoft Dynamics), agences de dev web/mobile, studios data/IA, cabinets cybersécurité et conformité (pentest, ISO 27001, SOC 2), freelances experts d'un outil, infogérance cloud (AWS, GCP, Azure).
- Leads (le client vend) : scale-ups SaaS en croissance, entreprises qui viennent de lever, qui recrutent sur un rôle déclencheur (DPO, RSSI, RevOps, Head of Data), qui changent de stack ou lancent un produit, acteurs régulés (fintech, santé, assurance) soumis à une échéance de conformité.

## Requêtes par canal

Sourcing (sans `freshnessDays`, sauf pour vérifier qu'un prestataire est encore actif) :
- `web` : `"<zone> agency specialized in <outil/techno> implementation for B2B SaaS companies, with case studies"`, `"Certified <éditeur> partner in <pays> offering <service>"`, `"Cybersecurity firm in <zone> helping SaaS startups get ISO 27001 or SOC 2"`.
- `linkedin` : `"<outil> integrator <pays>"`, `"<techno> development studio"`, `"SOC 2 compliance consulting"`.
- `github` : `<outil> integration`, `<framework> starter` (repérer les organisations qui publient du code sur la techno).
- `youtube` : `"<outil> implementation case study"`, `"<agence> webinar <techno>"`.
- `twitter` : `"<outil> freelance"`, `"looking for <techno> agency"`.
- `reddit` : `"recommend <outil> consultant"` (r/salesforce, r/hubspot, r/SaaS).

Leads (`freshnessDays: 365` pour tout signal « why now ») :
- `web` : `"<secteur> SaaS startup in <zone> raised Series A in the last year"`, `"Announcement of <secteur> company launching new product <année>"`, `"<secteur> company preparing for <NIS2|DORA|AI Act> compliance"`.
- `linkedin` : `"<secteur> SaaS scale-up <pays>"`, `"<secteur> fintech <ville>"`.
- `github` : `<techno>` (organisations actives qui utilisent la stack ciblée).
- `youtube` : `"<secteur> startup product launch"`.
- `twitter` : `"we're hiring <rôle> <secteur>"`, `"just raised <secteur>"`.
- `reddit` : `"switching from <outil concurrent>"`.

## Critères de score (/100)

Sourcing :
- Expertise prouvée sur l'outil ou la techno demandée (certification, statut partenaire) — 30
- Cas clients comparables publiés (taille, secteur) — 25
- Activité récente (blog, changelog, posts, recrutements < 12 mois) — 15
- Adéquation zone, langue et taille d'équipe — 15
- Conformité et sécurité (ISO 27001, SOC 2, RGPD) — 15

Leads :
- Force et fraîcheur du signal « why now » — 35
- Adéquation au profil cible (secteur, taille, zone) — 25
- Compatibilité de stack ou besoin explicite — 20
- Capacité d'achat (levée, croissance des effectifs) — 10
- Contact ou angle d'entrée identifiable — 10

## Signaux « why now »

- Levée de fonds annoncée (communiqué, presse tech, Crunchbase, Dealroom) : budget neuf.
- Offres d'emploi déclencheuses (Welcome to the Jungle, LinkedIn Jobs, page carrières) : DPO, RSSI, RevOps, Head of Data, « migration vers <outil> ».
- Arrivée d'un dirigeant clé (CTO, CISO, VP Sales) : annonce LinkedIn ou communiqué.
- Échéances réglementaires : RGPD (permanent), NIS2 (transposition nationale en cours), DORA (applicable depuis janvier 2025 au secteur financier), AI Act (obligations progressives 2025-2027).
- Lancement produit, nouvelle offre, expansion internationale (blog, changelog, Product Hunt).
- Changement de stack visible : offres d'emploi citant un nouvel outil, nouveaux repos.

Toujours citer la date de la source ; un signal sans date n'est pas un « why now ».

## Certifications et preuves

- Annuaires partenaires : Salesforce AppExchange (appexchange.salesforce.com), HubSpot Solutions Directory (ecosystem.hubspot.com), AWS Partner Network, Microsoft AI Cloud Partner Program, Google Cloud Partner Advantage, partenaires Odoo (odoo.com/partners).
- Sécurité / conformité : ISO/IEC 27001 (certificat avec organisme accréditeur), rapport SOC 2 (AICPA), HDS (hébergement de données de santé, France), qualification SecNumCloud (ANSSI).
- Avis et références : G2, Clutch, Capterra ; études de cas sur le site du prestataire.
- Existence légale : Pappers / registre du commerce (France), Companies House (UK), Handelsregister (DE).
- Financement : communiqués officiels, Crunchbase, Dealroom.
- Activité : changelog, blog, GitHub, offres d'emploi récentes.

## Red flags

- Statut partenaire revendiqué mais absent de l'annuaire officiel de l'éditeur.
- Aucune étude de cas datée, logos clients sans contexte.
- Site, blog et réseaux inactifs depuis plus de 12 mois ; société radiée ou en procédure collective.
- Certification revendiquée sans organisme ni périmètre.
- « Agence » qui est en fait une plateforme de mise en relation opaque.
- Leads : levée de plus de 24 mois, licenciements récents, rachat en cours, concurrent direct du vendeur.

## Exemple de bonne ligne

Sourcing :

| # | Entreprise | Pays | Pourquoi elle | Preuve | Fraîcheur | Score |
|---|---|---|---|---|---|---|
| 1 | Exemple Intégration SAS | France | Partenaire HubSpot, 3 migrations Salesforce→HubSpot publiées pour des SaaS de 50-200 salariés | [Fiche partenaire](https://example.com/partner) · [Cas client](https://example.com/case) | 🟢 2026-07 | 86 |

Leads :

| # | Entreprise | Pays | Pourquoi elle | Why now | Angle | Fraîcheur | Score |
|---|---|---|---|---|---|---|---|
| 1 | Exemple Fintech SA | Belgique | Fintech B2B de 80 salariés, stack HubSpot + AWS | Série A annoncée et offre « DPO » publiée ([source](https://example.com/news)) | Accompagnement DORA avant l'audit annuel | 🟢 2026-08 | 82 |
