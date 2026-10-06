import { defineAgent } from "eve";
import { chatgpt, openai } from "eve/models/openai";

const DEFAULT_MODEL = "gpt-6-luna";
const modelId = process.env.REACH_MODEL ?? DEFAULT_MODEL;

// Sans OPENAI_API_KEY (poste local uniquement), on passe par l'abonnement ChatGPT connecté via Codex.
// En déploiement la clé est obligatoire : chatgpt() refuse de tourner hors `eve dev`.
const model = process.env.OPENAI_API_KEY ? openai(modelId) : chatgpt(modelId);

export default defineAgent({
  model,
  reasoning: "medium",
  defaultTools: false,
  limits: {
    maxInputTokensPerSession: 3_000_000,
    maxOutputTokensPerSession: 200_000,
  },
});
