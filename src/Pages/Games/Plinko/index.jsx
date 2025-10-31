import React from "react";
import { motion } from "framer-motion";
import { Beaker } from "lucide-react";
import PlinkoBoard from "./PlinkoBoard";

export default function PlinkoPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-5xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-3 border-b border-slate-800/70">
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
            <div className="text-xs px-2 py-1 rounded-md bg-slate-800/70 border border-slate-700 text-slate-300 ml-auto">
              Physics Lab
            </div>
          </div>
        </div>
        <PlinkoBoard />
      </div>
    </div>
  );
}
