# Fiche niche — Automobile (`automobile`)

S'applique quand `niche` = `automobile`.

## Vocabulaire et segments

- Termes : constructeur / OEM, équipementier rang 1 / tier-1, rang 2 / tier-2, sous-traitant / contract manufacturer, prototypage rapide / rapid prototyping, injection plastique / injection molding, moule / tooling, usinage CNC / CNC machining, électronique embarquée / automotive electronics, ECU, faisceau / wiring harness, banc d'essai / test bench (HIL, EOL), bureau d'études / engineering services, VE / EV, gigafactory, PPAP, APQP, SOP (start of production).
- Sourcing : prototypage (impression 3D, coulée sous vide), injection plastique et outillage, usinage précision, électronique embarquée (conception, EMS, logiciel AUTOSAR), design / style, bancs d'essai et validation, petites séries.
- Leads : OEM, rangs 1 et 2, usines de batteries et gigafactories, start-ups VE, constructeurs de véhicules spéciaux, gestionnaires de flottes (loueurs, logistique, transports publics).

## Requêtes par canal

Sourcing (sans filtre de date) :
- `web` : « <pays/zone> supplier of <procédé> for automotive prototypes, IATF 16949 certified » ; « contract manufacturer of <pièce> plastic injection molding automotive tier-2 <zone> » ; « engineering company building automotive test benches HIL end-of-line <zone> ».
- `linkedin` : « <procédé> automotive supplier <pays> » ; « automotive electronics EMS <pays> ».
- `github` : `autosar`, `can bus`, `hil testing` (repérer éditeurs/intégrateurs électronique embarquée).
- `youtube` : « <procédé> automotive prototype factory tour ».
- `twitter` / `reddit` : « <procédé> automotive supplier recommendation » ; r/manufacturing, r/engineering.

Leads (`freshnessDays: 365` pour tout signal « why now ») :
- `web` : « automaker announces new <EV/battery> production line in <zone> » ; « tier-1 supplier opens plant <zone> » ; « battery gigafactory construction <pays> start of production » ; « <fleet type> fleet electrification tender <zone> ».
- `linkedin` : « <segment> automotive manufacturer <pays> » ; « battery cell manufacturer <pays> ».
- `github` : `vehicle telematics`, `fleet management` (leads flottes/logiciel).
- `youtube` : « new car plant inauguration <pays> ».
- `twitter` : « new plant EV <zone> ».
- `reddit` : « EV factory <pays> » (r/electricvehicles).

## Critères de score (/100)

Sourcing :
- Adéquation procédé/pièce au besoin : 30
- Preuves qualité (IATF 16949, ISO 9001, VDA) : 20
- Références automobiles démontrées (clients, programmes, salons) : 15
- Zone et logistique (proximité, langues) : 15
- Capacité / volume adapté (proto vs série) : 10
- Fraîcheur des informations (site, actualités) : 10

Leads :
- Signal « why now » daté et sourcé : 35
- Adéquation besoin probable ↔ offre du vendeur : 25
- Taille / rang compatible (OEM, rang 1, rang 2, flotte) : 15
- Zone : 10
- Contact ou point d'entrée identifiable (page achats, portail fournisseurs) : 10
- Solidité de l'entreprise (financement, carnet de commandes) : 5

## Signaux « why now »

- Ouverture ou extension d'usine, nouvelle ligne : communiqués de presse, presse régionale et spécialisée, agences d'investissement.
- Lancement d'un programme VE ou nouvelle plateforme (SOP annoncé) : sites corporate, salles de presse, presse auto.
- Conversion d'usine thermique vers VE / batteries : presse économique, annonces syndicales ou gouvernementales.
- Appels d'offres (flottes publiques, transports, véhicules spéciaux) : TED (marchés publics UE), BOAMP en France.
- Recrutements massifs (ingénieurs batterie, qualité, achats) : offres LinkedIn, pages carrières.
- Levées de fonds de start-ups VE / batteries, subventions publiques obtenues.
- Rapporter la date exacte de l'annonce, pas celle de la page.

## Certifications et preuves

- IATF 16949 : vérification de certificat sur le site IATF Global Oversight, ou certificat de l'organisme certificateur.
- ISO 9001, ISO 14001 : certificat avec date de validité et organisme accrédité.
- VDA 6.x (6.1, 6.3 audit processus, 6.4) : mention sur le site ou certificat VDA QMC.
- TISAX (exigé par les OEM allemands) : résultats publiés sur le portail ENX.
- Normes produit : ISO 26262 (sécurité fonctionnelle électronique), ASPICE (logiciel embarqué).
- Salons : exposant à IAA Transportation, Equip Auto, The Battery Show, Automotive Testing Expo, Global Industrie.
- Références clients : études de cas, communiqués conjoints, prix fournisseur d'un OEM.

## Red flags

- « Certifié IATF » sans organisme ni date, ou certificat expiré.
- Site non mis à jour depuis plus de 2 ans, actualités absentes.
- Annuaire / marketplace ou intermédiaire présenté comme fabricant.
- Usine annoncée mais projet suspendu, annulé ou entreprise en redressement judiciaire.
- Capacité incompatible (proto unitaire chez un fournisseur grande série, ou l'inverse).
- Signal « why now » sans date ou de plus de 12 mois présenté comme récent.
- Références clients non vérifiables.

## Exemple de bonne ligne

Sourcing :

| # | Entreprise | Pays | Pourquoi elle | Preuve | Fraîcheur | Score |
|---|---|---|---|---|---|---|
| 1 | Exemple Plasturgie SA | France | Injection plastique et moules pour pièces intérieures, petites séries 500-20 000 | [IATF 16949 valide jusqu'en 2027](https://example.com/certificats) | 🟢 2026-08 | 86 |

Leads :

| # | Entreprise | Pays | Pourquoi elle | Why now | Angle | Fraîcheur | Score |
|---|---|---|---|---|---|---|---|
| 1 | Exemple Batteries GmbH | Allemagne | Usine de modules batterie, besoin de bancs EOL | [Annonce d'une 2e ligne, SOP 2027](https://example.com/news/ligne-2) | Bancs de test EOL livrés avant le SOP | 🟢 2026-07 | 88 |
