# Phase 5 — vérification des points [À VÉRIFIER]

Vérifie les points marqués **[À VÉRIFIER]** dans `docs/ROADMAP.md` phase 5 (personne, e-mail, hook).
Méthode : lecture directe des sources primaires (docs officielles, CGU, textes de loi) et appels GET anonymes sur les
trois API ATS. Toutes les sources ont été consultées le **2026-10-07**.

> **Pas un conseil juridique.** Les points 2 et 5 rapportent ce que disent les textes ; un juriste valide avant tout
> envoi réel.

## Synthèse

| # | Point | Conclusion actionnable |
| --- | --- | --- |
| 1 | Exa, catégorie personnes | `category: "people"` (remplace `"linkedin"` depuis le 2025-12-19) ; ne jamais passer `startPublishedDate`, `endPublishedDate`, `excludeDomains` (erreur 400). |
| 2 | CGU Malt, Upwork, Fiverr, Codeur.com | Toutes interdisent ou encadrent la collecte automatisée et le contournement : pas de lecture de ces pages par Richard, seulement l'URL publique renvoyée par le moteur, contact **sur** la plateforme. |
| 3 | Endpoints publics ATS | Greenhouse, Lever, Ashby : GET sans authentification ; aucune limite de débit publiée → cache et appels sobres. |
| 4 | Port 25 sortant | Bloqué par défaut chez presque tous (sauf OVHcloud VPS / dédiés) : envoi via relais authentifié (587/465) ou API HTTP, quel que soit l'hébergeur. |
| 5 | Prospection B2B par e-mail | France : opt-out si en rapport avec la fonction, information et opposition dès le 1er message. Allemagne (§7 UWG) : consentement préalable exprès, même en B2B → pas d'envoi à froid vers l'Allemagne. |
| 6 | YouTube depuis un VPS | youtube-transcript-api documente le blocage de la plupart des IP cloud : traiter le blocage comme « pas de transcript ». |

---

## 1. API Exa : catégorie « people »

**Constat**

- Valeurs documentées de `category` : `"company"`, `"publication"`, `"news"`, `"personal site"`, `"financial report"`,
  `"people"`. La doc précise : « Other strings are accepted and used as category hints for search. »
- Restriction : « The `company` and `people` categories only support a limited set of filters. The following
  parameters are NOT supported for these categories: `startPublishedDate`, `endPublishedDate`, `excludeDomains`.
  Using unsupported parameters will result in a 400 error. »
- Changelog du 2025-12-19 : « People search now spans 1B+ public profiles via a hybrid retrieval system. The `linkedin`
  category is replaced by the new `people` category. » L'ancienne valeur `"linkedin profile"` est obsolète.
- Changelog du 2026-01-21 : pour la recherche d'entreprises, `type: "auto"` avec `category: "company"`.
- Comportement de `includeDomains`, `includeText`, `excludeText` avec ces catégories : **non vérifié**.

**Sources**

- [Search — Exa API reference](https://exa.ai/docs/reference/search) — consulté le 2026-10-07
- [Changelog — Exa](https://exa.ai/docs/changelog) — consulté le 2026-10-07
- [People Search Reference — Exa](https://exa.ai/docs/reference/verticals/people-for-coding-agents) — consulté le 2026-10-07

**Conclusion actionnable**

- Utiliser `category: "people"` (et `"company"` avec `type: "auto"` pour les entreprises).
- Retirer `startPublishedDate`, `endPublishedDate` et `excludeDomains` de la requête quand la catégorie est `people`
  ou `company` ; filtrage par date et exclusion de domaines en post-traitement.
- Un test unitaire vérifie que la requête construite ne contient jamais ces clés pour ces catégories.

---

## 2. CGU Malt, Upwork, Fiverr, Codeur.com

### Fiverr (Terms of Service, « Last update: January 2026 »)

- Usages interdits (viii) : « use any robot, spider, crawlers or other automatic device, process, software or queries
  that intercepts, "mines," scrapes or otherwise accesses the Site to monitor, retrieve, extract, copy or collect
  content or data from or through the Site, **or engage in any manual process to do the same** ».
- §5.2 Non Circumvention : « You may not offer or solicit (or accept any offer or solicitation from) Sellers to
  contract, engage, pay, or make payment outside of the Site. » Dommages forfaitaires de 10 000 USD prévus en cas de
  violation par l'acheteur.
- §8.1 : « Requesting or providing email addresses, third party messaging applications, telephone numbers or any
  other personal contact details to communicate outside of Fiverr … is not permitted. »

### Upwork

- `upwork.com/legal` renvoie 403 à la lecture automatisée ; textes lus dans les PDF hébergés par Upwork (PactSafe).
  **Vérifier qu'ils sont toujours en vigueur.**
- Terms of Use, usages interdits : « using any robot, spider, scraper, or other automated means to access the Site for
  any purpose without our express written permission; collecting or harvesting any personally identifiable
  information, including Account names, from the Site ».
- User Agreement (PDF du 2023-07-06), §7 Non-Circumvention : pendant 24 mois à partir d'une relation Upwork, le site
  est le moyen exclusif de paiement, sauf paiement d'une « Conversion Fee » (1 000 à 50 000 USD par relation) ; ne
  s'applique pas si les parties se connaissaient avant.

### Malt

- CGU, centre d'aide et `robots.txt` renvoient 403 à la lecture automatisée : **rien vérifié en source primaire**.
- Source secondaire (post LinkedIn de février 2024 citant l'art. 9.2.2) : indemnité de 10 000 € si un client engage
  un freelance hors plateforme dans les 12 mois suivant la mise en relation. **Non vérifié.**
- Clause sur le scraping : **non vérifié**. À lire à la main avant toute intégration.

### Codeur.com

- Mentions légales : « Toutes requêtes automatisées ou semi automatisées des données publiées sur ce site, faites sans
  l'autorisation de Codeur.com sont illicites. »
- CGU : « Il est rigoureusement interdit de publier des informations de contact dans la description d'un projet. »
- CGU : « Codeur.com n'est pas intermédiaire de paiement entre les parties. Une fois les parties mises en relation,
  il leur appartient de conduire leurs affaires en direct » : pas de clause anti-contournement du paiement.
- `robots.txt` : `Disallow: /system/projects/`, `Disallow: /*?*`.

**Sources**

- [Fiverr — Terms of Service](https://www.fiverr.com/legal-portal/legal-terms/terms-of-service) — consulté le 2026-10-07
- [Upwork — Terms of Use (PDF PactSafe)](https://upwork.pactsafe.io/versions/5fe11ea2f589c9764881bac8.pdf) — consulté le 2026-10-07
- [Upwork — User Agreement (PDF PactSafe, 2023-07-06)](https://upwork.pactsafe.io/versions/64a63ee98763a953463e10af.pdf) — consulté le 2026-10-07
- [Upwork — Legal Center](https://www.upwork.com/legal) — consulté le 2026-10-07 (403)
- [Malt — CGU](https://www.malt.fr/about/terms) — consulté le 2026-10-07 (403)
- [Post LinkedIn citant l'art. 9.2.2 des CGU Malt (source secondaire)](https://fr.linkedin.com/posts/pierrechalamet_changement-des-conditions-g%C3%A9n%C3%A9rales-dutilisation-activity-7163989784812597248-6yFY) — consulté le 2026-10-07
- [Codeur.com — Termes et conditions d'utilisation](https://www.codeur.com/pages/termes-et-conditions-d-utilisation) — consulté le 2026-10-07
- [Codeur.com — Mentions légales](https://www.codeur.com/pages/mentions-legales) — consulté le 2026-10-07
- [Codeur.com — robots.txt](https://www.codeur.com/robots.txt) — consulté le 2026-10-07

**Conclusion actionnable**

- **Interdit** : lire ou extraire ces sites (profils, listes, recherche), y compris via `/contents` d'Exa ou
  `read_pages` ; y collecter des coordonnées ; suggérer un contact ou un paiement hors plateforme pour un freelance
  trouvé dessus. Fiverr interdit même la collecte manuelle systématique.
- **Tolérable (à valider juridiquement)** : afficher le titre et l'URL publique d'un profil tels que renvoyés par le
  moteur de recherche, comme lien vers la plateforme ; l'utilisateur contacte **sur** la plateforme.
- **Implémentation** : liste de blocage de lecture pour `malt.fr`, `malt.com`, `upwork.com`, `fiverr.com`,
  `codeur.com` ; ces lignes sont marquées « contact via la plateforme », sans e-mail ni accroche hors plateforme.
  La règle de la roadmap (« on lit des pages publiques indexées ») est donc à resserrer pour ces domaines.

---

## 3. Endpoints publics des ATS

| ATS | Endpoint | Auth | Paramètres utiles | Limites documentées |
| --- | --- | --- | --- | --- |
| Greenhouse | `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs` | aucune (« Job Board data is publicly available, so authentication is not required for any GET endpoints ») | `content=true` (description, département, bureau) ; `pay_transparency=true` | aucune publiée |
| Lever | `GET https://api.lever.co/v0/postings/{site}` ; UE : `https://api.eu.lever.co/v0/postings/{site}` | aucune en GET (clé seulement pour le POST de candidature) | `mode=json`, `skip`, `limit`, `location`, `team`, `department`, `commitment`, `level`, `group` | 2 req/s documenté pour le POST seulement ; GET non vérifié |
| Ashby | `GET https://api.ashbyhq.com/posting-api/job-board/{JOB_BOARD_NAME}` | aucune | `includeCompensation=true` | aucune publiée ; en-tête observé `cache-control: public, max-age=60` |

Test du 2026-10-07 : HTTP 200 sans authentification sur les trois (`greenhouse/airbnb?content=true` ≈ 2,2 Mo,
`lever/leverdemo?mode=json&limit=1`, `ashby/ashby?includeCompensation=true` ≈ 2,1 Mo).

**Sources**

- [Greenhouse — Job Board API](https://docs.greenhouse.io/job-board.html) — consulté le 2026-10-07
- [Lever — postings-api (GitHub)](https://github.com/lever/postings-api) — consulté le 2026-10-07
- [Ashby — Public Job Posting API](https://developers.ashbyhq.com/docs/public-job-posting-api) — consulté le 2026-10-07

**Conclusion actionnable**

- Signal « recrute » fiable et légitime : ce sont des API publiques prévues pour cet usage.
- Découverte de l'identifiant depuis la page carrières : `boards.greenhouse.io/<token>`, `jobs.lever.co/<site>`,
  `jobs.ashbyhq.com/<name>` ; pour Lever, essayer l'instance UE si la globale renvoie 404.
- Réponses lourdes avec `content=true` : timeout, cache d'au moins 1 h par board, une requête par entreprise.

---

## 4. Port 25 sortant chez les hébergeurs

| Hébergeur | Port 25 bloqué par défaut | Déblocage |
| --- | --- | --- |
| Hetzner Cloud | oui (25 et 465) | demande dans la console après 1 mois et la 1re facture payée, au cas par cas ; 587 ouvert |
| OVHcloud | VPS et dédiés : **non** ; Public Cloud : oui ; VPS Local Zones : tous ports SMTP fermés, sans déblocage | blocage antispam a posteriori, levé via l'espace client ou `POST /ip/{ip}/spam/{ipSpamming}/unblock` ; Public Cloud non vérifié |
| Scaleway Instances | oui (25, 465, 587) | « Enable SMTP » dans le security group ; prérequis éventuels non vérifiés |
| DigitalOcean | oui (25, 465, 587) | aucune procédure : fournisseur d'e-mail tiers |
| AWS EC2 | oui | formulaire de levée de restriction |
| AWS Lightsail | oui | formulaire depuis le compte root, par région, jusqu'à 48 h (page en 403, à revérifier) |
| Google Compute Engine | oui hors VPC (« some projects do not have this restriction ») | pas de procédure ; 587/465 ou service tiers |
| Azure (VM) | oui, sauf Enterprise Agreement et MCA-E | relais SMTP authentifié sur 587 |
| Vultr | oui sur les nouvelles instances | ticket support (cas d'usage, SPF/DKIM, volume), « not guaranteed » |
| Linode / Akamai | oui pour certains comptes créés après le 2019-11-05 (25, 465, 587) | ticket support |
| Contabo | **non vérifié** (pas de source primaire) | — |
| IONOS VPS | oui | support par téléphone |

**Sources**

- [Hetzner — Cloud Servers FAQ](https://docs.hetzner.com/cloud/servers/faq/) — consulté le 2026-10-07
- [OVHcloud — VPS FAQ](https://docs.ovhcloud.com/en/guides/bare-metal-cloud/virtual-private-servers/vps-faq) — consulté le 2026-10-07
- [OVHcloud — AntiSpam best practices and unblocking an IP](https://docs.ovhcloud.com/en/guides/bare-metal-cloud/dedicated-servers/antispam-best-practices) — consulté le 2026-10-07
- [Scaleway — Send emails from your Instance](https://www.scaleway.com/en/docs/instances/how-to/send-emails-from-your-instance/) — consulté le 2026-10-07
- [DigitalOcean — Why is SMTP blocked?](https://docs.digitalocean.com/support/why-is-smtp-blocked/) — consulté le 2026-10-07
- [AWS — Amazon EC2 service quotas (port 25)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-resource-limits.html) — consulté le 2026-10-07
- [AWS re:Post — Remove port 25 restriction from your Lightsail instance](https://repost.aws/knowledge-center/lightsail-port-25-throttle) — consulté le 2026-10-07 (403)
- [Google Cloud — Sending email from an instance](https://docs.cloud.google.com/compute/docs/tutorials/sending-mail) — consulté le 2026-10-07
- [Microsoft — Troubleshoot outbound SMTP connectivity in Azure](https://learn.microsoft.com/en-us/azure/virtual-network/troubleshoot-outbound-smtp-connectivity) — consulté le 2026-10-07
- [Vultr — Why is SMTP blocked](https://docs.vultr.com/support/products/compute/why-is-smtp-blocked) — consulté le 2026-10-07
- [Akamai — Send email on Akamai Cloud](https://techdocs.akamai.com/cloud-computing/docs/send-email) — consulté le 2026-10-07
- [IONOS — VPS: Getting started](https://www.ionos.com/help/server-cloud-infrastructure/first-steps-vps/vps-getting-started/) — consulté le 2026-10-07

**Conclusion actionnable**

- Garder le test `nc -vz gmail-smtp-in.l.google.com 25` de la roadmap : il décide seulement si la **vérification**
  SMTP (Reacher, statut 🟢 vérifié) est possible depuis le VPS. Sinon, Hunter en secours.
- L'**envoi** (phase 6) ne dépend jamais du port 25 : fournisseur d'e-mail (API HTTP ou SMTP authentifié 587/465),
  SPF, DKIM et DMARC sur un domaine dédié. Sur DigitalOcean et Scaleway, même le 587 est fermé par défaut.
- Hébergeur du VPS d'Armand à confirmer pour savoir laquelle de ces lignes s'applique.

---

## 5. Prospection B2B par e-mail : France et Allemagne

### France

- **CPCE art. L34-5** : interdit la prospection directe par e-mail « utilisant … les coordonnées d'une personne
  physique, abonné ou utilisateur, qui n'a pas exprimé préalablement son consentement » ; dans tous les cas, des
  coordonnées valables pour demander l'arrêt des envois sont obligatoires.
- **CNIL (B2B)** : « La prospection à l'égard de professionnels peut être fondée sur l'intérêt légitime de l'organisme
  lorsque l'objet de la sollicitation est en rapport avec la profession de la personne démarchée ». La personne doit
  être informée et pouvoir s'opposer « de manière simple et gratuite … à tout moment notamment lors de chaque envoi ».
- **CNIL** : « Les adresses génériques de type info[@]nomsociete.fr, contact[@]nomsociete.fr … qui concernent des
  personnes morales, ne sont pas soumises aux principes rappelés ci-dessus. »

### Allemagne

- **§7 Abs. 2 UWG** : Nr. 1, téléphone : consentement présumé (« mutmaßliche Einwilligung ») suffisant envers un
  professionnel. Nr. 2, e-mail : « ohne dass eine vorherige ausdrückliche Einwilligung des Adressaten vorliegt » est
  une nuisance inacceptable, **sans distinction B2B / B2C**. Le consentement présumé ne vaut que pour le téléphone.
- **§7 Abs. 3 UWG** : seule exception e-mail, l'adresse obtenue d'un client lors d'une vente, pour des produits
  similaires ; ne couvre pas la prospection à froid.
- **BGH, 20.05.2009, I ZR 218/07** : « Bereits die einmalige unverlangte Zusendung einer E-Mail mit Werbung kann einen
  rechtswidrigen Eingriff in das Recht am eingerichteten und ausgeübten Gewerbebetrieb darstellen. »

### RGPD (les deux pays)

- Considérant 47 : la prospection peut relever de l'intérêt légitime (art. 6(1)(f)) ; cela ne lève pas le §7 UWG.
- Art. 14(3)(b) : information au plus tard lors de la première communication quand les données servent à contacter
  la personne.
- Art. 21(2) à (4) : droit d'opposition à la prospection à tout moment, signalé au plus tard lors de la première
  communication ; après opposition, plus aucun traitement à cette fin.

**Sources**

- [Légifrance — CPCE art. L34-5](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042155961) — consulté le 2026-10-07
- [CNIL — La prospection commerciale par courrier électronique](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique) — consulté le 2026-10-07
- [Gesetze im Internet — § 7 UWG](https://www.gesetze-im-internet.de/uwg_2004/__7.html) — consulté le 2026-10-07
- [BGH, I ZR 218/07 (PDF)](https://www.bundesgerichtshof.de/SharedDocs/Entscheidungen/DE/Zivilsenate/I_ZS/2007/I_ZR_218-07.pdf?__blob=publicationFile&v=1) — consulté le 2026-10-07
- [EUR-Lex — Règlement (UE) 2016/679 (RGPD)](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32016R0679) — consulté le 2026-10-07

**Conclusion actionnable** (Richard affiche des adresses et prépare des messages)

1. **Afficher n'est pas envoyer** : envoi uniquement sur validation humaine, message par message ; l'utilisateur est
   l'expéditeur.
2. **Adresses génériques d'abord** (contact@, sales@…) : hors principes CNIL en France ; le §7 UWG s'applique quand
   même en Allemagne.
3. **Selon le pays de la cible** : France et UE hors Allemagne, envoi à froid en opt-out si l'objet est lié à la
   fonction (le brouillon dit « pourquoi cette personne ») ; **Allemagne, pas d'e-mail à froid**, proposer un autre
   canal (formulaire de contact, téléphone B2B) — alternatives **non vérifiées** juridiquement.
4. **Chaque brouillon contient** : identité de l'expéditeur, source de l'adresse, finalité, moyen d'opposition gratuit.
5. **Liste d'opposition** persistante, consultée avant chaque proposition ; journaliser la source et la date de chaque
   adresse.
6. La phrase de `ROADMAP.md` §5.5 est confirmée pour la France et **corrigée** pour l'Allemagne : consentement exprès
   exigé pour l'e-mail, y compris en B2B.

---

## 6. Bonus : YouTube depuis un VPS

**Constat**

- README de youtube-transcript-api : « YouTube has started blocking most IPs that are known to belong to cloud
  providers (like AWS, Google Cloud Platform, Azure, etc.), which means you will most likely run into `RequestBlocked`
  or `IpBlocked` exceptions when deploying your code to any cloud solutions. »
- La librairie recommande des proxies résidentiels rotatifs, sans garantie. Position officielle de YouTube : non
  vérifiée.

**Sources**

- [jdepoix/youtube-transcript-api — README](https://github.com/jdepoix/youtube-transcript-api) — consulté le 2026-10-07

**Conclusion actionnable**

- Traiter `RequestBlocked` / `IpBlocked` comme « pas de transcript » (repli sur titre et description), jamais comme une
  erreur bloquante ; proxy résidentiel seulement si le canal devient indispensable.
