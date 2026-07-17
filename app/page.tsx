"use client";

import { CSSProperties, KeyboardEvent, useEffect, useState } from "react";
import { HourglassScene } from "./HourglassScene";

const DURATION_SECONDS = 60;

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export default function Home() {
  const [sandUpper, setSandUpper] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const [showMesh, setShowMesh] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

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
  const status = isFlipping
    ? "Reversing gravity"
    : sandUpper <= 0
      ? "Transfer complete"
      : running
        ? "Physics live"
        : "Simulation paused";

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
          HG–02 / GRANULAR DYNAMICS
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
            <p>Particle telemetry</p>
          </div>

          <div className="primary-readout">
            <span>Time remaining</span>
            <strong>{formatTime(remainingAtSpeed)}</strong>
            <small>MM : SS / SIMULATED</small>
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

          <div className="solver-card">
            <div><span>Particle solver</span><b>STABLE</b></div>
            <ul>
              <li><span>Dynamic grains</span><b>240</b></li>
              <li><span>Reservoir field</span><b>3,600</b></li>
              <li><span>Collision model</span><b>CONE / RADIAL</b></li>
              <li><span>Integrator</span><b>SEMI-IMPLICIT</b></li>
            </ul>
          </div>

          <div className="field-graph" aria-hidden="true">
            <div className="graph-label"><span>Collision energy</span><b>{running ? "LIVE" : "HOLD"}</b></div>
            <div className="graph-lines">
              {Array.from({ length: 21 }, (_, index) => (
                <i key={index} style={{ height: `${18 + ((index * 23 + Math.round(lowerAmount * 19)) % 62)}%` }} />
              ))}
            </div>
            <div className="graph-axis"><span>−12s</span><span>NOW</span></div>
          </div>

          <p className="object-note">
            <span>Model note / HG–02</span>
            A procedural 3D instrument built from lathed optical glass, machined brass, and thousands of simulated amber grains.
          </p>
        </aside>

        <section className="stage-column" aria-label="Interactive hourglass simulation">
          <div className="stage-kicker">
            <span>Drag to orbit</span><i /><span>Scroll to zoom</span><i /><span>Real-time WebGL</span>
          </div>
          <div
            className="hourglass-stage"
            role="application"
            aria-label="Interactive 3D hourglass. Drag to orbit, scroll to zoom, press F to flip, space to pause, or R to reset."
            tabIndex={0}
            onKeyDown={handleStageKey}
          >
            <div className="orbit orbit-one" aria-hidden="true" />
            <div className="orbit orbit-two" aria-hidden="true" />
            <div className="axis-line" aria-hidden="true"><span>N</span><span>S</span></div>

            <HourglassScene
              sandUpper={sandUpper}
              speed={speed}
              running={running}
              isFlipping={isFlipping}
              showTrails={showTrails}
              showMesh={showMesh}
              resetSignal={resetSignal}
            />

            <div className="render-specs" aria-hidden="true">
              <span>PBR GLASS</span><i />
              <span>SOFT SHADOWS</span><i />
              <span>ACES TONE MAP</span>
            </div>
            <div className="stage-caption" aria-hidden="true">
              <span>FREE ORBIT</span>
              <i />
              <span>OPTICAL MODEL / 96 SEG</span>
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
            <p>Simulation control</p>
          </div>

          <button className="flip-button" type="button" onClick={flip} disabled={isFlipping}>
            <span className="flip-icon" aria-hidden="true">↕</span>
            <span><b>{isFlipping ? "Reversing gravity" : "Flip hourglass"}</b><small>900 ms physical turn / F key</small></span>
          </button>

          <div className="button-pair">
            <button type="button" onClick={toggleRunning}>
              <span aria-hidden="true">{running ? "Ⅱ" : "▶"}</span>
              <b>{running ? "Pause" : sandUpper <= 0 ? "Restart" : "Resume"}</b>
            </button>
            <button type="button" onClick={reset}>
              <span aria-hidden="true">↺</span>
              <b>Reset view</b>
            </button>
          </div>

          <div className="speed-control">
            <div className="control-label">
              <label htmlFor="flow-speed">Simulation velocity</label>
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

          <section className="history-audio-card" aria-labelledby="history-audio-title">
            <div className="audio-heading">
              <span>03 / Audio archive</span>
              <b>00:28</b>
            </div>
            <h2 id="history-audio-title">A brief history of the hourglass</h2>
            <p>From a medieval fresco to the decks of sailing ships.</p>
            <audio controls preload="metadata" src="/hourglass-history.mp3">
              Your browser does not support audio playback. <a href="/hourglass-history.mp3">Download the MP3</a>.
            </audio>
            <div className="audio-actions">
              <span>AI narration / MP3</span>
              <a href="/hourglass-history.mp3" download>Download ↓</a>
            </div>
            <details>
              <summary>Read transcript <span>+</span></summary>
              <p>
                Hourglasses have no certain inventor. The earliest clear European evidence is Ambrogio Lorenzetti’s 1338 fresco in Siena. By the late fourteenth century, sandglasses appeared in ship inventories. Their steady flow worked well on a moving deck, so sailors used them to time watches and help estimate speed. On land, they timed sermons, cooking, and work. Today, the hourglass survives less as a precision clock than as a symbol of time passing.
              </p>
              <div className="history-sources">
                Sources: <a href="https://www.guinnessworldrecords.com/world-records/first-hourglass" target="_blank" rel="noreferrer">early evidence</a> · <a href="https://www.rmg.co.uk/collections/objects/rmgc-object-10272" target="_blank" rel="noreferrer">maritime use</a>
              </div>
            </details>
          </section>

          <div className="display-controls">
            <span>Model overlays</span>
            <button
              type="button"
              className={showTrails ? "is-active" : ""}
              aria-pressed={showTrails}
              onClick={() => setShowTrails((value) => !value)}
            >
              <i />
              <span><b>Velocity trails</b><small>Particle trajectory field</small></span>
            </button>
            <button
              type="button"
              className={showMesh ? "is-active" : ""}
              aria-pressed={showMesh}
              onClick={() => setShowMesh((value) => !value)}
            >
              <i />
              <span><b>Glass topology</b><small>Reveal procedural mesh</small></span>
            </button>
          </div>

          <div className="model-card">
            <span>3D model / HG–02</span>
            <div><b>Procedural lathe</b><small>96 radial segments</small></div>
            <div><b>Physical glass</b><small>IOR 1.46 / transmission 1.0</small></div>
            <div><b>Machined frame</b><small>Brass PBR / 4 supports</small></div>
            <a href="/midnight-hourglass.glb" download>Download GLB model <span>↓</span></a>
          </div>

          <div className="shortcut-card">
            <span>Keyboard</span>
            <p><kbd>F</kbd> Flip <kbd>Space</kbd> Pause <kbd>R</kbd> Reset</p>
          </div>
        </aside>
      </div>

      <p className="sr-only" aria-live="polite">{status}. {formatTime(remainingAtSpeed)} remaining.</p>
    </main>
  );
}
