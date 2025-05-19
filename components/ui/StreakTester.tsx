import { useStreak } from "@/hooks/useStreak";

export const StreakTester = () => {
  const { testStreak } = useStreak();

  if (!testStreak) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-gray-900/90 backdrop-blur-lg rounded-xl border border-gray-800">
      <h3 className="text-white font-bold mb-2">Streak Tester</h3>
      <div className="flex gap-2">
        <button
          onClick={() => testStreak(0)}
          className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
        >
          Today
        </button>
        <button
          onClick={() => testStreak(1)}
          className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
        >
          Tomorrow
        </button>
        <button
          onClick={() => testStreak(2)}
          className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30"
        >
          2 Days
        </button>
        <button
          onClick={() => testStreak(-1)}
          className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
        >
          Yesterday
        </button>
      </div>
    </div>
  );
};
