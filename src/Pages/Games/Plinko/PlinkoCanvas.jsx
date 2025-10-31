import React, { useEffect, useRef } from "react";

export default function PlinkoCanvas(props) {
  const {
    width, height,
    topMargin, bottomMargin, leftMargin, rightMargin,
    pegs, bins, rowGap, baseY,
    hist, showTrails, trails,
    activeBall, setActiveBall,
    pmf, showTheoretical, showNormalApprox, rows, pRight, mu, sigma, pdfAt,
    dropped, ballsToDrop,
  } = props;

  const canvasRef = useRef(null);
  const pegRadius = 4, ballRadius = 5;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.clearRect(0, 0, width, height);
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

    // Subtle grid
    ctx.save(); ctx.globalAlpha = 0.08; ctx.strokeStyle = "#93c5fd";
    for (let x = leftMargin; x <= width - rightMargin; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, topMargin - 20); ctx.lineTo(x, height - bottomMargin + 20); ctx.stroke();
    }
    for (let y = topMargin; y <= height - bottomMargin; y += 40) {
      ctx.beginPath(); ctx.moveTo(leftMargin - 20, y); ctx.lineTo(width - rightMargin + 20, y); ctx.stroke();
    }
    ctx.restore();

    // Pegs
    ctx.fillStyle = "#7dd3fc"; ctx.shadowColor = "#7dd3fc"; ctx.shadowBlur = 6;
    pegs.forEach(row => row.forEach(({x,y}) => { ctx.beginPath(); ctx.arc(x,y,pegRadius,0,2*Math.PI); ctx.fill(); }));
    ctx.shadowBlur = 0;

    // Funnel
    ctx.strokeStyle = "rgba(148,163,184,0.6)"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width/2 - 30, topMargin - 30);
    ctx.lineTo(width/2 - 10, topMargin - 5);
    ctx.lineTo(width/2 + 10, topMargin - 5);
    ctx.lineTo(width/2 + 30, topMargin - 30);
    ctx.stroke();

    // Baseline for bars
    ctx.strokeStyle = "rgba(148,163,184,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(leftMargin, baseY); ctx.lineTo(width - rightMargin, baseY); ctx.stroke();

    // Trails
    if (showTrails && trails.length) {
      ctx.save();
      trails.forEach(path => {
        ctx.beginPath();
        path.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
        ctx.strokeStyle = "rgba(96,165,250,0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      ctx.restore();
    }

    // Active ball
    if (activeBall) {
      const { path, seg, t } = activeBall;
      if (showTrails) {
        ctx.beginPath();
        for (let i = 0; i <= seg; i++) {
          const pt = path[i];
          i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y);
        }
        ctx.strokeStyle = "rgba(59,130,246,0.45)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      const a = path[seg], b = path[Math.min(seg+1, path.length-1)];
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      ctx.shadowBlur = 18; ctx.shadowColor = "#60a5fa";
      ctx.fillStyle = "#93c5fd";
      ctx.beginPath(); ctx.arc(x, y, ballRadius, 0, 2*Math.PI); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Footer stats (mirrors your on-canvas UI habit). :contentReference[oaicite:5]{index=5}
    const sigma2 = rows * pRight * (1 - pRight);
    ctx.fillStyle = "#cbd5e1"; ctx.font = "13px Inter, system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`Rows: ${rows}  |  p(right): ${pRight.toFixed(2)}  |  Dropped: ${dropped}/${ballsToDrop}`, 20, height - 108);
    ctx.fillText(`Theoretical μ = n·p = ${mu.toFixed(2)}  |  σ² = n·p·(1-p) = ${sigma2.toFixed(2)}`, 20, height - 86);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`Tip: Increase rows to watch the binomial shape approach a normal curve.`, 20, height - 64);

    // Overlays
    const maxProb = Math.max(...pmf, 1/(rows+1));
    const histTop = baseY - (bottomMargin - 30);
    const scaleY = (baseY - histTop) / maxProb;

    if (showTheoretical) {
      ctx.strokeStyle = "rgba(34,197,94,0.9)"; ctx.fillStyle = "rgba(34,197,94,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath();
      pmf.forEach((prob, k) => {
        const cx = bins[k].x;
        const y = baseY - prob * scaleY;
        k ? ctx.lineTo(cx, y) : ctx.moveTo(cx, y);
      });
      ctx.stroke();
      pmf.forEach((prob, k) => { const cx = bins[k].x; const y = baseY - prob * scaleY; ctx.beginPath(); ctx.arc(cx, y, 2.5, 0, 2*Math.PI); ctx.fill(); });
    }

    if (showNormalApprox && sigma > 0.0001) {
      const peak = Math.max(...pmf);
      const peakPdf = pdfAt(mu) || 1;
      ctx.strokeStyle = "rgba(250,204,21,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let xk = -0.25; xk <= rows + 0.25; xk += 0.02) {
        const pdf = pdfAt(xk);
        const scaled = (pdf / peakPdf) * peak * scaleY;
        const cx = bins[0].x + (bins[bins.length - 1].x - bins[0].x) * (xk / rows);
        const y = baseY - scaled;
        xk === -0.25 ? ctx.moveTo(cx, y) : ctx.lineTo(cx, y);
      }
      ctx.stroke();
    }
  }, [
    width, height, leftMargin, rightMargin, topMargin, bottomMargin,
    pegs, bins, baseY, hist, showTrails, trails, activeBall,
    pmf, showTheoretical, showNormalApprox, rows, pRight, mu, sigma, dropped, ballsToDrop
  ]);

  return <canvas ref={canvasRef} width={width} height={height} className="w-full rounded-lg" />;
}
