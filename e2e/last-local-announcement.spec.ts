import { test, expect } from './game';

// The conductor's "This is the Last Local… Stand clear of the closing doors" plays once per
// intro. Pausing, or hiding the tab (which freezes the audio clock), mustn't queue it again:
// repeats piled up while paused and, with the tab hidden, all played at once on return.

test.describe('the Last Local announcement', () => {
  test('plays once per intro, and a pause or a hidden tab never queues it again', async ({ game }) => {
    test.setTimeout(120_000);
    const r = await game(`G.startIntro(); await sleep(300);
      const L = A.getLastLocalAnnouncement();
      const once = L.activeNodes.length;
      // A pause, as the pause menu does it, for longer than the old repeat (about 12 s)...
      G.pause(); A.enterPause(); await sleep(13000);
      const paused = L.activeNodes.length;
      G.resume(); A.exitPause();
      // ...and a hidden tab, which also suspends the audio clock.
      G.pause(); A.suspend(); await sleep(13000);
      const hidden = L.activeNodes.length;
      G.resume(); A.wake(); A.exitPause();
      return { once, paused, hidden, playing: L.isPlaying };`);
    expect(r.once).toBeGreaterThan(0);
    expect(r.paused).toBe(r.once);
    expect(r.hidden).toBe(r.once);
    expect(r.playing).toBe(true);
  });

  test('stops when the ride starts, and a restart plays it again from the top', async ({ game }) => {
    const r = await game(`G.startIntro(); await sleep(300);
      const L = A.getLastLocalAnnouncement();
      const first = L.activeNodes.length;
      advance(12); // the doors close and the ride starts
      const afterIntro = { phase: G.phase, playing: L.isPlaying, nodes: L.activeNodes.length };
      G.newGame(); G.startIntro(); await sleep(300);
      return { first, afterIntro, again: L.activeNodes.length, playing: L.isPlaying };`);
    expect(r.afterIntro).toEqual({ phase: 'ride', playing: false, nodes: 0 });
    expect(r.again).toBe(r.first);
    expect(r.playing).toBe(true);
  });
});
