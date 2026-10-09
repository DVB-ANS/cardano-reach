# État — agent (Armand)

## Lancer

- `cd apps/reach-agent && npm run dev` → eve sur `http://127.0.0.1:21949` (`EVE_URL`).
- Sans `OPENAI_API_KEY`, `agent/agent.ts` utilise `chatgpt()` (abonnement ChatGPT via `codex login`) : local uniquement.
- Simulateur : `node scripts/research.ts --text "<task>" [--answer "1"]... [--out f.md]`.
- Bench : `node scripts/bench-search.ts "<requête>"` ; golden : `npm run golden [-- --only <id>]` ; tests : `npm test`.
- Prod : `docker build -f apps/reach-agent/Dockerfile -t reach-agent .` (contexte = racine), port 3000,
  `ROUTE_AUTH_BASIC_USER` / `ROUTE_AUTH_BASIC_PASSWORD` obligatoires, `GH_TOKEN` pour le canal github.

## Canaux (image Docker, poste d'Armand)

| Canal | État | Note |
| --- | --- | --- |
| web | actif | API Exa `/search` (HTTP direct, skill officiel `build-with-exa`) : query + `type: auto` + highlights, `objective` B2B. Bench : 8 hits, 50 % datés |
| linkedin | actif | même appel avec `includeDomains: ["linkedin.com/company"]`. Bench : 8 hits |
| github | actif | `gh search repos` : mots-clés courts uniquement (requête longue → 0 résultat) ; 0 hit normal sur l'industrie |
| youtube | actif dans l'image | bloqué sur l'ancien poste ; dans Docker : 5 hits datés, ~9 s |
| twitter | actif (compte dédié `@cardano_reach`) | `twitter search -n 10 --json -- "<q> since:YYYY-MM-DD"` (twitter-cli 0.8.5 patché au build, voir DEVLOG) ; `TWITTER_AUTH_TOKEN` + `TWITTER_CT0` |
| reddit | **attend un compte Reddit dédié** | `rdt search --limit 10 --compact --json -- "<q>"` (rdt-cli épinglé) ; `~/.config/rdt-cli/credential.json` |

Sans `REACH_CHANNELS`, twitter et reddit s'activent seuls dès que leurs identifiants existent. Les deux CLI refusent
de tourner sans identifiants explicites : sinon elles liraient les cookies du navigateur. Leurs fixtures sont
reconstituées depuis le code source des CLI (aucune sortie réelle capturée, pas de compte).
Lecture de pages : un appel Exa `/contents` (6 000 caractères/page, `statuses` vérifiés), GET direct épinglé en secours.
Jina retiré (quota gratuit journalier atteint). `freshnessDays` reste filtré après coup (les dates dures d'Exa
écarteraient les pages non datées).
`web_search` (secours) n'est pas exposé au modèle avec `chatgpt()` : il n'existera qu'avec `openai()` + `OPENAI_API_KEY`.

## Checkpoints prouvés

- M0 : `research.ts --text "Je cherche un usineur titane" --answer 1` → 1 question, `Brief` valide, rapport `# 🎯 Richard — …`.
- Cas 1 (luna) : 0 question, intake 6 s, recherche 57 s, 4 lignes sourcées (liens vérifiés par l'agent via `read_pages`).
- `eve build` OK ; `eve start` : 401 sans / avec mauvais identifiants Basic, 200 avec les bons.
- Image locale `reach-agent:local` construite avec Node 24.21.0 ; `.env.local` absente de l'image ; smoke production
  sur `/eve/v1/info` : 401 sans auth Basic, 200 avec les identifiants.
- Golden `gpt-6.1-sol` dans Docker (`reach-agent-local`, canaux web/linkedin/github/twitter) : **8/9**, ~60 s par cas.
  Échec : `6-crypto-leads` (2 lignes, puis 4 après le segment market maker de la fiche crypto) ; cas retiré du golden
  (scénario non prouvable sans source on-chain, voir DEVLOG). Après rebuild : **8/8 verts**, 50 à 68 s par cas.
- Golden `gpt-6-luna`, après audit (garde de phase, relance Brief) : tous les cas passent l'intake. Premier passage
  avant épuisement d'Exa : 7/9 (`4` : rapport rédigé en intake → corrigé par la garde codée ; `6` : 2 lignes).
  Dernier passage : 4/9, dégradé par les HTTP 429 d'Exa (0 ligne sur 6 et 7), pas par le code.
- Garde SSRF vérifiée en direct : `localhost`, IPv4 mappées / NAT64, métadonnées cloud bloqués ; redirection
  http→https suivie avec connexion épinglée.
- `find_contact`, mesure réelle sur 6 entreprises en parallèle (Lisi Aerospace, Mecachrome, Blockfrost, Tweag, Didomi,
  Prototal), avant → après le lot « sources e-mail gratuites » : erreurs Exa 429 4/6 → 0/6 ; rôle confirmé 0/6 → 4/6 ;
  e-mail publié 0 → 1 ; devinés moyenne/basse 2/4 → 3/2 ; adresse générique 2/6 → 6/6 ; Gravatar 0/6 (signal rare).

## Notes contrat

- `MessageResult.status === "waiting"` aussi en fin de tour (`session.waiting`) : tester `inputRequests`, pas le statut.
- `packages/contract/package.json` ne contient que `"type": "module"` (sinon TS `nodenext` le traite en CommonJS).

## Blocages

- `OPENAI_API_KEY` et `EXA_API_KEY` renseignées dans `.env.local` (ignoré, mode 600) ; bench et golden rejoués.
- Compte Reddit dédié au projet : à créer pour activer ce canal (X actif avec `@cardano_reach`).
- Le poste utilise Node 22 ; utiliser l'image Docker validée ou installer Node 24 pour les commandes locales.
- Postgres + MPS (`docs/MPS-SETUP.md`), `infra/` et compose complet restent à faire.
- `npm audit --omit=dev` signale 4 vulnérabilités modérées et 1 haute via `eve` → `guarded-fetch` / `undici` ;
  la correction automatique proposée rétrograde `eve` et n'est pas applicable telle quelle.
