import React from "react";
import { Play, Pause, RotateCcw, BarChart3 } from "lucide-react";

const Toggle = ({ label, checked, onChange, icon }) => (
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

export default function Controls(props) {
  const {
    rows, setRows, pRight, setPRight,
    ballsToDrop, setBallsToDrop, dropRateMs, setDropRateMs,
    running, setRunning, reset,
    showTheoretical, setShowTheoretical,
    showNormalApprox, setShowNormalApprox,
    showTrails, setShowTrails,
    dropped
  } = props;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label={`Rows: ${rows}`}>
          <input type="range" min={6} max={18} value={rows} onChange={(e)=>setRows(+e.target.value)} className="w-full accent-blue-500" />
        </Card>
        <Card label={`p(right): ${pRight.toFixed(2)}`}>
          <input type="range" min={0} max={1} step={0.01} value={pRight} onChange={(e)=>setPRight(+e.target.value)} className="w-full accent-purple-500" />
          <div className="mt-1 text-xs text-slate-400">Left prob = {(1-pRight).toFixed(2)}</div>
        </Card>
        <Card label={`Balls to drop: ${ballsToDrop}`}>
          <input type="range" min={10} max={1000} step={10} value={ballsToDrop} onChange={(e)=>setBallsToDrop(+e.target.value)} className="w-full accent-emerald-500" />
          <div className="mt-1 text-xs text-slate-400">Dropped: {dropped}</div>
        </Card>
        <Card label={`Drop speed: ${dropRateMs} ms/ball`}>
          <input type="range" min={20} max={200} step={5} value={dropRateMs} onChange={(e)=>setDropRateMs(+e.target.value)} className="w-full accent-amber-500" />
          <div className="mt-1 text-xs text-slate-400">Lower is faster</div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Toggle label="Theoretical Binomial" checked={showTheoretical} onChange={setShowTheoretical} icon={<BarChart3 className="w-4 h-4" />} />
        <Toggle label="Normal Approx." checked={showNormalApprox} onChange={setShowNormalApprox} icon={<BarChart3 className="w-4 h-4" />} />
        <Toggle label="Trails" checked={showTrails} onChange={setShowTrails} icon={<BarChart3 className="w-4 h-4" />} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setRunning((r)=>!r)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
            running
              ? "bg-yellow-500/20 border-yellow-400 text-yellow-200 hover:bg-yellow-500/25"
              : "bg-emerald-500/20 border-emerald-400 text-emerald-200 hover:bg-emerald-500/25"
          }`}
        >
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {running ? "Pause" : "Start"}
        </button>

        <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-rose-500/20 border-rose-400 text-rose-200 hover:bg-rose-500/25">
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>

        <div className="text-xs text-slate-400 self-center">
          Tip: Try p=0.5 and increase rows to see a bell curve emerge.
        </div>
      </div>
    </div>
  );
}

function Card({ label, children }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
      <label className="text-sm text-slate-300">{label}</label>
      {children}
    </div>
  );
}
