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
| web | actif, **quota gratuit épuisé** | Exa via `mcporter` (`~/.mcporter`), ~5 s, ~50 % datés. MCP gratuit → HTTP 429 après quelques golden ; avec `EXA_API_KEY`, serveur `exa-key` (header Bearer) |
| linkedin | idem web | Exa + `site:linkedin.com/company`, ~6 s, peu de dates |
| github | actif | `gh search repos` : mots-clés courts uniquement (requête longue → 0 résultat) |
| youtube | **désactivé de fait** | `www.youtube.com` refusé en local (connexion refusée) ; parseur testé, à vérifier sur le VPS |
| twitter, reddit | non implémentés | pas de comptes dédiés ; `reach_search` renvoie `channel not implemented` |

Exa n'expose pas `web_search_advanced_exa` (pas de filtre de date côté Exa) : `freshnessDays` est filtré après coup.
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
- **`EXA_API_KEY` nécessaire** (dashboard.exa.ai) : sans elle, le canal web tombe en 429 en démo.
- Pas de Docker local : l'image n'a pas été construite (à faire sur le VPS).
