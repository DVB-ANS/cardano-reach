# Fiche niche — Aéronautique & spatial (`aero-spatial`)

S'applique quand `niche` = `aero-spatial`.

## Vocabulaire et segments

- Termes FR / EN : usinage de précision / precision machining, pièce de structure / structural part, fixation / fastener,
  sous-traitant de rang 1-2 / tier 1-2 supplier, forge / forging, fonderie / casting, contrôle non destructif (CND) / NDT,
  essais / testing lab, maintenance / MRO, première pièce / FAI, avion d'affaires / business jet, CTA / AOC, lanceur / launcher.
- Matériaux : titane (Ti-6Al-4V), Inconel / superalliages base nickel, aluminium 7075, composites carbone (CFRP), céramiques.
- Segments sourcing : usineurs certifiés (5 axes, petites séries), forgerons/fondeurs, spécialistes composites,
  traitements spéciaux (anodisation, peinture, grenaillage), labos d'essais (CND, fatigue, environnement), ateliers MRO
  (moteurs, trains, avionique), fabrication additive métal.
- Segments leads : compagnies aériennes, opérateurs charter / ACMI, aviation d'affaires (acheteurs et vendeurs de jets
  d'occasion, gestionnaires de flotte), écoles de pilotage, MRO en croissance, NewSpace (lanceurs, constellations,
  composants satellites), équipementiers qui ouvrent une ligne.

## Requêtes par canal

Sourcing : pas de filtre de date (un fournisseur certifié depuis 10 ans reste pertinent).
Leads : `freshnessDays: 365` sur toutes les requêtes de signal.

- `web`
  - Sourcing : `"European manufacturer of <pièce> in <matériau> certified EN 9100, small batch production"`,
    `"Nadcap accredited <procédé spécial> provider in <zone>"`, `"EASA Part 145 approved MRO for <type moteur/avion>"`,
    `"aerospace testing laboratory for <essai> accredited ISO 17025 in <zone>"`.
  - Leads : `"<zone> airline announces fleet expansion order of new aircraft"`, `"new charter airline receives AOC in <zone>"`,
    `"NewSpace startup raises Series A to build <produit spatial>"`, `"aerospace company opens new production facility in <zone>"`.
- `linkedin` : `<pièce> aerospace machining <pays>`, `composite aerostructures <pays>`, `Part 145 MRO <pays>`,
  leads : `business aviation operator <pays>`, `satellite manufacturer <pays>`.
- `github` (1-3 mots) : `satellite`, `cubesat`, `flight software`, `avionics` — utile surtout en leads NewSpace.
- `youtube` : `"<entreprise type> aerospace machining facility tour"`, `"new airline launch <zone>"`.
- `twitter` : `"new route" <zone> airline`, `"AOC" charter <pays>`.
- `reddit` : `<pièce> aerospace supplier recommendation`, `business jet acquisition`.

## Critères de score (/100)

Sourcing :
- Certifications vérifiées (EN 9100/AS9100, Nadcap, Part 145/21G selon besoin) : 30
- Adéquation technique (pièce, matériau, procédé, taille de série) : 25
- Preuves de références aéro (programmes, clients rang 1, cas publiés) : 15
- Zone et capacité (pays, export, ITAR/EAR si pertinent) : 15
- Fraîcheur et activité (site à jour, actualités, recrutements) : 15

Leads :
- Force et date du signal why now : 35
- Adéquation au produit vendu (taille, segment, flotte) : 25
- Accessibilité (décideur identifiable, zone, langue) : 15
- Capacité de paiement (financement, contrat, taille de flotte) : 15
- Qualité de la source (officielle > presse > réseau social) : 10

## Signaux « why now »

- Expansion de flotte, commande ou livraison d'avions : communiqués, presse aéro, registres d'immatriculation nationaux.
- Ouverture de nouvelles lignes ou bases : annonces compagnies, presse locale, aéroports.
- Obtention d'un CTA/AOC ou d'un agrément Part 145 / 21G : autorités nationales, EASA, LinkedIn de l'entreprise.
- Levée de fonds NewSpace ou industrielle : presse tech, communiqués, LinkedIn.
- Nouvelle usine, extension, rachat : presse régionale, sites corporate.
- Appels d'offres publics (défense, agences spatiales, aéroports) : TED, plateformes nationales, ESA.
- Recrutements massifs (méthodes, qualité, production) : pages carrières, LinkedIn.
- Vente / achat de jet d'occasion, changement de gestionnaire : presse aviation d'affaires.

Toujours citer la date du signal ; sans date, ce n'est pas un why now.

## Certifications et preuves

- EN 9100 / AS9100 : base IAQG OASIS (https://www.iaqg.org/oasis) — vérifier le site certifié et la validité.
- Nadcap (procédés spéciaux : traitement thermique, CND, soudage, composites) : eAuditNet (PRI).
- EASA Part 145 (maintenance), Part 21G (production) : listes d'agréments EASA et des autorités nationales ;
  FAA Part 145 repair stations aux États-Unis.
- ISO/IEC 17025 (labos d'essais) : accréditeurs nationaux (COFRAC, DAkkS, UKAS…).
- CTA/AOC des opérateurs : registres des autorités nationales.
- Marchés publics : TED (https://ted.europa.eu), ESA, plateformes nationales d'achat.
- Export : mention ITAR / EAR / biens à double usage si l'acheteur est hors zone.

## Red flags

- Certification revendiquée mais absente d'OASIS, expirée, ou couvrant un autre site.
- « Aerospace quality » sans norme nommée ; ISO 9001 seul pour des pièces de vol.
- Aucune référence aéro vérifiable, site figé depuis plus de 2 ans.
- Intermédiaire / marketplace présenté comme fabricant.
- Leads : signal non daté ou de plus de 12 mois, compagnie en procédure collective, AOC suspendu, opérateur sans flotte réelle.
- Contraintes export non compatibles avec la zone du client.

## Exemple de bonne ligne

Sourcing :

| # | Entreprise | Pays | Pourquoi elle | Preuve | Fraîcheur | Score |
|---|---|---|---|---|---|---|
| 1 | Exemple Usinage SA | France | Usinage 5 axes titane Ti-6Al-4V, petites séries, rang 2 aérostructures | EN 9100 dans OASIS + Nadcap CND — [site](https://example.com/certifications) | 🟢 2026-08 | 88 |

Leads :

| # | Entreprise | Pays | Pourquoi elle | Why now | Angle | Fraîcheur | Score |
|---|---|---|---|---|---|---|---|
| 1 | Exemple Air Charter SAS | Portugal | Opérateur charter régional, 6 appareils | CTA obtenu et 3 nouvelles lignes annoncées — [communiqué](https://example.com/news/aoc) | Proposer la maintenance en ligne de la nouvelle base | 🟢 2026-07 | 82 |
