import { Flame } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";

export const StreakDisplay = () => {
  const { streak, loading } = useStreak();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="h-12 w-12 bg-gray-800 rounded-lg"></div>
          <div className="h-4 w-16 bg-gray-800 rounded"></div>
        </div>
        <div className="h-8 w-24 bg-gray-800 rounded mb-2"></div>
        <div className="h-4 w-32 bg-gray-800 rounded"></div>
      </div>
    );
  }

  // If no streak data, show initial state
  if (!streak) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-lg bg-orange-500/10">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-400">Best: 0</span>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-1">0 Days</h3>
        <p className="text-sm text-gray-400">Current Streak</p>
        <div className="mt-4">
          <div className="h-1 bg-gray-800 rounded-full">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 w-0" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-800 hover:border-orange-500/50 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-lg bg-orange-500/10">
          <Flame className="w-6 h-6 text-orange-400" />
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-sm text-gray-400">
            Best: {streak.longest_streak}
          </span>
        </div>
      </div>
      <h3 className="text-2xl font-bold text-white mb-1">
        {streak.current_streak} Days
      </h3>
      <p className="text-sm text-gray-400">Current Streak</p>
      <div className="mt-4">
        <div className="h-1 bg-gray-800 rounded-full">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-500"
            style={{
              width: `${Math.min(
                ((streak.current_streak || 0) / (streak.longest_streak || 1)) *
                  100,
                100
              )}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
