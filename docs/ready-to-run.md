# Ready-to-run Tasks (cartes Sokosumi)

Cartes pré-remplies du New Task picker (`metadata.offers`, format : `docs/coworker-metadata.md` du dépôt
`masumi-network/sokosumi`). Un prompt devient une carte seulement après un test local concluant ; l'aperçu reprend un
extrait du vrai rapport.

## Candidats

| # | Cas | Prompt | Statut |
| --- | --- | --- | --- |
| 1 | RH, le bon humain (F1) | I am an hr and I'm searching an f1 engineer specialised in aerodynamics who has a lot of experiences on this topic and who is available soon or now. | testé le 2026-10-07 (local, gpt-6.1-sol, 0 question, ~2 min 40) : 5 profils, surtout des consultants ex-F1 ; dispo jamais confirmée (dit honnêtement) ; « rôle non confirmé » en français dans un rapport anglais. À adapter |
| 1b | RH, le bon humain (F1), version adaptée | I'm an HR recruiter. I need a senior F1 aerodynamicist (10+ years, CFD and wind tunnel) in the UK or Europe who could join soon. Look for signs they are available: recently left a team, open to work, or end of gardening leave. | **publié** le 2026-10-07 (carte « Find a senior F1 aerodynamicist ») : 3 profils, signal daté (départ Cadillac, 26/06/2026), dispo jamais inventée ; aperçu = début du rapport réel, e-mails masqués |
| 2 | Leads SaaS IA support (FR/BE) | Je suis fondateur d'un SaaS B2B basé sur l'IA… (agent qui rédige les réponses dans Zendesk/Intercom, e-commerce et SaaS 30-300 salariés, FR/BE, Head of Support ou COO, 10 entreprises, hors CAC 40) | testé le 2026-10-07 (local, 0 question, ~5 min 40) : 8 pistes sur 10 (le dit), 1 seule très qualifiée (TDI), décideur nommé pour 2 sur 8, 4 lignes sans contact. Exclusions justifiées, dates contrôlées. Trop long pour une carte ; contacts faibles |
| 2b | Leads SaaS IA support, version carte | I sell an AI agent that drafts support replies in Zendesk or Intercom. Find 3 e-commerce or SaaS companies in France or Belgium (30–300 employees) hiring support agents now, and the Head of Support or COO to contact. | testé le 2026-10-07 (~3 min) : 3/3 avec recrutement daté, outil confirmé et décideur nommé (Bellerose, Tomorro, Riot), angle adapté (Fin déjà en place). **publié** le 2026-10-07 (carte « Find your first B2B customers », préfixe « Support AI leads — »), e-mails masqués |
| 3 | DevRel Cardano × x402 | Find the developer advocate in the Cardano ecosystem who contributed to x402, Coinbase's HTTP payment protocol. Give their name, role, X and GitHub with proof, then summarise their public views from the last 6 months. | testé le 2026-10-07 (~5 min) : identité trouvée et prouvée (LinkedIn, GitHub, X), contribution qualifiée honnêtement (fork + draft PR, pas de merge upstream ; auteurs upstream cités), positions datées. Classé `sourcing` au lieu d'un mode « personne ». **Publié** le 2026-10-07 (carte « Identify a Cardano DevRel », préfixe « Cardano DevRel × x402 — »), aperçu anonymisé |

Les prompts commencent par un libellé (« F1 aerodynamicist — », …) : sans lui, le générateur de titres de Sokosumi
« répond » à la demande (titre vu : « I don't have access to real-time information, current social… »).
Images : Wikimedia Commons, domaine public ou CC0.
