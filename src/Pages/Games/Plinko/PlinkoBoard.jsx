import React from "react";
import PlinkoCanvas from "./PlinkoCanvas";
import Histogram from "./Histogram";
import Controls from "./Controls";
import usePlinkoSim from "./hooks/usePlinkoSim";

export default function PlinkoBoard() {
  const sim = usePlinkoSim(); // rows, pRight, hist, dropped, running, actions, geometry,...

  return (
    <div className="px-6 pb-6 flex flex-col gap-4">
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 shadow-inner p-2">
        <PlinkoCanvas {...sim} />
      </div>

      <Histogram
        hist={sim.hist}
        bins={sim.bins}
        baseY={sim.baseY}
        histHeight={sim.bottomMargin - 30}
      />

      <Controls {...sim} />
    </div>
  );
}
