import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, BarChart3, Beaker } from "lucide-react";

/**
 * PhysicsLab — Plinko (Galton Board) Simulator
 *
 * What it teaches:
 * - Binomial distribution from repeated left/right "collisions"
 * - Mean ≈ n·p, Variance ≈ n·p·(1-p), Normal approximation as n grows
 *
 * How it works (model):
 * - Discrete steps per row. At each row, ball moves left with prob (1-p) or right with prob p.
 * - This yields a bin index in [0..rows]. We animate the path on a peg lattice for intuition.
 *
 * UI:
 * - Rows (n): 6–18
 * - Bias (p): 0.00–1.00 (“probability of going right”)
 * - Balls to drop
 * - Start / Pause / Reset
 * - Toggles: Show Theoretical Binomial, Show Normal Approx., Show Trails
 *
 * Drop-in: single React component, Tailwind dark theme, canvas-based drawing.
 * Inspired by Plinko placeholder + style and your canvas game conventions. (See citations in chat.)
 */

export default function PlinkoGame() {
  // Canvas & animation refs
  const canvasRef = useRef(null);
  const rafRef = useRef();
  const launchTimerRef = useRef(null);

  // Board & sim settings
  const [rows, setRows] = useState(12);           // number of peg rows (bins = rows + 1)
  const [pRight, setPRight] = useState(0.5);      // probability of going right at each row
  const [ballsToDrop, setBallsToDrop] = useState(100);
  const [dropRateMs, setDropRateMs] = useState(60); // ms between ball launches (when running)
  const [running, setRunning] = useState(false);

  // Visualization toggles
  const [showTheoretical, setShowTheoretical] = useState(true);
  const [showNormalApprox, setShowNormalApprox] = useState(true);
  const [showTrails, setShowTrails] = useState(true);

  // World/Canvas dims
  const width = 800;
  const height = 520;

  // Lattice geometry
  const topMargin = 60;
  const bottomMargin = 150;
  const leftMargin = 60;
  const rightMargin = 60;

  // Derived geometry
  const boardWidth = width - leftMargin - rightMargin;
  const boardHeight = height - topMargin - bottomMargin;
  const rowGap = boardHeight / Math.max(1, rows);
  const pegRadius = 4;
  const ballRadius = 5;

  // Histogram data
  const [hist, setHist] = useState(() => Array(rows + 1).fill(0));
  const [dropped, setDropped] = useState(0);

  // Animated, in-flight ball
  const [activeBall, setActiveBall] = useState(null); // { path: [{x,y}], t:0..1, bin }
  const [trails, setTrails] = useState([]);           // recent paths for glow effect

  // Recompute pegs when rows change
  const pegs = useMemo(() => {
    // A triangular lattice centered horizontally. Row r has r+1 pegs.
    const out = [];
    const centerX = width / 2;
    // Horizontal spacing: keep last row pegs within boardWidth
    const maxCols = rows + 1;
    const colGap = boardWidth / Math.max(1, maxCols - 1);

    for (let r = 0; r < rows; r++) {
      const cols = r + 1;
      const y = topMargin + r * rowGap;
      // Center the row: offset depends on (maxCols - cols)
      const rowWidth = (cols - 1) * colGap;
      const startX = centerX - rowWidth / 2;
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push({ x: startX + c * colGap, y });
      }
      out.push(row);
    }
    return out;
  }, [rows, boardWidth, rowGap]);

  // Bin x-positions (centers) down at the bottom
  const bins = useMemo(() => {
    const maxCols = rows + 1;
    const colGap = boardWidth / Math.max(1, maxCols - 1);
    const y = topMargin + rows * rowGap;
    const startX = width / 2 - ((maxCols - 1) * colGap) / 2;
    return Array.from({ length: maxCols }, (_, i) => ({
      x: startX + i * colGap,
      y,
    }));
  }, [rows, boardWidth, rowGap]);

  // Helpers: distributions
  const binomialPMF = (n, p) => {
    // returns array length n+1 with P(X=k)
    const pmf = [];
    // to avoid big factorials, use multiplicative form
    let coeff = 1; // C(n,0)
    const q = 1 - p;
    for (let k = 0; k <= n; k++) {
      const prob = coeff * Math.pow(p, k) * Math.pow(q, n - k);
      pmf.push(prob);
      // update coeff for next k: C(n,k+1) = C(n,k) * (n-k)/(k+1)
      coeff = (coeff * (n - k)) / (k + 1);
    }
    return pmf;
  };

  const normalPDF = (x, mu, sigma) => {
    if (sigma <= 0) return 0;
    const z = (x - mu) / sigma;
    return (1 / (Math.sqrt(2 * Math.PI) * sigma)) * Math.exp(-0.5 * z * z);
  };

  // Compute one ball's discrete path and final bin
  const computeBallPath = () => {
    // Start slightly above first row, centered
    const startX = width / 2;
    const startY = topMargin - rowGap * 0.6;

    // For visuals: pass near each peg row mid-point with slight horizontal step
    const steps = [];
    let k = 0; // number of rights taken so far
    for (let r = 0; r < rows; r++) {
      // Decide direction: right with prob pRight
      const goRight = Math.random() < pRight;
      if (goRight) k++;

      // Target horizontal progress at row r is proportional to k
      // Map k in [0..r] to peg row span
      const cols = r + 1;
      const maxCols = rows + 1;
      const colGap = boardWidth / Math.max(1, maxCols - 1);
      const rowWidth = r * colGap;
      const rowStartX = width / 2 - rowWidth / 2;

      const x = r === 0
        ? startX + (goRight ? colGap / 2 : -colGap / 2) * 0.6
        : rowStartX + k * colGap;
      const y = topMargin + r * rowGap;

      // Insert a mid-way point to arc around the peg visually
      const prev = steps.length ? steps[steps.length - 1] : { x: startX, y: startY };
      const cx = (prev.x + x) / 2 + (Math.random() * 12 - 6); // tiny wobble
      const cy = (prev.y + y) / 2 + 8;

      steps.push({ x: cx, y: cy });
      steps.push({ x, y });
    }

    // Final fall to the bin line:
    const maxCols = rows + 1;
    const colGap = boardWidth / Math.max(1, maxCols - 1);
    const rowWidth = rows * colGap;
    const rowStartX = width / 2 - rowWidth / 2;
    const finalX = rowStartX + k * colGap;
    const finalY = topMargin + rows * rowGap + 30; // just below last peg row
    steps.push({ x: finalX, y: finalY });

    // Bin index = number of rights
    return { path: [{ x: startX, y: startY }, ...steps], bin: k };
  };

  // Launch logic
  const launchOne = () => {
    const { path, bin } = computeBallPath();
    setActiveBall({ path, bin, t: 0, seg: 0 });
  };

  // Update hist once a ball finishes
  const settleBall = (bin) => {
    setHist((h) => {
      const next = h.slice();
      next[bin] += 1;
      return next;
    });
    setDropped((d) => d + 1);
  };

  // Main draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#0f172a");
      bg.addColorStop(1, "#0b1220");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Title strip
      ctx.fillStyle = "rgba(30,41,59,0.7)";
      ctx.fillRect(0, 0, width, 48);
      ctx.font = "600 16px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#c7d2fe";
      ctx.fillText("Galton Board — Emergence of the Binomial/Normal", 20, 30);

      // Subtle grid behind board
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = "#93c5fd";
      for (let x = leftMargin; x <= width - rightMargin; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, topMargin - 20); ctx.lineTo(x, height - bottomMargin + 20); ctx.stroke();
      }
      for (let y = topMargin; y <= height - bottomMargin; y += 40) {
        ctx.beginPath(); ctx.moveTo(leftMargin - 20, y); ctx.lineTo(width - rightMargin + 20, y); ctx.stroke();
      }
      ctx.restore();

      // Draw pegs
      ctx.fillStyle = "#7dd3fc";
      ctx.shadowColor = "#7dd3fc";
      ctx.shadowBlur = 6;
      pegs.forEach((row) => {
        row.forEach(({ x, y }) => {
          ctx.beginPath();
          ctx.arc(x, y, pegRadius, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      ctx.shadowBlur = 0;

      // Draw funnel/top chute
      ctx.strokeStyle = "rgba(148,163,184,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 30, topMargin - 30);
      ctx.lineTo(width / 2 - 10, topMargin - 5);
      ctx.lineTo(width / 2 + 10, topMargin - 5);
      ctx.lineTo(width / 2 + 30, topMargin - 30);
      ctx.stroke();

      // Draw bins baseline
      const baseY = topMargin + rows * rowGap + 60;
      ctx.strokeStyle = "rgba(148,163,184,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftMargin, baseY);
      ctx.lineTo(width - rightMargin, baseY);
      ctx.stroke();

      // Histogram bars
      const maxCount = Math.max(1, ...hist);
      const barSpace = (width - leftMargin - rightMargin) / (rows + 1);
      const histTop = baseY - (bottomMargin - 30); // vertical space for bars

      hist.forEach((count, i) => {
        const cx = bins[i].x;
        const barWidth = Math.min(20, barSpace * 0.7);
        const h = (count / maxCount) * (baseY - histTop);
        const x = cx - barWidth / 2;
        const y = baseY - h;

        // Bar
        const g = ctx.createLinearGradient(0, y, 0, baseY);
        g.addColorStop(0, "rgba(99,102,241,0.9)");
        g.addColorStop(1, "rgba(59,130,246,0.6)");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, barWidth, h);

        // Tick label
        ctx.fillStyle = "rgba(203,213,225,0.9)";
        ctx.font = "11px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(i.toString(), cx, baseY + 14);
      });

      // Theoretical overlays
      if (showTheoretical || showNormalApprox) {
        // Curve baseline aligned with bars
        const n = rows;
        const pmf = binomialPMF(n, pRight);
        const mu = n * pRight;
        const sigma = Math.sqrt(n * pRight * (1 - pRight));

        // Scale curves to histogram height (match maxCount)
        const scaleY = (baseY - histTop) / Math.max(...pmf, 1 / (rows + 1));

        if (showTheoretical) {
          // Draw discrete points/lines for binomial pmf scaled to counts: pmf * dropped
          ctx.strokeStyle = "rgba(34,197,94,0.9)";
          ctx.fillStyle = "rgba(34,197,94,0.9)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          pmf.forEach((prob, k) => {
            const cx = bins[k].x;
            const y = baseY - prob * scaleY; // scaled to height; visually compare SHAPE
            if (k === 0) ctx.moveTo(cx, y);
            else ctx.lineTo(cx, y);
          });
          ctx.stroke();

          // small dots
          pmf.forEach((prob, k) => {
            const cx = bins[k].x;
            const y = baseY - prob * scaleY;
            ctx.beginPath();
            ctx.arc(cx, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        if (showNormalApprox && sigma > 0.0001) {
          // Smooth curve through bin positions
          ctx.strokeStyle = "rgba(250,204,21,0.9)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let xk = -0.25; xk <= n + 0.25; xk += 0.02) {
            // area under curve across bins is ~1; scale like pmf for shape comparison
            const pdf = normalPDF(xk, mu, sigma);
            // Heuristic scaling: normalized so max(pdf) ~ max(pmf) for visual overlay
            // Find binomial peak ~ at floor(mu)
            const peak = Math.max(...pmf);
            const peakPdf = normalPDF(mu, mu, sigma);
            const scaled = (peakPdf > 0 ? (pdf / peakPdf) * peak : pdf) * scaleY;
            const cx =
              bins[0].x + (bins[bins.length - 1].x - bins[0].x) * (xk / n);
            const y = baseY - scaled;
            if (xk === -0.25) ctx.moveTo(cx, y);
            else ctx.lineTo(cx, y);
          }
          ctx.stroke();
        }
      }

      // Trails (recent paths)
      if (showTrails && trails.length) {
        ctx.save();
        trails.forEach((path) => {
          ctx.beginPath();
          for (let i = 0; i < path.length; i++) {
            const { x, y } = path[i];
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = "rgba(96,165,250,0.25)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
        ctx.restore();
      }

      // Active ball animation
      if (activeBall) {
        const { path, seg, t } = activeBall;
        // Draw path so far lightly
        if (showTrails) {
          ctx.beginPath();
          for (let i = 0; i <= seg; i++) {
            const pt = path[i];
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.strokeStyle = "rgba(59,130,246,0.45)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Interpolate current position along current segment
        const a = path[seg];
        const b = path[Math.min(seg + 1, path.length - 1)];
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;

        // Ball glow
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#60a5fa";
        ctx.fillStyle = "#93c5fd";
        ctx.beginPath();
        ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Footer stats
      const n = rows;
      const mu = n * pRight;
      const sigma2 = n * pRight * (1 - pRight);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "13px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Rows: ${rows}  |  p(right): ${pRight.toFixed(2)}  |  Dropped: ${dropped}/${ballsToDrop}`, 20, height - 108);
      ctx.fillText(`Theoretical mean μ = n·p = ${mu.toFixed(2)}  |  variance σ² = n·p·(1-p) = ${sigma2.toFixed(2)}`, 20, height - 86);
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`Tip: Increase rows to watch the binomial shape approach a normal curve.`, 20, height - 64);
    };

    draw();
    // No loop here; we only draw in response to state changes or the animation loop below
  }, [pegs, bins, hist, rows, pRight, dropped, ballsToDrop, showTheoretical, showNormalApprox, showTrails, activeBall]);

  // Animate the active ball along its polyline
  useEffect(() => {
    if (!activeBall) return;
    const speed = 2; // segment progress per frame (t increment)
    const step = () => {
      setActiveBall((b) => {
        if (!b) return null;
        let { t, seg, path, bin } = b;
        let nt = t + speed * 0.016 * 60 / 60; // ~60fps normalized
        let nseg = seg;
        while (nt >= 1 && nseg < path.length - 2) {
          nt -= 1;
          nseg += 1;
        }
        if (nseg >= path.length - 2 && nt >= 1) {
          // Ball reached the end; settle
          // Save its trail
          setTrails((tr) => {
            const next = [...tr, path];
            // Keep only recent N trails to avoid memory blow-up
            if (next.length > 120) next.shift();
            return next;
          });
          settleBall(bin);
          return null;
        }
        return { ...b, t: nt, seg: nseg };
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [activeBall]);

  // Auto-launch controller
  useEffect(() => {
    if (!running) {
      if (launchTimerRef.current) {
        clearInterval(launchTimerRef.current);
        launchTimerRef.current = null;
      }
      return;
    }
    // If we've dropped all requested balls, stop
    if (dropped >= ballsToDrop) {
      setRunning(false);
      return;
    }
    // If no ball is currently active, launch one and schedule next checks
    if (!activeBall) launchOne();

    launchTimerRef.current = setInterval(() => {
      // Launch next when current is null and we still have quota
      setTimeout(() => {
        if (!activeBall && dropped < ballsToDrop) launchOne();
      }, 0);
    }, dropRateMs);

    return () => {
      if (launchTimerRef.current) {
        clearInterval(launchTimerRef.current);
        launchTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, dropped, ballsToDrop, dropRateMs, activeBall, rows, pRight]);

  // Reset
  const reset = () => {
    setRunning(false);
    setHist(Array(rows + 1).fill(0));
    setDropped(0);
    setActiveBall(null);
    setTrails([]);
  };

  // If rows changes, also reset histogram size to match
  useEffect(() => {
    setHist(Array(rows + 1).fill(0));
    setDropped(0);
    setActiveBall(null);
    setTrails([]);
  }, [rows]);

  // Draw loop trigger (simple): whenever anything changes, we redraw in the effect above

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-5xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-3 border-b border-slate-800/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="p-2 rounded-xl bg-blue-500/15 border border-blue-400/30"
              >
                <Beaker className="w-6 h-6 text-blue-300" />
              </motion.div>
              <h1 className="text-2xl font-semibold text-slate-100">
                Plinko: Exploring Randomness & Distributions
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs px-2 py-1 rounded-md bg-slate-800/70 border border-slate-700 text-slate-300">
                Physics Lab
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="p-4">
          <div className="rounded-xl border border-slate-700 bg-slate-950/60 shadow-inner p-2">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="w-full rounded-lg"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 pb-6 flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Rows */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
              <label className="text-sm text-slate-300">Rows: {rows}</label>
              <input
                type="range"
                min={6}
                max={18}
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Bias */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
              <label className="text-sm text-slate-300">
                p(right): {pRight.toFixed(2)}
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={pRight}
                onChange={(e) => setPRight(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="mt-1 text-xs text-slate-400">
                Left prob = { (1 - pRight).toFixed(2) }
              </div>
            </div>

            {/* Balls */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
              <label className="text-sm text-slate-300">
                Balls to drop: {ballsToDrop}
              </label>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={ballsToDrop}
                onChange={(e) => setBallsToDrop(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="mt-1 text-xs text-slate-400">
                Dropped: {dropped}
              </div>
            </div>

            {/* Drop rate */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
              <label className="text-sm text-slate-300">
                Drop speed: {dropRateMs} ms/ball
              </label>
              <input
                type="range"
                min={20}
                max={200}
                step={5}
                value={dropRateMs}
                onChange={(e) => setDropRateMs(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="mt-1 text-xs text-slate-400">
                Lower is faster
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-3">
            <Toggle
              label="Theoretical Binomial"
              checked={showTheoretical}
              onChange={setShowTheoretical}
              icon={<BarChart3 className="w-4 h-4" />}
            />
            <Toggle
              label="Normal Approx."
              checked={showNormalApprox}
              onChange={setShowNormalApprox}
              icon={<BarChart3 className="w-4 h-4" />}
            />
            <Toggle
              label="Trails"
              checked={showTrails}
              onChange={setShowTrails}
              icon={<BarChart3 className="w-4 h-4" />}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setRunning((r) => !r)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                running
                  ? "bg-yellow-500/20 border-yellow-400 text-yellow-200 hover:bg-yellow-500/25"
                  : "bg-emerald-500/20 border-emerald-400 text-emerald-200 hover:bg-emerald-500/25"
              }`}
            >
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {running ? "Pause" : "Start"}
            </button>

            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-rose-500/20 border-rose-400 text-rose-200 hover:bg-rose-500/25"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            <div className="text-xs text-slate-400 self-center">
              Tip: Try p=0.5 and increase rows to see a bell curve emerge.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small toggle pill */
function Toggle({ label, checked, onChange, icon }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`text-sm px-3 py-1.5 rounded-lg border transition flex items-center gap-2 ${
        checked
          ? "bg-sky-500/20 border-sky-400 text-sky-200"
          : "bg-slate-800/60 border-slate-600 text-slate-300 hover:border-slate-400"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
