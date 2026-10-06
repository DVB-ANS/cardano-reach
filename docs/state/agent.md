# État — agent (Armand)

## Lancer

- `cd apps/reach-agent && npm run dev` → eve sur `http://127.0.0.1:21949` (`EVE_URL`).
- Sans `OPENAI_API_KEY`, `agent/agent.ts` utilise `chatgpt()` (abonnement ChatGPT via `codex login`) : local uniquement.
- Simulateur : `node scripts/research.ts --text "<task>" [--answer "1"]... [--out f.md]`.

## Checkpoints prouvés

- M0 : `research.ts --text "Je cherche un usineur titane" --answer 1` → 1 question, `Brief` valide, rapport `# 🎯 Reach — …`.

## Notes contrat

- `MessageResult.status === "waiting"` aussi en fin de tour (`session.waiting`) : tester `inputRequests`, pas le statut.
- `packages/contract/package.json` ne contient que `"type": "module"` (sinon TS `nodenext` le traite en CommonJS).

## Blocages

- Pas d'`OPENAI_API_KEY` sur le poste : dev en `chatgpt()`.
