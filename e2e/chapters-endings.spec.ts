import { test, expect } from './game';

test.describe('Operation Skyward Phase 3: Chapters & Multiple Escape Endings', () => {
  test('Chapter progression triggers rollsigns for Chapters 1, 2, and 3', async ({ page, game }) => {
    // Stop 2 (Chapter 1)
    await game(`
      G.Q = [];
      G.startSegment(0); // Stop 2
      advance(1.0);
    `);
    const ch1 = await page.locator('[data-testid="chapter-rollsign"]');
    await expect(ch1).toBeVisible();
    await expect(ch1).toContainText('CHAPTER I');
    await expect(ch1).toContainText('THE DESCENT');

    // Advance past Stop 5 into Stop 6 (Chapter 2 transition)
    await game(`
      G.Q = [];
      G.startSegment(4); // Stop 6 (Safe Haven)
      advance(1.0);
    `);
    const ch2 = await page.locator('[data-testid="chapter-rollsign"]');
    await expect(ch2).toBeVisible();
    await expect(ch2).toContainText('CHAPTER II');
    await expect(ch2).toContainText('SIGNAL DRIFT');

    // Advance into Stop 11 (Chapter 3 transition: Operation Skyward)
    await game(`
      G.Q = [];
      G.startSegment(10); // Stop 11 (Greenpoint Av / Restraint)
      advance(1.0);
    `);
    const ch3 = await page.locator('[data-testid="chapter-rollsign"]');
    await expect(ch3).toBeVisible();
    await expect(ch3).toContainText('CHAPTER III');
    await expect(ch3).toContainText('OPERATION SKYWARD');
  });

  test('Stop 12 presents 3-way branching choices at the 21 St Trestle', async ({ page, game }) => {
    await game(`
      G.Q = [];
      G.startSegment(11); // Stop 12
      G.san = 5;
      advance(0.1);
      while (G.phase === 'ride') { advance(0.2, 0.05); }
      // Wait for arrival chime and doors to open
      advance(2.5, 0.05);
    `);

    // Verify 3 distinct options rendered in choice bar
    const choiceButtons = page.locator('button:has-text("Hold your ground"), button:has-text("Inspect Trestle Catwalk"), button:has-text("Tune Dispatch Frequency")');
    await expect(choiceButtons).toHaveCount(3);

    // Pick "Inspect Trestle Catwalk"
    await page.locator('button:has-text("Inspect Trestle Catwalk")').click();

    // Verify branch flag and suspicion reaction
    const state = await game(`return { branch: G.branchStop12, sus: G.sus, phase: G.phase };`);
    expect(state.branch).toBe('catwalk');
    expect(state.sus).toBeGreaterThanOrEqual(10);
  });

  test('Stop 13 presents final exit choices at Court Sq Terminus', async ({ page, game }) => {
    await game(`
      G.Q = [];
      G.startSegment(12); // Stop 13 (Court Sq)
      G.san = 5;
      advance(0.1);
      while (G.phase === 'ride') { advance(0.2, 0.05); }
      // Arrive and wait for doors and final choice
      advance(5.2, 0.05);
    `);

    const escalatorsBtn = page.locator('button:has-text("Follow Parents to Escalators")');
    const lowerLevelBtn = page.locator('button:has-text("Follow EVP Static to Abandoned Lower Level")');
    const surfaceHatchBtn = page.locator('button:has-text("Slip out Emergency Surface Hatch")');

    await expect(escalatorsBtn).toBeVisible();
    await expect(lowerLevelBtn).toBeVisible();
    await expect(surfaceHatchBtn).toBeVisible();
  });

  test('Priority 1: Zero Suspicion unlocks Secret Unbroken Mask ending', async ({ page, game }) => {
    await game(`
      G.peak = 0;
      G.sus = 0;
      G.interventions = 0;
      G.trials = [];
      G.endGame();
    `);

    const report = page.locator('article.ticket-slip');
    await expect(report).toBeVisible();
    await expect(report).toContainText('[SECRET: THE UNBROKEN MASK]');
    await expect(report).toContainText('You can stop pretending now');

    // Verify saved to endings archive
    const archive = await page.evaluate(() => JSON.parse(localStorage.getItem('courtSq_endingsArchive') || '{}'));
    expect(archive.secret_mask).toBeDefined();
    expect(archive.secret_mask.count).toBeGreaterThanOrEqual(1);
  });

  test('Priority 2: Recorded EVP tapes and Lower Level unlock Signal Archivist ending', async ({ page, game }) => {
    await game(`
      G.peak = 25; // Break zero suspicion
      G.interventions = 0;
      G.trials = [];
      G.branchStop12 = 'dispatch';
      G.finalExitChoice = 'lower_level';
      window.__EVP.tapes = [
        { signalId: '1', title: 'T1', stop: '6', freq: '80', transcript: '...', gt: 1 },
        { signalId: '2', title: 'T2', stop: '7', freq: '90', transcript: '...', gt: 2 },
        { signalId: '3', title: 'T3', stop: '8', freq: '100', transcript: '...', gt: 3 },
      ];
      G.endGame();
    `);

    const report = page.locator('article.ticket-slip');
    await expect(report).toBeVisible();
    await expect(report).toContainText('[BRANCH: SIGNAL ARCHIVIST]');
    await expect(report).toContainText('abandoned lower level');

    const archive = await page.evaluate(() => JSON.parse(localStorage.getItem('courtSq_endingsArchive') || '{}'));
    expect(archive.signal_archivist).toBeDefined();
  });

  test('Priority 3: Catwalk or surface hatch unlocks Skyward Void ending', async ({ page, game }) => {
    await game(`
      G.peak = 30;
      G.interventions = 0;
      G.trials = [];
      G.branchStop12 = 'catwalk';
      G.finalExitChoice = 'surface_hatch';
      window.__EVP.tapes = [];
      G.endGame();
    `);

    const report = page.locator('article.ticket-slip');
    await expect(report).toBeVisible();
    await expect(report).toContainText('[BRANCH: SKYWARD VOID]');
    await expect(report).toContainText('elevated steel trestle above Long Island City');

    const archive = await page.evaluate(() => JSON.parse(localStorage.getItem('courtSq_endingsArchive') || '{}'));
    expect(archive.skyward_void).toBeDefined();
  });

  test('Priority 4: Interventions take priority over standard and collapse', async ({ page, game }) => {
    await game(`
      G.peak = 65;
      G.interventions = 1;
      G.trials = [{ stop: 4, depth: 1, clean: true }];
      G.branchStop12 = 'catwalk';
      G.finalExitChoice = 'surface_hatch';
      G.endGame();
    `);

    const report = page.locator('article.ticket-slip');
    await expect(report).toBeVisible();
    await expect(report).toContainText('[TERMINAL: EXPOSED]');
    await expect(report).toContainText('Dad keeps a firm, unyielding grip');
  });

  test('Priority 5: False Stop Trials lead to Disoriented Collapse', async ({ page, game }) => {
    await game(`
      G.peak = 40;
      G.interventions = 0;
      G.trials = [{ stop: 4, depth: 2, clean: false }];
      G.branchStop12 = 'stay';
      G.finalExitChoice = 'escalators';
      G.endGame();
    `);

    const report = page.locator('article.ticket-slip');
    await expect(report).toBeVisible();
    await expect(report).toContainText('[COLLAPSE: DISORIENTED]');
    await expect(report).toContainText('45th Road');
  });

  test('Priority 6: Default civilian exit', async ({ page, game }) => {
    await game(`
      G.peak = 20;
      G.interventions = 0;
      G.trials = [];
      G.branchStop12 = 'stay';
      G.finalExitChoice = 'escalators';
      G.endGame();
    `);

    const report = page.locator('article.ticket-slip');
    await expect(report).toBeVisible();
    await expect(report).toContainText('[STANDARD: EXTRACTION]');
    await expect(report).toContainText('arguing about where to eat');
  });

  test('Endings archive tracks discovered endings in Case File on Report Screen', async ({ page, game }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'courtSq_endingsArchive',
        JSON.stringify({
          secret_mask: { id: 'secret_mask', discoveredAt: Date.now(), count: 1 },
          civilian_extraction: { id: 'civilian_extraction', discoveredAt: Date.now(), count: 2 },
        })
      );
    });

    await game(`
      G.peak = 20;
      G.endGame();
    `);

    const report = page.locator('article.ticket-slip');
    await expect(report).toBeVisible();

    // Verify Case File: Documented Endings section
    const endingsHeader = page.locator('#endings-archive-h');
    await expect(endingsHeader).toBeVisible();
    await expect(endingsHeader).toContainText('Case File: Documented Endings');

    // Unlocked and locked endings rendering
    await expect(page.locator('text=The Unbroken Mask')).toBeVisible();
    await expect(page.locator('text=Civilian Extraction')).toBeVisible();
    await expect(page.locator('text=Undocumented Outcome')).toHaveCount(4);
  });
});
