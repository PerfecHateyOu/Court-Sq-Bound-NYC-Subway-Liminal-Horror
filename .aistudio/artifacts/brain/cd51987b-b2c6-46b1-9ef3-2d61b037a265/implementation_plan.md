# Court Sq-Bound: Connected Multi-Car & Polaroid Anomaly Expansion

An expansive psychological horror upgrade introducing physical inter-car gangway traversal across multi-car consists, branching MTA transit routes with unique environmental profiles, an interactive vintage Polaroid camera with chemical photo development for evidentiary analysis, and reactive passenger NPCs whose behaviors and gazes warp with fluctuating sanity.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following directions were confirmed during Phase 1 clarification:
> - **Traversal & Structure**: Connected multi-car traversal allowing players to cross between rattling car gangways, alongside branching subway line selection (G Crosstown, L Bedford Spur, and haunted abandoned Express lines).
> - **Investigation Tool**: Instant Polaroid camera with chemical photo development, flash burst, viewfinder framing, and an evidence photo album.
> - **Atmosphere & NPCs**: Unsettling passenger NPCs featuring dynamic gaze shifts, synchronized chorus behaviors, vacant faces, and paranoid twitching scaled to player sanity.

- **Confirmed Decision 1: Inter-Car Traversal**: Players can walk to the ends of the subway car, open the heavy spring-loaded emergency gangway door, cross the loud exterior accordion gangway, and enter adjacent cars (Car A, Car B, Car C), each with independent passenger and anomaly states.
- **Confirmed Decision 2: Polaroid 600 Camera Mechanic**: Pressing `C` or toggling the HUD camera icon raises an authentic vintage viewfinder. Clicking snaps a photo with blinding flash, screen jitter, audio discharge, and a physical developing Polaroid slip that chemically fades in over 4 seconds into an evidence pocket.
- **Confirmed Decision 3: Reactive Passenger State Machine**: Passengers are not static mannequins; their gaze bones track player proximity, avert eyes when stared at directly, lock onto the player in unison during high sanity degradation, and react to camera flashes.
- **Recommended Default: Route Selection**: Players select transit lines at Haven transit hubs or when departing stations via interactive platform signage and subway line strip maps.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM ARCHITECTURE                             │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────────────────┐         ┌─────────────────────────────────┐     │
│   │   SubwayTrainConsist│         │       PolaroidSystem            │     │
│   │   • Car A (Lead)    │◄───────►│  • Viewfinder HUD Overlay       │     │
│   │   • Car B (Mid)     │         │  • Flash Burst & Shutter Audio  │     │
│   │   • Car C (Rear)    │         │  • WebGL Render Snapshot Engine │     │
│   │   • Gangway Doors   │         │  • Chemical Photo Film Drawer   │     │
│   └──────────┬──────────┘         └────────────────┬────────────────┘     │
│              │                                     │                      │
│              ▼                                     ▼                      │
│   ┌─────────────────────┐         ┌─────────────────────────────────┐     │
│   │ PassengerBehaviorMgr│         │       RouteBranchManager        │     │
│   │ • Gaze Vector IK    │         │  • G Line (Lime Crosstown)      │     │
│   │ • Synchronized Turn │         │  • L Line (Slate 14th St)       │     │
│   │ • Sanity Twitching  │         │  • Ghost 7 Line (Violet Express)│     │
│   │ • Flash Startle     │         │  • Anomaly Weighting & Ambience │     │
│   └─────────────────────┘         └─────────────────────────────────┘     │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the single-car transit loop into a multi-car train experience where players physically traverse between rattling subway cars across windy gangway couplings, use an authentic instant Polaroid camera to inspect and capture anomalous phenomena, encounter commuters whose subtle behaviors become increasingly sinister, and navigate branching subway routes across the transit network.
- **Target Audience / Persona**: Fans of liminal horror, psychological mystery games (*The Exit 8*, *Shinkansen 0*, *Iron Lung*, *Phasmophobia*), and atmospheric NYC subway commuters who appreciate transit authenticity mixed with surreal dread.
- **Key Value**: Deepens observational engagement from passive walking to proactive investigation with tactile photographic evidence, heightened tension through inter-car liminal traversal, and emergent behavioral dread from passenger NPCs.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Boarding & Multi-Car Exploration**:
   - The player spawns in Car 2 (Mid-Car) of a 3-car consist.
   - At either end of the car, the heavy transit door has a glass window looking into the windy, chain-linked gangway and adjacent car.
   - Interacting with the door pushes through with heavy metallic door hinges and rushing wind tunnel sound, stepping across the oscillating steel footplates into Car 1 or Car 3.
   - Each car possesses distinct passengers, lighting conditions, and potential anomalies.

2. **Operating the Polaroid 600 Camera**:
   - The player presses `C` or clicks the camera icon on the bottom right HUD.
   - The vintage Polaroid camera lifts smoothly into frame with a matte-black viewfinder, exposure meter, and frame grid.
   - Left-clicking triggers a mechanical shutter click, a brief high-voltage Xenon flash burst that illuminates dark corners of the car, and ejects a film slip at the bottom edge.
   - The photo develops organically over 4 seconds: starting opaque silver-gray, slowly revealing the captured scene, timestamp, and automated anomaly contrast edge detection.
   - Pressing `Tab` or clicking the "Evidence Album" icon opens the player's photo collection, letting them review anomalies, compare suspicious details, and log evidence.

3. **Interacting with Passenger NPCs**:
   - Commuters sit or stand along bench rows holding subway cards, newspapers, or phones.
   - Under normal conditions, they look down, read, or stare blankly forward.
   - When the player looks away and turns back, passenger heads smoothly rotate toward the player.
   - In anomalous cars, passengers exhibit synchronized chorus behaviors: blinking simultaneously, staring with hollow expressions, breathing in reverse, or freezing in unnatural postures.
   - Flashing the camera near an anomalous passenger causes a brief uncanny reaction: pupil reflections, static jitter, or instant head snap.

4. **Branching Transit Route Selection**:
   - At station stops or Haven terminals, the player can choose track switches or train routes:
     - **G Line (Brooklyn-Queens Crosstown)**: Industrial fluorescent lighting, lime green route bullets, screeching tight curves, structural anomalies.
     - **L Line (14th St-Canarsie)**: Modernized digital LED strips, gray route bullets, temporal loops, electronic sign anomalies.
     - **7 Express (Abandoned Spur)**: Dim vintage amber bulbs, purple route bullets, heavy fog, high frequency of surreal passenger apparitions.

### Visual Identity & Theme

- **Aesthetic Direction**: Gritty 1990s-2000s New York City subway realism overlaid with liminal analog photography aesthetics.
- **Color Palette**:
  - Primary Train Interiors: Muted stainless steel `#2b2d30`, aged fiberglass seats `#d48834` / `#4a7298`, dirty linoleum `#7a766d`.
  - Transit Route Badges: G Line Lime `#6CBE45`, L Line Slate `#A7A9AC`, 7 Line Purple `#B933AD`.
  - Polaroid Aesthetic: Cream photo border `#f4efe6`, aged photographic film grain, warm amber Xenon flash bloom, dark silver-halide developer emulsion `#2c2a26`.
- **Typography & Hierarchy**:
  - Transit Signage & Bullet Badges: Heavy geometric sans (Helvetica / Standard NYC Transit style) with crisp high contrast.
  - Polaroid & Photo Stamps: Tabular monospaced dot-matrix / thermal font for exposure numbers and anomaly timestamps.
  - HUD UI: Clean frosted glass panels (`bg-black/60 backdrop-blur-md border border-white/10`) with zero unnecessary pill enclosures.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Multi-Car Consist Traversal vs. Teleportation
- **Chosen Approach**: Physical 3-car continuous layout in Three.js with functional gangway connectors (flexible accordion walls and rattling floor treadplates).
- **Why**: Maintaining spatial continuity when crossing between cars creates massive tension, making the outdoor wind and darkness between cars feel genuinely dangerous and claustrophobic.
- **Alternatives Considered**: Screen fade or door teleportation; rejected because it destroys the immersive sense of physical presence.

### Decision 2: WebGL Canvas Snapshotting for Polaroid Photos
- **Chosen Approach**: Offscreen WebGL render target capture or direct canvas image clipping synced to the camera's current frustum, converted to a lightweight data URL / canvas texture rendered inside the 2D DOM Polaroid slip.
- **Why**: Creates genuine, 100% accurate snapshots of whatever the player was actually looking at (including glitches, lighting, passenger poses, and graffiti) rather than canned static textures.
- **Performance Preservation**: Snapshots are captured at 480x480 resolution into an in-memory album array (capped at 12 recent photos) to keep GPU memory minimal.

### Decision 3: Procedural Multi-Bone Passenger IK & Gaze Tracking
- **Chosen Approach**: Extend the existing `CharacterBuilder` articulated groups with a dynamic head bone rotation target that smoothly slerps toward the player's camera position based on distance and sanity tier.
- **Why**: Head-turning is the single most visceral uncanny horror cue in transit spaces. Zero external asset downloads needed; it leverages Three.js procedural groups cleanly.

---

## 4. Technical Architecture & Data Strategy

### Component & System Layout

```
src/
├── game/
│   ├── gameState.ts             # Consist position, active car index, route state
│   ├── consistManager.ts        # Manages Car A, Car B, Car C positioning & doors
│   ├── polaroidManager.ts       # Shutter trigger, film inventory, photo album store
│   ├── passengerBehavior.ts     # Gaze IK, synchronized chorus state, uncanny reaction
│   ├── routeManager.ts          # Line profiles (G, L, 7 Express), stations, soundsets
│   └── anomalyManager.ts        # Extended with multi-car & passenger anomaly types
├── graphics/
│   ├── subwayCarBuilder.ts      # Updated with gangway ends, accordions, and doorways
│   ├── characterBuilder.ts      # Enhanced passenger models with articulated gaze rigs
│   └── polaroidVFX.ts           # Xenon flash bloom overlay & chemical development shader
├── components/
│   ├── HUD.tsx                  # Reticle, line badge, camera trigger, mini route strip
│   ├── PolaroidViewfinder.tsx   # Fullscreen vintage camera overlay with framing guides
│   ├── PolaroidAlbum.tsx        # Slide-out photo pocket album reviewing snapshots
│   ├── RouteSelector.tsx        # Transit line branch selector at station haven platforms
│   └── ReportScreen.tsx         # Updated Travel Report reflecting inspected cars & photos
```

### Data Model & State

```typescript
export interface PolaroidPhoto {
  id: string;
  timestamp: number;
  dataUrl: string;
  carIndex: number;
  routeId: 'G' | 'L' | '7';
  hasAnomalyInFrustum: boolean;
  anomalyName?: string;
  exposureQuality: number;
}

export interface TransitLineRoute {
  id: 'G' | 'L' | '7';
  name: string;
  bulletColor: string;
  accentHex: number;
  anomalyFrequency: number;
  soundtrackProfile: string;
  stations: string[];
}

export interface ConsistState {
  currentCarIndex: number; // 0: Car A, 1: Car B (Center), 2: Car C
  isCrossingGangway: boolean;
  gangwayProgress: number; // 0..1
}
```

### Interactive Controls & Key Mappings

- **Movement**: `W`, `A`, `S`, `D` / Arrow Keys.
- **Look**: Mouse Pointer Lock.
- **Camera Viewfinder**: Press `C` or click HUD Viewfinder button.
- **Take Polaroid Photo**: Left Click while Viewfinder is active (or spacebar).
- **Evidence Album**: Press `Tab` or click Album button to toggle developed prints.
- **Gangway Door Interaction**: Walk up to end doors and press `E` or click to push open.
- **Route Switch**: Interactive transit signage at Haven platforms.

---

## 5. Implementation Phases

1. **Phase 1: Consist Architecture & Gangway Traversal**:
   - Construct the multi-car physical consist in Three.js (`Car A`, `Car B`, `Car C`) with connecting accordion vestibules.
   - Implement door open interaction, spatial audio for roaring track wind between cars, and smooth player boundary transitions.
2. **Phase 2: Polaroid 600 Camera Mechanic & Evidence Album**:
   - Build `PolaroidViewfinder.tsx` with vintage framing reticle, exposure meter, and click-to-shoot.
   - Implement Three.js canvas capture, flash burst animation, and chemical development transition.
   - Create the slide-out Evidence Album displaying captured photos with anomaly validation tags.
3. **Phase 3: Reactive Passenger NPCs & Gaze Tracking**:
   - Enhance `characterBuilder.ts` with head gaze tracking that calculates look-at vectors toward player camera.
   - Implement the `passengerBehavior.ts` state machine for subtle head turning, synchronized chorus stares, and flash reactions.
4. **Phase 4: Branching Subway Transit Routes**:
   - Implement `routeManager.ts` featuring the G Line (Crosstown), L Line (Digital Transit), and 7 Express (Ghost Line).
   - Integrate line-switching signage at haven stations and update HUD route indicators.
5. **Phase 5: Verification & Polish**:
   - Verify performance, frame rates, and memory cleanup for captured photo data URLs.
   - Run compilation checks (`compile_applet`) and verify responsive touch and desktop controls.
