# État — agent (Armand)

## Lancer

- `cd apps/reach-agent && npm run dev` → eve sur `http://127.0.0.1:21949` (`EVE_URL`).
- Sans `OPENAI_API_KEY`, `agent/agent.ts` utilise `chatgpt()` (abonnement ChatGPT via `codex login`) : local uniquement.
- Simulateur : `node scripts/research.ts --text "<task>" [--answer "1"]... [--out f.md]`.
- Bench : `node scripts/bench-search.ts "<requête>"` ; golden : `npm run golden [-- --only <id>]` ; tests : `npm test`.
- Prod : `docker build -f apps/reach-agent/Dockerfile -t reach-agent .` (contexte = racine), port 3000,
  `ROUTE_AUTH_BASIC_USER` / `ROUTE_AUTH_BASIC_PASSWORD` obligatoires, `GH_TOKEN` pour le canal github.

## Canaux (poste d'Armand)

| Canal | État | Note |
| --- | --- | --- |
| web | **attend `EXA_API_KEY`** | API Exa `/search` (HTTP direct, skill officiel `build-with-exa`) : query + `type: auto` + highlights, `objective` B2B. Chemin vérifié jusqu'à l'API (401 avec une clé factice) |
| linkedin | **attend `EXA_API_KEY`** | même appel avec `includeDomains: ["linkedin.com/company"]` |
| github | actif | `gh search repos` : mots-clés courts uniquement (requête longue → 0 résultat) |
| youtube | **désactivé de fait** | `www.youtube.com` refusé en local (connexion refusée) ; parseur testé, à vérifier sur le VPS |
| twitter | **attend un compte X dédié** | `twitter search -n 10 --json -- "<q> since:YYYY-MM-DD"` (twitter-cli) ; `TWITTER_AUTH_TOKEN` + `TWITTER_CT0` |
| reddit | **attend un compte Reddit dédié** | `rdt search --limit 10 --compact --json -- "<q>"` (rdt-cli épinglé) ; `~/.config/rdt-cli/credential.json` |

Sans `REACH_CHANNELS`, twitter et reddit s'activent seuls dès que leurs identifiants existent. Les deux CLI refusent
de tourner sans identifiants explicites : sinon elles liraient les cookies du navigateur. Leurs fixtures sont
reconstituées depuis le code source des CLI (aucune sortie réelle capturée, pas de compte).
Lecture de pages : un appel Exa `/contents` (6 000 caractères/page, `statuses` vérifiés), GET direct épinglé en secours.
Jina retiré (quota gratuit journalier atteint). `freshnessDays` reste filtré après coup (les dates dures d'Exa
écarteraient les pages non datées).
`web_search` (secours) n'est pas exposé au modèle avec `chatgpt()` : il n'existera qu'avec `openai()` + `OPENAI_API_KEY`.

## Checkpoints prouvés

- M0 : `research.ts --text "Je cherche un usineur titane" --answer 1` → 1 question, `Brief` valide, rapport `# 🎯 Reach — …`.
- Cas 1 (luna) : 0 question, intake 6 s, recherche 57 s, 4 lignes sourcées (liens vérifiés par l'agent via `read_pages`).
- `eve build` OK ; `eve start` : 401 sans / avec mauvais identifiants Basic, 200 avec les bons.
- Golden `gpt-6-luna`, après audit (garde de phase, relance Brief) : tous les cas passent l'intake. Premier passage
  avant épuisement d'Exa : 7/9 (`4` : rapport rédigé en intake → corrigé par la garde codée ; `6` : 2 lignes).
  Dernier passage : 4/9, dégradé par les HTTP 429 d'Exa (0 ligne sur 6 et 7), pas par le code.
- Garde SSRF vérifiée en direct : `localhost`, IPv4 mappées / NAT64, métadonnées cloud bloqués ; redirection
  http→https suivie avec connexion épinglée.

## Notes contrat

- `MessageResult.status === "waiting"` aussi en fin de tour (`session.waiting`) : tester `inputRequests`, pas le statut.
- `packages/contract/package.json` ne contient que `"type": "module"` (sinon TS `nodenext` le traite en CommonJS).

## Blocages

- Pas d'`OPENAI_API_KEY` sur le poste : dev en `chatgpt()` (sans `web_search`).
- **`EXA_API_KEY` à mettre dans `apps/reach-agent/.env.local`** (fichier créé, vide, ignoré par Git) : sans elle,
  ni web, ni LinkedIn, ni lecture de pages via Exa.
- Comptes X et Reddit dédiés au projet : à créer pour activer ces canaux.
- Pas de Docker local : l'image n'a pas été construite (à faire sur le VPS).
