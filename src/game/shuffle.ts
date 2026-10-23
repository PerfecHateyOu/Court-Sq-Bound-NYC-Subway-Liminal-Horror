/**
 * A shuffled copy of `items` (Fisher–Yates), every order equally likely. Use this instead of
 * `sort(() => Math.random() - 0.5)`, which is biased: depending on the engine's sort, some
 * orders come up far more often (e.g. the calm answer landing in the same slot).
 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
