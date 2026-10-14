/**
 * Court Sq-Bound: NYC Subway Liminal Horror
 * Main Application Component tying Three.js render loop with React HUD,
 * sanity tier filters, and full game flow.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameEngine } from './game/gameState';
import { audioEngine } from './audio/audioEngine';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { ReportScreen } from './components/ReportScreen';
import { PauseScreen } from './components/PauseScreen';
import { RunHistoryRecord } from './types';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [, setTick] = useState(0);
  const [phase, setPhase] = useState<'menu' | 'intro' | 'ride' | 'stop' | 'haven' | 'trial' | 'end'>('menu');
  const [paused, setPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [runsHistory, setRunsHistory] = useState<RunHistoryRecord[]>([]);

  // Tier visual filter values
  const [tierStyle, setTierStyle] = useState({
    filter: 'none',
    vignetteOpacity: 0.55,
  });

  const isTouch = typeof window !== 'undefined' &&
    (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || matchMedia('(pointer: coarse)').matches);

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

    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (!w || !h) return;
      const aspect = w / h;
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 88 : 68;
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
    engineRef.current = engine;

    engine.onStateChange = () => triggerUpdate();
    engine.onReportReady = (runs) => {
      setRunsHistory(runs);
      triggerUpdate();
    };

    // Frame-time resolution governor
    let lastTime = performance.now();
    let perfAcc = 0;
    let perfN = 0;

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
          }
        }
      }

      if (!engine.paused) {
        engine.update(dt);
      }

      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', fit);
      renderer.dispose();
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

    const requestLock = () => {
      if (isTouch) return;
      const canvas = container.querySelector('canvas');
      if (canvas && !document.pointerLockElement) {
        canvas.requestPointerLock?.().catch(() => {});
      }
    };

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
      if (e.pointerType === 'mouse' && document.pointerLockElement) {
        G.ty = Math.max(-limit, Math.min(limit, G.ty - e.movementX * 0.0022));
        G.tp = Math.max(-0.6, Math.min(0.72, G.tp - e.movementY * 0.0022));
        return;
      }

      if (e.pointerId !== dragId) return;
      const k = e.pointerType === 'mouse' ? 0.004 : 0.0055;
      G.ty = Math.max(-limit, Math.min(limit, G.ty - (e.clientX - lx) * k));
      G.tp = Math.max(-0.6, Math.min(0.72, G.tp - (e.clientY - ly) * k));
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

    // Auto-pause when pointerlock is exited mid-game
    const handleLockChange = () => {
      const G = engineRef.current;
      if (!G) return;
      if (!document.pointerLockElement && G.phase !== 'menu' && G.phase !== 'end' && !G.paused) {
        G.paused = true;
        audioEngine.suspend();
        triggerUpdate();
      }
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
  }, [isTouch, triggerUpdate]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const G = engineRef.current;
      if (!G) return;

      if (e.code === 'KeyP' && G.phase !== 'menu' && G.phase !== 'end') {
        G.paused = !G.paused;
        if (G.paused) {
          audioEngine.suspend();
        } else {
          audioEngine.wake();
        }
        triggerUpdate();
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
      if (e.code === 'KeyF' || e.code === 'Space') {
        G.flagHeld = false;
        triggerUpdate();
      }
    };

    const handleVisibility = () => {
      const G = engineRef.current;
      if (document.hidden && G && G.phase !== 'menu' && G.phase !== 'end' && !G.paused) {
        G.paused = true;
        audioEngine.suspend();
        triggerUpdate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [triggerUpdate]);

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

  const handlePause = () => {
    const G = engineRef.current;
    if (G) {
      G.paused = true;
      audioEngine.suspend();
      triggerUpdate();
    }
  };

  const handleResume = () => {
    const G = engineRef.current;
    if (G) {
      G.paused = false;
      audioEngine.wake();
      triggerUpdate();
    }
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
        className="absolute inset-0 z-0 touch-none"
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
        <StartScreen onStart={handleStartGame} isTouch={isTouch} />
      )}

      {/* Pause Screen Overlay */}
      {paused && engineRef.current && (
        <PauseScreen engine={engineRef.current} onResume={handleResume} />
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
