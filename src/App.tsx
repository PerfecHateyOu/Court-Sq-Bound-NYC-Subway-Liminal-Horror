/**
 * Court Sq-Bound: NYC Subway Liminal Horror
 * Main Application Component tying Three.js render loop with React HUD,
 * sanity tier filters, and full game flow.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameEngine } from './game/gameState';
import { audioEngine } from './audio/audioEngine';
import { settings } from './settings';
import { KeyLook } from './input/keyLook';
import { haptics } from './game/haptics';
import { GlitchPass } from './graphics/glitchPass';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { ReportScreen } from './components/ReportScreen';
import { SettingsPanel } from './components/SettingsPanel';
import { PauseScreen } from './components/PauseScreen';
import { RunHistoryRecord } from './types';

// Touch = the primary pointer is coarse. Touchscreen laptops report touch points too,
// but they have a mouse or trackpad and should get pointer lock and desktop tuning.
// Screen tearing is skipped entirely for players who ask the OS for reduced motion.

const IS_TOUCH =
  typeof window !== 'undefined' &&
  (matchMedia('(pointer: coarse)').matches ||
    ('ontouchstart' in window && !matchMedia('(pointer: fine)').matches));

// The engine notifies React on discrete events only. These HUD values change every frame,
// so refresh at ~30 Hz while any of them is on screen.
const HUD_REFRESH_MS = 33;
function hudNeedsLiveRefresh(G: GameEngine): boolean {
  if (G.paused || G.phase === 'menu' || G.phase === 'end') return false;
  return (
    G.flagHeld ||
    G.flagProg > 0 ||
    !!G.choice ||
    !!G.restraint ||
    G.debug ||
    G.GT < G.hintUntil ||
    G.GT - G.notedT < 0.7
  );
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [, setTick] = useState(0);
  const [phase, setPhase] = useState<'menu' | 'intro' | 'ride' | 'stop' | 'haven' | 'trial' | 'end'>('menu');
  const [paused, setPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [runsHistory, setRunsHistory] = useState<RunHistoryRecord[]>([]);
  // Settings panel (over the start screen or the pause menu). The ref lets the key handler see it.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsOpenRef = useRef(false);
  // Held arrow/WASD keys; the render loop turns the view while they're down.
  const keyLookRef = useRef(new KeyLook());
  settingsOpenRef.current = settingsOpen;
  useEffect(() => {
    if (phase !== 'menu' && !paused) setSettingsOpen(false);
  }, [phase, paused]);

  // Tier visual filter values
  const [tierStyle, setTierStyle] = useState({
    filter: 'none',
    vignetteOpacity: 0.55,
  });

  const isTouch = IS_TOUCH;

  // Re-render helper
  const triggerUpdate = useCallback(() => {
    setTick((t) => t + 1);
    if (engineRef.current) {
      setPhase(engineRef.current.phase);
      setPaused(engineRef.current.paused);
      setIsMuted(audioEngine.getMuted());

      // Update tier post-processing CSS filters
      const t = engineRef.current.tier;
      if (t === 0) {
        setTierStyle({ filter: 'none', vignetteOpacity: 0.55 });
      } else if (t === 1) {
        setTierStyle({ filter: 'saturate(0.8) contrast(1.04)', vignetteOpacity: 0.62 });
      } else if (t === 2) {
        setTierStyle({ filter: 'saturate(0.55) contrast(1.1) hue-rotate(-8deg)', vignetteOpacity: 0.72 });
      } else {
        setTierStyle({ filter: 'saturate(0.3) contrast(1.18) sepia(0.18)', vignetteOpacity: 0.85 });
      }
    }
  }, []);

  const requestLock = useCallback(() => {
    if (isTouch) return;
    const canvas = containerRef.current?.querySelector('canvas');
    if (canvas && !document.pointerLockElement) {
      canvas.requestPointerLock?.()?.catch?.(() => {});
    }
  }, [isTouch]);

  // Every pause path (Esc, P, tab switch, pause button) goes through here so held inputs
  // are released and the restraint gets its grace period on resume.
  const pauseGame = useCallback(() => {
    const G = engineRef.current;
    if (!G || G.paused) return;
    G.pause();
    if (!G.paused) return; // menu or report: nothing to pause
    haptics.stop();
    keyLookRef.current.clear();
    if (document.hidden) {
      // Tab switched away: silence everything; music starts when the player comes back.
      audioEngine.suspend();
    } else {
      // Game audio fades out, pause music (shaped by the current sanity tier) fades in.
      audioEngine.enterPause(G.tier);
    }
    // Free the cursor so the Resume button can be clicked.
    if (document.pointerLockElement) document.exitPointerLock();
    if (containerRef.current) containerRef.current.style.transform = '';
    triggerUpdate();
  }, [triggerUpdate]);

  const resumeGame = useCallback(() => {
    const G = engineRef.current;
    if (!G || !G.paused) return;
    G.resume();
    audioEngine.wake();
    audioEngine.exitPause();
    requestLock();
    triggerUpdate();
  }, [requestLock, triggerUpdate]);

  // Initialize Three.js scene & Game Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    let pixelRatio = Math.min(window.devicePixelRatio || 1, isTouch ? 1.75 : 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    containerRef.current.appendChild(renderer.domElement);
    const canvas = renderer.domElement;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030403);
    scene.fog = new THREE.Fog(0x040504, 9, 30);

    const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.08, 90);
    camera.rotation.order = 'YXZ';

    // Base field of view; breathing narrows it slightly from here each frame.
    let baseFov = 68;
    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (!w || !h) return;
      const aspect = w / h;
      camera.aspect = aspect;
      baseFov = aspect < 1 ? 88 : 68;
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', () => {
      setTimeout(fit, 120);
      setTimeout(fit, 450);
    });

    // Create Engine instance
    const engine = new GameEngine(scene, camera, renderer, isTouch);
    const glitchPass = new GlitchPass(renderer);
    // Registered after fit, so the renderer has its new size when the glitch target follows it.
    const fitGlitch = () => glitchPass.syncSize();
    window.addEventListener('resize', fitGlitch);
    engineRef.current = engine;

    // Test builds only (vite build --mode test): expose internals to the Playwright suite.
    // MODE is replaced at build time, so production bundles don't contain this.
    if (import.meta.env.MODE === 'test') {
      Object.assign(window, { __G: engine, __A: audioEngine, __S: settings, __R: { renderer, scene, camera, glitchPass } });
    }

    engine.onStateChange = () => triggerUpdate();
    engine.onReportReady = (runs) => {
      setRunsHistory(runs);
      triggerUpdate();
    };

    // Frame-time resolution governor
    let lastTime = performance.now();
    let perfAcc = 0;
    let perfN = 0;
    let hudAcc = 0;
    let hudWasLive = false;

    let animId: number;
    const animate = (currentTime: number) => {
      animId = requestAnimationFrame(animate);
      const deltaMs = currentTime - lastTime;
      const dt = Math.min(0.05, deltaMs / 1000);
      lastTime = currentTime;

      // Performance governor
      if (!document.hidden && deltaMs <= 250 && engine.phase !== 'menu' && !engine.paused) {
        perfAcc += deltaMs;
        perfN++;
        if (perfN >= 90) {
          const avgMs = perfAcc / perfN;
          perfAcc = 0;
          perfN = 0;
          if (avgMs > 25 && pixelRatio > 1) {
            pixelRatio = Math.max(1, pixelRatio - 0.25);
            renderer.setPixelRatio(pixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            glitchPass.syncSize();
          }
        }
      }

      if (!engine.paused) {
        if (engine.phase !== 'menu' && engine.phase !== 'end') {
          keyLookRef.current.apply(engine, dt, settings.get().lookSensitivity);
        }
        engine.update(dt);
      }

      // Live HUD: flag ring fill, answer countdown bars, hint expiry, debug overlay.
      // One extra refresh after the last live frame lets them settle (e.g. a hint disappearing).
      hudAcc += deltaMs;
      const hudLive = hudNeedsLiveRefresh(engine);
      if ((hudLive || hudWasLive) && hudAcc >= HUD_REFRESH_MS) {
        hudAcc = 0;
        hudWasLive = hudLive;
        setTick((t) => t + 1);
      }

      // Anxious breathing: a slight FOV pulse during low-sanity rides (off when screen effects are reduced).
      // The offset is in degrees at the 68° landscape FOV, so scale it for the wider portrait view.
      const reduced = settings.effectsReduced();
      const fov = baseFov * (1 + (reduced ? 0 : engine.breathFovOffset()) / 68);
      if (Math.abs(camera.fov - fov) > 1e-4) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }

      // Screen glitch: only route through the shader pass while one is playing.
      const glitchAmt = reduced ? 0 : engine.glitchAmount();
      if (glitchAmt > 0.001 && engine.glitch) {
        glitchPass.render(scene, camera, glitchAmt, engine.GT - engine.glitch.start, engine.glitch.seed);
      } else {
        renderer.render(scene, camera);
      }

      // Subway train motion screen-shake (linked to ride phase and sanity tier)
      if (engine.phase !== 'menu' && !engine.paused) {
        const shake = engine.getScreenShake();
        if (containerRef.current) {
          if (shake.intensity > 0.001) {
            containerRef.current.style.transform = `translate3d(${shake.x.toFixed(2)}px, ${shake.y.toFixed(2)}px, 0px) rotate(${shake.rot.toFixed(3)}deg)`;
          } else if (containerRef.current.style.transform) {
            containerRef.current.style.transform = '';
          }
        }
      } else if (containerRef.current?.style.transform) {
        containerRef.current.style.transform = '';
      }
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', fit);
      window.removeEventListener('resize', fitGlitch);
      glitchPass.dispose();
      renderer.dispose();
      if (containerRef.current) containerRef.current.style.transform = '';
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [isTouch, triggerUpdate]);

  // Pointer & Touch Look Controls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let dragId: number | null = null;
    let lx = 0;
    let ly = 0;

    const handlePointerDown = (e: PointerEvent) => {
      const G = engineRef.current;
      if (!G || G.paused || G.phase === 'menu' || G.phase === 'end') return;

      audioEngine.wake();
      if (e.pointerType === 'mouse') requestLock();

      if (dragId === null) {
        dragId = e.pointerId;
        lx = e.clientX;
        ly = e.clientY;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const G = engineRef.current;
      if (!G || G.paused || G.phase === 'menu' || G.phase === 'end') return;

      const limit = G.phase === 'trial' ? 1.2 : 1.75;
      // Look speed and vertical direction come from the player's settings.
      const { lookSensitivity: sens, invertY } = settings.get();
      const ySign = invertY ? -1 : 1;
      if (e.pointerType === 'mouse' && document.pointerLockElement) {
        G.ty = Math.max(-limit, Math.min(limit, G.ty - e.movementX * 0.0022 * sens));
        G.tp = Math.max(-0.6, Math.min(0.72, G.tp - ySign * e.movementY * 0.0022 * sens));
        return;
      }

      if (e.pointerId !== dragId) return;
      const k = (e.pointerType === 'mouse' ? 0.004 : 0.0055) * sens;
      G.ty = Math.max(-limit, Math.min(limit, G.ty - (e.clientX - lx) * k));
      G.tp = Math.max(-0.6, Math.min(0.72, G.tp - ySign * (e.clientY - ly) * k));
      lx = e.clientX;
      ly = e.clientY;
    };

    const handlePointerEnd = (e: PointerEvent) => {
      if (e.pointerId === dragId) dragId = null;
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerEnd);
    container.addEventListener('pointercancel', handlePointerEnd);
    container.addEventListener('pointerleave', handlePointerEnd);

    // Auto-pause when pointerlock is exited mid-game (Esc)
    const handleLockChange = () => {
      if (!document.pointerLockElement) pauseGame();
    };
    document.addEventListener('pointerlockchange', handleLockChange);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerEnd);
      container.removeEventListener('pointercancel', handlePointerEnd);
      container.removeEventListener('pointerleave', handlePointerEnd);
      document.removeEventListener('pointerlockchange', handleLockChange);
    };
  }, [isTouch, requestLock, pauseGame]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const G = engineRef.current;
      if (!G) return;

      // With Settings open, P closes it (and leaves the game paused). Esc is handled by the
      // panel itself (see ui/escape.ts), so a confirmation inside it closes first.
      if (settingsOpenRef.current) {
        if (e.code === 'KeyP') {
          e.preventDefault();
          setSettingsOpen(false);
        }
        if (e.code !== 'KeyM') return;
      }

      if ((e.code === 'KeyP' || e.code === 'Escape') && G.phase !== 'menu' && G.phase !== 'end') {
        if (G.paused) resumeGame();
        else pauseGame();
        return;
      }

      if (e.code === 'KeyM' && !e.repeat) {
        const muted = audioEngine.toggleMute();
        setIsMuted(muted);
        triggerUpdate();
        return;
      }

      if (e.code === 'Backquote') {
        G.debug = !G.debug;
        triggerUpdate();
        return;
      }

      if (G.paused || G.phase === 'menu' || G.phase === 'end') return;

      // Keyboard look (arrows / WASD): held keys turn the view smoothly in the render loop.
      if (KeyLook.isLookKey(e.code)) {
        if (e.code.startsWith('Arrow')) e.preventDefault();
        keyLookRef.current.press(e.code);
        return;
      }

      // Flagging / Restraint holding
      if ((e.code === 'KeyF' || e.code === 'Space') && !e.repeat) {
        if (e.code === 'Space' && !G.restraint) return;
        e.preventDefault();
        G.flagHeld = true;
        triggerUpdate();
      }

      // Choice hotkeys (1, 2, 3)
      const numMatch = e.code.match(/^(Digit|Numpad)([1-3])$/);
      if (numMatch && G.choice) {
        const choiceIdx = parseInt(numMatch[2], 10) - 1;
        if (choiceIdx < G.choice.items.length) {
          G.pickChoiceIndex(G.choice.keyMap[choiceIdx]);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const G = engineRef.current;
      if (!G) return;
      keyLookRef.current.release(e.code);
      if (e.code === 'KeyF' || e.code === 'Space') {
        G.flagHeld = false;
        triggerUpdate();
      }
    };

    const handleVisibility = () => {
      const G = engineRef.current;
      if (document.hidden) {
        if (G && G.paused) audioEngine.suspend(); // already paused: stop the pause music too
        else pauseGame();
      } else if (G && G.paused) {
        // Back on the tab while paused: bring the pause music back.
        audioEngine.wake();
        audioEngine.enterPause(G.tier);
      }
    };

    // Alt-tab or clicking another window: the key-up never arrives, so release held
    // inputs here. During the restraint this starts the grace period instead of failing it.
    const handleBlur = () => {
      const G = engineRef.current;
      keyLookRef.current.clear(); // keyups are lost while the window is unfocused
      if (!G) return;
      G.interruptInputs();
      triggerUpdate();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [triggerUpdate, pauseGame, resumeGame]);

  const handleStartGame = (startMuted: boolean, showDebug: boolean) => {
    audioEngine.init(startMuted);
    audioEngine.wake();
    setIsMuted(startMuted);

    const G = engineRef.current;
    if (G) {
      G.debug = showDebug;
      G.startIntro();
      triggerUpdate();
    }
  };

  const handleFlagDown = () => {
    const G = engineRef.current;
    if (G && !G.paused) {
      G.flagHeld = true;
      triggerUpdate();
    }
  };

  const handleFlagUp = () => {
    const G = engineRef.current;
    if (G) {
      G.flagHeld = false;
      triggerUpdate();
    }
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
    triggerUpdate();
  };

  const handlePause = pauseGame;
  const handleResume = resumeGame;

  // Restart from the pause menu: a fresh run from Hoyt–Schermerhorn. The abandoned
  // ride is not saved to run history (only endGame() saves).
  const handleRestart = () => {
    const G = engineRef.current;
    if (!G) return;
    audioEngine.exitPause();
    G.startIntro(); // resets all run state and unpauses
    audioEngine.wake();
    requestLock();
    triggerUpdate();
  };

  const handlePlayAgain = () => {
    const G = engineRef.current;
    if (G) {
      G.startIntro();
      triggerUpdate();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0d110e] text-[#ece6d3] font-sans">
      {/* 3D Canvas Stage */}
      <div
        ref={containerRef}
        className="absolute -inset-2 z-0 touch-none will-change-transform"
        style={{ filter: tierStyle.filter, transition: 'filter 2s ease' }}
      />

      {/* Atmospheric Vignette Filter */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, #000000 100%)',
          opacity: tierStyle.vignetteOpacity,
          transition: 'opacity 2s ease',
        }}
      />

      {/* Interactive HUD Overlay */}
      {engineRef.current && (
        <HUD
          engine={engineRef.current}
          onPause={handlePause}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
          onFlagDown={handleFlagDown}
          onFlagUp={handleFlagUp}
        />
      )}

      {/* Start / Briefing Screen */}
      {phase === 'menu' && (
        <StartScreen onStart={handleStartGame} onOpenSettings={() => setSettingsOpen(true)} isTouch={isTouch} />
      )}

      {/* Pause Screen Overlay */}
      {paused && engineRef.current && (
        <PauseScreen
          engine={engineRef.current}
          onResume={handleResume}
          onRestart={handleRestart}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {/* Settings, only from the start screen or the pause menu */}
      {settingsOpen && (phase === 'menu' || paused) && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} isTouch={isTouch} />
      )}

      {/* End of Ride Psychological Travel Report */}
      {phase === 'end' && engineRef.current && (
        <ReportScreen
          engine={engineRef.current}
          runs={runsHistory}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
