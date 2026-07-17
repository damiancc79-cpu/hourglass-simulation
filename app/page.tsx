"use client";

import { CSSProperties, KeyboardEvent, PointerEvent, useEffect, useRef, useState } from "react";

const DURATION_SECONDS = 60;
const GRAINS = Array.from({ length: 18 }, (_, index) => index);

type Rotation = { x: number; y: number };

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export default function Home() {
  const [sandUpper, setSandUpper] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(true);
  const [rotation, setRotation] = useState<Rotation>({ x: -4, y: 10 });
  const [isFlipping, setIsFlipping] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; rotation: Rotation } | null>(null);

  useEffect(() => {
    if (!running || isFlipping || sandUpper <= 0) return;

    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      setSandUpper((current) => {
        const next = Math.max(0, current - (elapsed * speed) / DURATION_SECONDS);
        if (next === 0) setRunning(false);
        return next;
      });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isFlipping, running, sandUpper <= 0, speed]);

  const remainingAtSpeed = (sandUpper * DURATION_SECONDS) / speed;
  const lowerAmount = 1 - sandUpper;
  const status = isFlipping ? "Reversing field" : sandUpper <= 0 ? "Transfer complete" : running ? "Flow nominal" : "Flow suspended";

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
    setSpeed(1);
    setRotation({ x: -4, y: 10 });
    setIsFlipping(false);
    setRunning(true);
  };

  const toggleRunning = () => {
    if (sandUpper <= 0) {
      setSandUpper(1);
      setRunning(true);
      return;
    }
    setRunning((value) => !value);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rotation,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    setRotation({
      x: Math.max(-24, Math.min(24, drag.current.rotation.x - dy * 0.16)),
      y: drag.current.rotation.y + dx * 0.2,
    });
  };

  const releasePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
  };

  const handleStageKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      setRotation((value) => ({ ...value, y: value.y + (event.key === "ArrowLeft" ? -8 : 8) }));
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      setRotation((value) => ({ ...value, x: Math.max(-24, Math.min(24, value.x + (event.key === "ArrowUp" ? 5 : -5))) }));
    }
    if (event.key.toLowerCase() === "f") flip();
    if (event.key.toLowerCase() === "r") reset();
    if (event.key === " ") {
      event.preventDefault();
      toggleRunning();
    }
  };

  const modelStyle = {
    "--rot-x": `${rotation.x}deg`,
    "--rot-y": `${rotation.y}deg`,
    "--upper-fill": `${Math.max(0, sandUpper * 70)}%`,
    "--lower-fill": `${Math.max(0, lowerAmount * 72)}%`,
    "--flow-speed": `${1 / speed}s`,
  } as CSSProperties;

  return (
    <main className="observatory-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <div>
            <p>Temporal Instruments</p>
            <h1>Midnight Observatory</h1>
          </div>
        </div>
        <div className="topbar-center" aria-hidden="true">
          <span />
          HG–01 / GRAVITY STUDY
          <span />
        </div>
        <div className={`system-chip ${running ? "is-live" : ""}`}>
          <i aria-hidden="true" />
          {status}
        </div>
      </header>

      <div className="workspace">
        <aside className="instrument-panel telemetry-panel" aria-label="Hourglass telemetry">
          <div className="panel-heading">
            <span>01</span>
            <p>Flow telemetry</p>
          </div>

          <div className="primary-readout">
            <span>Time remaining</span>
            <strong>{formatTime(remainingAtSpeed)}</strong>
            <small>MM : SS</small>
          </div>

          <dl className="telemetry-grid">
            <div>
              <dt>Upper mass</dt>
              <dd>{Math.round(sandUpper * 100)}<small>%</small></dd>
            </div>
            <div>
              <dt>Lower mass</dt>
              <dd>{Math.round(lowerAmount * 100)}<small>%</small></dd>
            </div>
            <div>
              <dt>Flow rate</dt>
              <dd>{(2.84 * speed).toFixed(2)}<small>g/s</small></dd>
            </div>
            <div>
              <dt>Gravity</dt>
              <dd>9.81<small>m/s²</small></dd>
            </div>
          </dl>

          <div className="field-graph" aria-hidden="true">
            <div className="graph-label"><span>Granular field</span><b>LIVE</b></div>
            <div className="graph-lines">
              {Array.from({ length: 17 }, (_, index) => <i key={index} style={{ height: `${20 + ((index * 17) % 52)}%` }} />)}
            </div>
            <div className="graph-axis"><span>−30s</span><span>NOW</span></div>
          </div>

          <p className="object-note">
            <span>Object note / 7B</span>
            A calibrated vessel for observing time as matter: measured, reversible, and always in motion.
          </p>
        </aside>

        <section className="stage-column" aria-label="Interactive hourglass simulation">
          <div className="stage-kicker"><span>Drag to orbit</span><i /><span>Arrow keys supported</span></div>
          <div
            className="hourglass-stage"
            role="application"
            aria-label="Interactive 3D hourglass. Drag to rotate. Press F to flip, space to pause, or R to reset."
            tabIndex={0}
            onKeyDown={handleStageKey}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={releasePointer}
            onPointerCancel={releasePointer}
          >
            <div className="orbit orbit-one" aria-hidden="true" />
            <div className="orbit orbit-two" aria-hidden="true" />
            <div className="axis-line" aria-hidden="true"><span>N</span><span>S</span></div>

            <div className="model-perspective" style={modelStyle}>
              <div className="drag-shell">
                <div className={`hourglass-object ${isFlipping ? "is-flipping" : ""}`}>
                  <div className="plate plate-top"><i /><b /></div>
                  <div className="plate plate-bottom"><i /><b /></div>
                  <div className="post post-left-back"><i /></div>
                  <div className="post post-right-back"><i /></div>

                  <div className="glass-vessel" aria-hidden="true">
                    <div className="glass-half glass-upper">
                      <div className="glass-sheen" />
                      <div className="sand-reservoir sand-upper"><i /></div>
                    </div>
                    <div className="glass-neck" />
                    <div className="glass-half glass-lower">
                      <div className="glass-sheen" />
                      <div className="sand-reservoir sand-lower"><i /></div>
                    </div>
                    <div className={`sand-stream ${running && !isFlipping && sandUpper > 0 ? "is-flowing" : ""}`} />
                    <div className={`grain-field ${running && !isFlipping && sandUpper > 0 ? "is-flowing" : ""}`}>
                      {GRAINS.map((grain) => (
                        <i
                          key={grain}
                          style={{
                            left: `${47 + ((grain * 7) % 8)}%`,
                            animationDelay: `${(grain * 0.071) % 0.9}s`,
                            animationDuration: `${0.7 + (grain % 5) * 0.08}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="post post-left-front"><i /></div>
                  <div className="post post-right-front"><i /></div>
                </div>
              </div>
            </div>

            <div className="stage-caption" aria-hidden="true">
              <span>− {Math.round(rotation.y)}° AZ</span>
              <i />
              <span>{Math.round(rotation.x)}° EL</span>
            </div>
          </div>

          <div className="mobile-readout" aria-live="polite">
            <span>{status}</span>
            <strong>{formatTime(remainingAtSpeed)}</strong>
          </div>
        </section>

        <aside className="instrument-panel controls-panel" aria-label="Simulation controls">
          <div className="panel-heading">
            <span>02</span>
            <p>Instrument control</p>
          </div>

          <button className="flip-button" type="button" onClick={flip} disabled={isFlipping}>
            <span className="flip-icon" aria-hidden="true">↕</span>
            <span><b>{isFlipping ? "Reversing" : "Flip hourglass"}</b><small>F key</small></span>
          </button>

          <div className="button-pair">
            <button type="button" onClick={toggleRunning}>
              <span aria-hidden="true">{running ? "Ⅱ" : "▶"}</span>
              <b>{running ? "Pause" : sandUpper <= 0 ? "Restart" : "Resume"}</b>
            </button>
            <button type="button" onClick={reset}>
              <span aria-hidden="true">↺</span>
              <b>Reset</b>
            </button>
          </div>

          <div className="speed-control">
            <div className="control-label">
              <label htmlFor="flow-speed">Flow velocity</label>
              <output htmlFor="flow-speed">{speed.toFixed(2)}×</output>
            </div>
            <input
              id="flow-speed"
              type="range"
              min="0.25"
              max="2"
              step="0.25"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              style={{ "--range-progress": `${((speed - 0.25) / 1.75) * 100}%` } as CSSProperties}
            />
            <div className="range-scale"><span>0.25×</span><span>1.00×</span><span>2.00×</span></div>
          </div>

          <div className="material-card">
            <span>Instrument composition</span>
            <div><i className="swatch glass" /><p><b>Borosilicate</b><small>Optical vessel</small></p></div>
            <div><i className="swatch brass" /><p><b>Aged brass</b><small>Structural frame</small></p></div>
            <div><i className="swatch amber" /><p><b>Silica / amber</b><small>Calibrated medium</small></p></div>
          </div>

          <div className="shortcut-card">
            <span>Keyboard</span>
            <p><kbd>F</kbd> Flip <kbd>Space</kbd> Pause</p>
            <p><kbd>R</kbd> Reset <kbd>←</kbd><kbd>→</kbd> Orbit</p>
          </div>
        </aside>
      </div>

      <p className="sr-only" aria-live="polite">{status}. {formatTime(remainingAtSpeed)} remaining.</p>
    </main>
  );
}
