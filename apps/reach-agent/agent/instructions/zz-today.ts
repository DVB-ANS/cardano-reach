// Date du jour pour les badges de fraîcheur. Nom en `zz-` : placé après les fiches stables (cache de prompt).
import { defineDynamic, defineInstructions } from "eve/instructions";

export default defineDynamic({
  events: {
    "turn.started": () => defineInstructions({ content: `Date du jour : ${new Date().toISOString().slice(0, 10)}.` }),
  },
});
