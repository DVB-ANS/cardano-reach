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
| web | actif | Exa via `mcporter` (config `~/.mcporter`), ~5 s, ~50 % de hits datés |
| linkedin | actif | Exa + `site:linkedin.com/company`, ~6 s, peu de dates |
| github | actif | `gh search repos` : mots-clés courts uniquement (requête longue → 0 résultat) |
| youtube | **désactivé de fait** | `www.youtube.com` refusé en local (connexion refusée) ; parseur testé, à vérifier sur le VPS |
| twitter, reddit | non implémentés | pas de comptes dédiés ; `reach_search` renvoie `channel not implemented` |

Exa n'expose pas `web_search_advanced_exa` (pas de filtre de date côté Exa) : `freshnessDays` est filtré après coup.

## Checkpoints prouvés

- M0 : `research.ts --text "Je cherche un usineur titane" --answer 1` → 1 question, `Brief` valide, rapport `# 🎯 Reach — …`.
- Cas 1 (luna) : 0 question, intake 6 s, recherche 57 s, 4 lignes sourcées (liens vérifiés par l'agent via `read_pages`).
- `eve build` OK ; `eve start` : 401 sans / avec mauvais identifiants Basic, 200 avec les bons.
- Golden avec `gpt-6-luna` (`chatgpt()`), dernier passage par cas : 8/9 verts. `6-crypto-leads` rend 4 lignes sourcées
  sur 5 attendues (l'agent refuse honnêtement d'en inventer) ; à rejouer avec `gpt-6.1-sol` pour M5.
  Intake parfois trop prudent avec luna (question inutile) : rattrapé par la relance unique « bloc JSON Brief ».

## Notes contrat

- `MessageResult.status === "waiting"` aussi en fin de tour (`session.waiting`) : tester `inputRequests`, pas le statut.
- `packages/contract/package.json` ne contient que `"type": "module"` (sinon TS `nodenext` le traite en CommonJS).

## Blocages

- Pas d'`OPENAI_API_KEY` sur le poste : dev en `chatgpt()`.
- Pas de Docker local : l'image n'a pas été construite (à faire sur le VPS).
