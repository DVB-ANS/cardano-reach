import { defineTool } from "eve/tools";
import { z } from "zod";
import { assertSearchAllowed } from "../../src/phase.ts";
import { searchBatch } from "../../src/search/engine.ts";
import { CHANNELS } from "../../src/search/types.ts";

const SEARCH_DEADLINE_MS = 25_000;

export default defineTool({
  description:
    "Lance TOUTES tes recherches d'un coup (6 à 12 requêtes, plusieurs canaux), exécutées en parallèle en 25 s maximum. " +
    "Canaux : web (pages d'entreprises, annuaires, actus), linkedin (pages entreprise publiques), " +
    "github (mots-clés courts, 1 à 3 mots), youtube, twitter, reddit. " +
    "Les résultats sans date ne sont pas des signaux récents. Les échecs de canal sont listés dans `failures`.",
  inputSchema: z.object({
    queries: z
      .array(
        z.object({
          channel: z.enum(CHANNELS),
          query: z.string().min(3).max(200),
          freshnessDays: z.number().int().min(1).max(3650).optional(),
        }),
      )
      .min(1)
      .max(12),
  }),
  label: {
    start: ({ queries }) => `Recherche sur ${new Set(queries.map((query) => query.channel)).size} canaux (${queries.length} requêtes)`,
  },
  async execute({ queries }, ctx) {
    assertSearchAllowed(ctx.messages);
    return searchBatch(queries, { deadlineMs: SEARCH_DEADLINE_MS, signal: ctx.abortSignal });
  },
});
