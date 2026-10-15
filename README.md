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
| `preview` | Serve the production build |
| `lint` | Type-check with `tsc --noEmit` |
| `test` | Browser tests (Playwright); `test:ui` opens them interactively |

No environment variables are required.

### Tests

The browser tests in `e2e/` play the game in headless Chromium and check each system: flags and restart, pause music, heartbeat, haptics, intercom, screen glitch, breathing, and the Psychological Log. They build a test-mode copy of the game into `dist-test/` (the only build that exposes the engine to the tests) and serve it on port 4190.

```bash
npx playwright install chromium   # once
bun run test                      # or: npm test
```

GitHub Actions runs the type-check, the build, and the full browser suite on every pull request and push to `main`. If a test fails, its Playwright trace is attached to the run.

## How to play

1. **Notice.** When something in the car changes, look at it and hold Flag. Flags are private.
2. **Don't show it.** Staring at something wrong, or whipping your head around, while a parent is looking at you raises their suspicion. When they talk to you, answer like nothing is wrong.
3. **Read the doors.** At every stop you can stay on or step off. Stepping off is usually a trap.

On Android phones, the train arrives at each stop with a soft vibration for every anomaly you caught on the way in ("Vibrate for catches" in Settings). iPhones don't support web vibration.

A run takes about 10 minutes and ends with a travel report scoring sanity retained, mask integrity, and anomaly accuracy, plus a Psychological Log: a case file of the 13 anomaly types that fills in across rides.

**Settings** (from the start screen or the pause menu): look speed, invert vertical look, game and pause-music volume, screen effects (match your device's reduced-motion setting, always on, or reduced), vibration, and erasing saved progress. Settings are saved on the device.

### Controls

| Action | Desktop | Touch |
|---|---|---|
| Look | Mouse (click to capture), or arrow keys / WASD | Drag |
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
| `src/game/psychLog.ts` | Psychological Log: case-file entries for each anomaly type, kept across rides on the device |
| `src/graphics/glitchPass.ts` | Brief screen tearing and chromatic aberration, used for Critical anomalies and for decoy glitches at low sanity |
| `src/settings.ts` | Player settings store (saved on the device) |
| `src/components/` | React HUD, start, pause, settings, and report screens |
| `e2e/` | Playwright browser tests; `e2e/game.ts` has the shared setup and helpers |
