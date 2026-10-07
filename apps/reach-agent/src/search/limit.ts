export type Limiter = <T>(task: () => Promise<T>, signal?: AbortSignal) => Promise<T>;

/**
 * Sémaphore : au plus `max` tâches en cours ; une place libérée passe directement au suivant.
 * Une attente dont le `signal` est annulé sort de la file et rejette ; `task` n'est jamais lancée après annulation.
 */
export function createLimiter(max: number): Limiter {
  let active = 0;
  const waiting: Array<() => void> = [];
  return async (task, signal) => {
    signal?.throwIfAborted();
    if (active >= max) {
      const turn = Promise.withResolvers<void>();
      const onAbort = () => {
        const index = waiting.indexOf(turn.resolve);
        if (index >= 0) waiting.splice(index, 1);
        turn.reject(signal?.reason);
      };
      waiting.push(turn.resolve);
      signal?.addEventListener("abort", onAbort, { once: true });
      try {
        await turn.promise;
      } finally {
        signal?.removeEventListener("abort", onAbort);
      }
    } else active++;
    try {
      signal?.throwIfAborted();
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}

/**
 * Porte de débit : chaque tâche démarre au moins `minIntervalMs` après le **départ réel** de la précédente (chaîne de
 * tours), même si un départ a pris du retard. Une attente annulée rejette sans lancer `task` et rend son tour sans délai.
 */
export function createRateGate(minIntervalMs: number): Limiter {
  let previous: Promise<void> = Promise.resolve();
  return async (task, signal) => {
    signal?.throwIfAborted();
    const waitFor = previous;
    const turn = Promise.withResolvers<void>();
    previous = turn.promise;
    if (signal) {
      const aborted = Promise.withResolvers<never>();
      const onAbort = () => aborted.reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
      try {
        await Promise.race([waitFor, aborted.promise]);
      } catch (error) {
        void waitFor.then(turn.resolve);
        throw error;
      } finally {
        signal.removeEventListener("abort", onAbort);
      }
    } else await waitFor;
    setTimeout(turn.resolve, minIntervalMs);
    return task();
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
