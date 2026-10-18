# Court Sq-Bound

A first-person liminal horror ride on the NYC G train, from Hoyt–Schermerhorn to Court Square, 13 stops, with your parents. Notice what changes in the car, hide that you noticed, and learn which doors are safe.

Built with React, TypeScript, Three.js, and Vite. The game logic follows the Court Sq-Bound master design document, build v5.1.

## Run it

Requires Node 20.19+ or 22.12+ (Vite 8), or Bun.

```bash
bun install        # or: npm install
bun run dev        # or: npm run dev   → http://localhost:3000
```

Other scripts:

| Script | What it does |
|---|---|
| `build` | Production build into `dist/` |
| `build:offline` | The offline copy: `dist-offline/Court-Sq-Bound/index.html` (one file that opens from a double-click) and `dist-offline/Court-Sq-Bound-offline.zip` |
| `preview` | Serve the production build |
| `lint` | Type-check with `tsc --noEmit` |
| `test` | Browser tests (Playwright); `test:ui` opens them interactively |

No environment variables are required.

### Tests

The browser tests in `e2e/` play the game in headless Chromium and check each system: flags and restart, pause music, heartbeat, haptics, intercom, screen glitch, breathing, the tape recorder, chapters and endings, and the Psychological Log. They build a test-mode copy of the game into `dist-test/` (the only build that exposes the engine to the tests) and serve it on port 4190.

Playwright lives in `e2e/` with its own `package.json` and `bun.lock`, so install it there too:

```bash
cd e2e && bun install && npx playwright install chromium && cd ..   # once
bun run test                                                        # or: npm test
```

GitHub Actions runs the type-check, the build, and the full browser suite on every pull request and push to `main`. If a test fails, its Playwright trace is attached to the run.

### Google AI Studio and bun.lock

Google AI Studio puts back its original starter `bun.lock` every time it syncs to GitHub. So the root `package.json` keeps the starter's packages (`@google/genai`, `express`, `dotenv`, `motion`, `@types/express`, `autoprefixer`, `esbuild`, `tsx`) even though the game doesn't import them; they never reach the built game. Don't remove them, or the next sync breaks CI again. If a sync ever brings a different lock, CI's "Check bun.lock matches package.json" step fails and says what changed.

## Deploy to Cloud Run

The `Dockerfile` builds the game and serves it with nginx on port 8080. From Google Cloud Shell:

```bash
git clone https://github.com/PerfecHateyOu/Court-Sq-Bound-NYC-Subway-Liminal-Horror && cd Court-Sq-Bound-NYC-Subway-Liminal-Horror
gcloud run deploy court-sq-bound --source . --region us-central1 --allow-unauthenticated
```

To ship an update later, `git pull` in that folder and run the same `gcloud run deploy` line. No environment variables or API keys are needed; nothing from `.env` goes into the image.

## Offline copy

`bun run build:offline` (or `npm run build:offline`) builds the whole game into one `index.html` that opens from a double-click, with no internet, server or install. Scripts, styles and fonts are all inlined; the fonts come from `offline/fonts.css`, so the build doesn't need the internet either. The folder is zipped with a short `README.txt` from `offline/README.txt`.

It's built from the same code as the web version, so every change applies to both. CI rebuilds it on every pull request and push, tests it with the network blocked (`e2e/offline.spec.ts`), and attaches it to the run: open the run on GitHub's **Actions** tab and download **Court-Sq-Bound-offline** under *Artifacts*.

## How to play

1. **Notice.** When something in the car changes, look at it and hold Flag. Flags are private.
2. **Don't show it.** Staring at something wrong, or whipping your head around, while a parent is looking at you raises their suspicion. When they talk to you, answer like nothing is wrong.
3. **Read the doors.** At every stop you can stay on or step off. Stepping off is usually a trap.

After the Safe Haven, Dad gives you his old tape recorder. Tune it and you'll pick up voices, and some carriers that are only tones. What it hears has nothing to do with what's wrong in the car, and holding it up where your parents can see is a reaction too. Tapes you record can be played back from the Evidence Log or the report. During the ride, though, your parents can hear them too.

On Android phones, the train arrives at each stop with a soft vibration for every anomaly you caught on the way in ("Vibrate for catches" in Settings). iPhones don't support web vibration.

The ride is told in three chapters, announced by a rollsign as each one begins. At Court Square you choose your way out. How the ride ends depends on how you rode it (your composure, your sanity, what you caught, how you got through the restraint, and what's on your tapes), and the report keeps a case file of the endings you've reached. One ending puts you back where you started; its report offers **Get back on** instead of Ride Again.

A run takes about 10 minutes and ends with a travel report scoring sanity retained, mask integrity, and anomaly accuracy, plus a Psychological Log: a case file of the 13 anomaly types that fills in across rides.

**Nightmare mode** unlocks after your first finished ride (any ending): tick it on the start screen. Same ride, harder: a faster train and shorter gaps between stations, single ceiling tubes that flicker mid-ride (never the whole car, never on the approach, and not with Reduced screen effects), parents who look your way more often and for longer, and faster sanity loss within each stop's limits. The report marks Nightmare rides. Tuning lives in `NIGHTMARE` in `src/constants.ts`.

**Chapter select** unlocks at the same time: pick **Start from** on the start screen. Chapter I is the full ride from Hoyt–Schermerhorn. Chapter II (from Bedford–Nostrand Avs, into the Stop 6 Safe Haven) and Chapter III (from Nassau Av: the restraint, then the trestle, with Dad's recorder already in hand) are **practice runs**: they play exactly like the real ride, but nothing is saved. No endings, badges, Case Files entries, tapes, prints or ride history, and they don't count toward unlocks; the report and the pause menu say so. Ride Again keeps the chapter (and Nightmare) until you choose again. Where each chapter starts is `CHAPTER_START_SEGMENT` in `src/game/practice.ts`.

**Full screen:** boarding the train goes full screen (where the browser allows it; turn it off in Settings). Leave with Esc or the pause menu, which pauses the ride. On wide screens there's also a full-screen button in the top bar. iPhones don't let web pages go full screen: tap Share, then **Add to Home Screen**, and the game opens full screen from there.

**Settings** (from the start screen or the pause menu): look speed, invert vertical look, game and pause-music volume, screen effects (match your device's reduced-motion setting, always on, or reduced), full screen when boarding, vibration, and erasing saved progress. Settings are saved on the device.

### Controls

| Action | Desktop | Touch |
|---|---|---|
| Look | Mouse (click to capture), or arrow keys | Drag |
| Walk between cars | WASD | WALK stick (bottom left) |
| Open a gangway door | E or click it | Tap it |
| Polaroid camera | C to raise, click / Space / Enter to shoot | Camera button, then the shutter |
| Tape recorder (after Stop 6) | R to raise; [ ] or wheel to tune; hold Space to record | Recorder button; drag the tuning strip; hold REC |
| Evidence log (Polaroids, tapes) | Tab | Album button |
| Route lines | L (again, or Esc, to close) | Route button |
| Flag | Hold F | Hold the Flag button |
| Answer / choose | 1, 2, 3 or click | Tap |
| Hold during the restraint moment | Hold Space | Hold the Hold button |
| Pause | P or Esc | Pause button |
| Mute | M | Sound button |
| Close a dialog or confirmation | Esc | Close / Cancel button |
| Debug overlay (spoilers) | Backquote | Start-screen checkbox |

## Project layout

| Path | Contents |
|---|---|
| `src/constants.ts` | All tuning values: sanity bands, drift, deltas, the 13-stop segment table, dialogue |
| `src/game/gameState.ts` | Game engine: ride loop, doors, mask checks, suspicion, sanity, the False Stop Trial, restraint, scoring |
| `src/game/anomalyManager.ts` | Anomaly catalog by sanity tier |
| `src/graphics/` | Procedural subway car, characters, textures, and the Trial space |
| `src/audio/audioEngine.ts` | WebAudio bed, chimes, screech, whispers |
| `src/audio/pauseMusic.ts` | Pause-menu music: a generated electric-piano loop that degrades with sanity tier |
| `src/audio/intercom.ts` | Background intercom: garbled announcements whose pitch and pace drop with sanity |
| `src/game/evpManager.ts`, `src/audio/evpAudio.ts`, `src/audio/tapePlayback.ts` | EVP tape recorder: broadcasts and decoy carriers per stretch (shuffled every ride), tuning, tapes kept on the device |
| `src/game/routeText.ts` | Place names per route (first and last stop, streets, the bait stop) for endings, announcements, Trial signs and broadcasts |
| `src/game/endings.ts` | Endings: the priority rules (`resolveEnding`, a pure function) and the endings archive |
| `src/game/psychLog.ts` | Psychological Log: case-file entries for each anomaly type, kept across rides on the device |
| `src/graphics/trestleBuilder.ts` | The Newtown Creek trestle: sky, skyline, rain and steel for the open-air stretch between Greenpoint Av and Court Sq (G route, Critical) |
| `src/graphics/glitchPass.ts` | Brief screen tearing and chromatic aberration, used for Critical anomalies and for decoy glitches at low sanity |
| `src/settings.ts` | Player settings store (saved on the device) |
| `src/components/` | React HUD, start, pause, settings, and report screens |
| `e2e/` | Playwright browser tests; `e2e/game.ts` has the shared setup and helpers |
