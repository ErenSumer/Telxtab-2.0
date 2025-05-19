import {
  Rank,
  getRankByXp,
  getNextRank,
  getXpProgress,
} from "@/utils/rankSystem";
import { motion } from "framer-motion";

interface RankBadgeProps {
  xp: number;
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function RankBadge({
  xp,
  showProgress = false,
  size = "md",
}: RankBadgeProps) {
  const currentRank = getRankByXp(xp);
  const nextRank = getNextRank(xp);
  const progress = getXpProgress(xp);

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  return (
    <div className="flex flex-col gap-2">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`relative inline-flex items-center gap-2 rounded-lg font-medium ${sizeClasses[size]} overflow-hidden`}
        style={{
          background: `linear-gradient(135deg, ${currentRank.color}15, ${currentRank.color}30)`,
          color: currentRank.color,
          border: `1px solid ${currentRank.color}40`,
        }}
      >
        {/* Animated background effect */}
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              `linear-gradient(90deg, transparent, ${currentRank.color}40, transparent)`,
              `linear-gradient(90deg, transparent, ${currentRank.color}20, transparent)`,
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Glow effect */}
        <div
          className="absolute inset-0"
          style={{
            boxShadow: `0 0 15px ${currentRank.color}30`,
          }}
        />

        <span className="relative z-10">{currentRank.icon}</span>
        <span className="relative z-10">{currentRank.name}</span>
      </motion.div>

      {showProgress && nextRank && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{progress.current} XP</span>
            <span>{progress.next} XP</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800/50 backdrop-blur-sm">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full relative"
              style={{
                background: `linear-gradient(90deg, ${currentRank.color}, ${currentRank.color}80)`,
              }}
            >
              {/* Animated shine effect */}
              <motion.div
                className="absolute inset-0"
                animate={{
                  background: [
                    `linear-gradient(90deg, transparent, ${currentRank.color}40, transparent)`,
                    `linear-gradient(90deg, transparent, ${currentRank.color}20, transparent)`,
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.div>
          </div>
          <p className="text-xs text-gray-400">
            Next Rank: {nextRank.name} ({nextRank.minXp - xp} XP left)
          </p>
        </div>
      )}
    </div>
  );
}
