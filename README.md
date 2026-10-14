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

No environment variables are required.

## How to play

1. **Notice.** When something in the car changes, look at it and hold Flag. Flags are private.
2. **Don't show it.** Staring at something wrong, or whipping your head around, while a parent is looking at you raises their suspicion. When they talk to you, answer like nothing is wrong.
3. **Read the doors.** At every stop you can stay on or step off. Stepping off is usually a trap.

A run takes about 10 minutes and ends with a travel report scoring sanity retained, mask integrity, and anomaly accuracy.

### Controls

| Action | Desktop | Touch |
|---|---|---|
| Look | Mouse (click to capture) | Drag |
| Flag | Hold F | Hold the Flag button |
| Answer / choose | 1, 2, 3 or click | Tap |
| Hold during the restraint moment | Hold Space | Hold the Hold button |
| Pause | P or Esc | Pause button |
| Mute | M | Sound button |
| Debug overlay (spoilers) | Backquote | Start-screen checkbox |

## Project layout

| Path | Contents |
|---|---|
| `src/constants.ts` | All tuning values: sanity bands, drift, deltas, the 13-stop segment table, dialogue |
| `src/game/gameState.ts` | Game engine: ride loop, doors, mask checks, suspicion, sanity, the False Stop Trial, restraint, scoring |
| `src/game/anomalyManager.ts` | Anomaly catalog by sanity tier |
| `src/graphics/` | Procedural subway car, characters, textures, and the Trial space |
| `src/audio/audioEngine.ts` | WebAudio bed, chimes, screech, whispers |
| `src/components/` | React HUD, start, pause, and report screens |
