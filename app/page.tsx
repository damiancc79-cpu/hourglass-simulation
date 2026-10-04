"use client";

import { KeyboardEvent, useEffect, useState } from "react";
import { HourglassScene } from "./HourglassScene";

const DURATION_SECONDS = 60;

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export default function Home() {
  const [sandUpper, setSandUpper] = useState(1);
  const [running, setRunning] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const sandDepleted = sandUpper <= 0;

  useEffect(() => {
    if (!running || isFlipping || sandDepleted) return;

    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      setSandUpper((current) => {
        const next = Math.max(0, current - elapsed / DURATION_SECONDS);
        if (next === 0) setRunning(false);
        return next;
      });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isFlipping, running, sandDepleted]);

  const flip = () => {
    if (isFlipping) return;
    const resumeAfterFlip = running || sandUpper <= 0.001;
    setRunning(false);
    setIsFlipping(true);
    window.setTimeout(() => {
      setSandUpper((current) => 1 - current);
      setIsFlipping(false);
      setRunning(resumeAfterFlip);
    }, 900);
  };

  const reset = () => {
    setSandUpper(1);
    setIsFlipping(false);
    setRunning(true);
    setResetSignal((value) => value + 1);
  };

  const toggleRunning = () => {
    if (sandUpper <= 0) {
      setSandUpper(1);
      setRunning(true);
      return;
    }
    setRunning((value) => !value);
  };

  const handleStageKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key.toLowerCase() === "f") flip();
    if (event.key.toLowerCase() === "r") reset();
    if (event.key === " ") {
      event.preventDefault();
      toggleRunning();
    }
  };

  const status = isFlipping
    ? "Reversing gravity"
    : sandUpper <= 0
      ? "Transfer complete"
      : running
        ? "Physics live"
        : "Simulation paused";

  return (
    <main className="immersive-shell">
      <div
        className="immersive-stage"
        role="application"
        aria-label="Interactive 3D hourglass. Left-drag to rotate, scroll to zoom, press F to flip, space to pause, or R to reset."
        tabIndex={0}
        onKeyDown={handleStageKey}
        onPointerDown={(event) => event.currentTarget.focus({ preventScroll: true })}
      >
        <HourglassScene
          sandUpper={sandUpper}
          speed={1}
          running={running}
          isFlipping={isFlipping}
          showTrails
          showMesh={false}
          resetSignal={resetSignal}
        />

        <section className="voiceover-player" aria-labelledby="voiceover-title">
          <div>
            <span>History voiceover</span>
            <h1 id="voiceover-title">A brief history of the hourglass</h1>
          </div>
          <audio controls preload="metadata" src="/hourglass-history.mp3">
            Your browser does not support audio playback.
          </audio>
        </section>
      </div>

      <p className="sr-only" aria-live="polite">
        {status}. {formatTime(sandUpper * DURATION_SECONDS)} remaining.
      </p>
    </main>
  );
}
