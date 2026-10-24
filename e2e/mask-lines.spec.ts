import { test, expect } from './game';

// Mask-check lines don't repeat within a ride until their pool runs out (doc §7.4).
// startMaskCheck -> pickMaskLine in src/game/gameState.ts; the sets are MASK_DIALOGUES in src/constants.ts.
test.describe('Mask lines', () => {
  // Runs n mask checks at a fixed sanity/suspicion and returns the parent's line each time.
  const ASK = `const ask = (n, san, sus) => { const out = [];
    for (let i = 0; i < n; i++) { G.choice = null; G.san = san; G.sus = sus; G.subHtml = '';
      G.startMaskCheck(); out.push(G.subHtml.replace(/^.*?<\\/b>\\s*/, '')); }
    G.choice = null; return out; };`;

  for (const [name, san, sus, size] of [
    ['calm set (High)', 100, 20, 8],
    ['calm set, low suspicion (High)', 100, 0, 7],
    ['wrong set (Critical)', 0, 50, 8],
    ['uneasy set, low suspicion (Low)', 30, 0, 7],
    ['uneasy set, suspicion 10+ (Low)', 30, 20, 8],
  ] as const) {
    test(`${name}: every line is used before any repeats, and never back to back`, async ({ game }) => {
      const r = await game(`ride(2); ${ASK}
        const san = ${san}; G.san = san; advance(0.05); const tier = G.tier;
        if (tier === 1) throw new Error('Medium mixes sets; pick another sanity');
        G.maskUsed.clear(); G.maskLast = null;
        const seen = new Set(); const firstPass = []; const lines = ask(60, san, ${sus});
        for (const l of lines) { if (seen.has(l)) break; seen.add(l); firstPass.push(l); }
        let poolSize = new Set(lines).size; let backToBack = 0; let okRounds = true;
        for (let i = 1; i < lines.length; i++) if (lines[i] === lines[i - 1]) backToBack++;
        for (let k = 0; k + poolSize <= lines.length; k += poolSize)
          if (new Set(lines.slice(k, k + poolSize)).size !== poolSize) okRounds = false;
        return { tier, poolSize, first: firstPass.length, backToBack, okRounds };`);
      expect(r.poolSize).toBe(size);
      expect(r.first).toBe(r.poolSize); // no repeat until the pool is exhausted
      expect(r.okRounds).toBe(true); // each full cycle uses every line exactly once
      expect(r.backToBack).toBe(0);
    });
  }

  test('a new ride starts the tracking over', async ({ game }) => {
    const r = await game(`ride(2); G.maskUsed.add('x'); G.maskLast = 'x';
      G.startIntro(); return { used: G.maskUsed.size, last: G.maskLast };`);
    expect(r).toEqual({ used: 0, last: null });
  });
});
