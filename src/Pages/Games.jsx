import { useState } from "react";
import { motion } from "framer-motion";
import { Card, Button, Icons } from "../components/ui.jsx";

// Games
import ProjectileGame from "./Games/ProjectileGame.jsx";
import BalanceBeamGame from "./Games/RotationalBalance.jsx";
import PlinkoGame from "./Games/Plinko/index.jsx";

export default function Games({ onBack }) {
  const [activeGameId, setActiveGameId] = useState(null);

  const gamesList = [
    {
      id: 1,
      title: "Projectile Target Game",
      description: "Launch projectiles and hit the target!",
    },

    {
      id: 2,
      title: "Rotational Balance Challenge",
      description: "Balance rotating objects using physics principles.",  
    },

    {
      id: 3, 
      title: "Plinko Game",
      description: "Drop balls through a pegboard and see where they land.",
    }
    // Future games can be added here
  ];

  // Map each game ID to its React component
  const gameComponents = {
    1: ProjectileGame,
    2: BalanceBeamGame, 
    3: PlinkoGame
  };

  const ActiveGameComponent = activeGameId ? gameComponents[activeGameId] : null;

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-[Inter]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mt-12 mb-8"
      >
        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
          PhysicsLab
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            {" "}Games Hub
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-8">
          Play physics-based mini-games and challenges.
        </p>
        <Button onClick={onBack}>
          <Icons name="ArrowRight" className="mr-2 rotate-180" /> Back to Home
        </Button>
      </motion.div>

      {/* Games Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
        className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {gamesList.map((game) => {
          const hasComponent = !!gameComponents[game.id];
          const isActive = activeGameId === game.id;

          return (
            <motion.div
              key={game.id}
              variants={{
                hidden: { opacity: 0, scale: 0.92 },
                visible: { opacity: 1, scale: 1 },
              }}
            >
              <Card className="h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{game.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {game.description}
                  </p>
                </div>
                <div className="mt-4">
                  {hasComponent ? (
                    <Button
                      className="w-full"
                      onClick={() =>
                        setActiveGameId(isActive ? null : game.id)
                      }
                    >
                      {isActive ? "Hide Game" : "Play Game"}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Coming Soon
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Active Game Display */}
      {ActiveGameComponent && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mt-12 w-full max-w-6xl"
        >
          <ActiveGameComponent key={activeGameId} />
        </motion.div>
      )}
    </div>
  );
}
