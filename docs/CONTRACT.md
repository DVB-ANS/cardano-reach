# Contrat worker ↔ agent

Gelé. Toute modification de ce fichier ou de `packages/contract/**` passe par une PR qui ne contient que ces fichiers,
relue par l'autre développeur avant le merge. Implémentation : `packages/contract/src/index.ts`.

Le worker ne parle à l'agent **que** via `eve/client` (`Client`, `sessions.create`, `send`, `respond`, `result`).
Une Task correspond à une session eve, qui sert pour l'intake puis pour la recherche.

## Messages

Envoyés par le worker, préfixe littéral sur la première ligne (`phaseMessage(phase, body)`).

1. `PHASE: INTAKE` + ligne vide + texte de la Task. Les commentaires humains déjà présents sont ajoutés en dessous,
   sous la forme `Commentaire: <texte>`.
2. `PHASE: RESEARCH` + ligne vide + bloc ```` ```json ```` contenant le `Brief`.
3. `PHASE: FOLLOWUP` + ligne vide + commentaire humain reçu après la complétion.

## Résultats

- **INTAKE**, deux issues :
  - `result.status === "waiting"` avec un `inputRequests[i].kind === "question"`, produit par l'outil eve `ask_question` ;
  - un message dont **le dernier bloc** ```` ```json ```` est un `Brief` valide (`extractBrief`).
- **RESEARCH** : `result.message` est le rapport Markdown. Il commence par `# ` et fait au plus
  `MAX_REPORT_BYTES` (900 000) octets UTF-8.
- **FOLLOWUP** : `result.message` est une réponse Markdown courte.
- Attention : `status === "waiting"` est aussi renvoyé quand le tour est terminé et que la session attend le message
  suivant (`session.waiting`). Seule la présence d'une `inputRequests[i]` distingue une question d'une réponse finale.

## Brief

```ts
interface Brief {
  mode: "sourcing" | "leads";
  niche: "crypto-defi" | "automobile" | "aero-spatial" | "saas-tech-b2b" | "other";
  need: string;            // non vide, 2000 caractères max
  zone: string | null;
  volume: string | null;
  constraints: string[];
  language: "fr" | "en";
  assumptions: string[];
}
```

`parseBrief` lève `Error("Invalid brief: <champ>")` ; `extractBrief` lève `Error("No brief block")` sans bloc JSON.
