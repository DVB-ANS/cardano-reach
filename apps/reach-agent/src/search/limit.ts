export type Limiter = <T>(task: () => Promise<T>) => Promise<T>;

/** Sémaphore : au plus `max` tâches en cours ; une place libérée passe directement au suivant. */
export function createLimiter(max: number): Limiter {
  let active = 0;
  const waiting: Array<() => void> = [];
  return async (task) => {
    if (active >= max) {
      const turn = Promise.withResolvers<void>();
      waiting.push(turn.resolve);
      await turn.promise;
    } else active++;
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}

/**
 * Lance `worker` sur chaque élément et rend les résultats arrivés avant que `deadline` ne s'arrête.
 * Un élément non terminé à l'échéance vaut `undefined`. `worker` ne doit pas rejeter.
 */
export async function collectBefore<TItem, TResult>(
  items: readonly TItem[],
  deadline: AbortSignal,
  worker: (item: TItem) => Promise<TResult>,
): Promise<Array<TResult | undefined>> {
  const results: Array<TResult | undefined> = items.map(() => undefined);
  const all = Promise.all(
    items.map(async (item, index) => {
      results[index] = await worker(item);
    }),
  );
  // Le délai d'échéance finit toujours par se déclencher : l'écouteur ne fuit pas.
  const expired = Promise.withResolvers<void>();
  if (deadline.aborted) expired.resolve();
  else deadline.addEventListener("abort", () => expired.resolve(), { once: true });
  await Promise.race([all, expired.promise]);
  return [...results];
}
