import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuth } from "@/context/AuthContext";

interface StreakData {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  created_at: string;
  updated_at: string;
}

// For testing purposes only
const TESTING = false; // Set to false in production

export const useStreak = () => {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testDate, setTestDate] = useState<Date | null>(() => {
    if (TESTING) {
      const storedDate = localStorage.getItem("test_date");
      return storedDate ? new Date(storedDate) : null;
    }
    return null;
  });
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const isUpdatingRef = useRef(false);

  const checkAndUpdateStreak = async () => {
    if (!user || isUpdatingRef.current) {
      setLoading(false);
      return;
    }

    const lastCheck = localStorage.getItem("lastStreakCheck");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If we've already checked today, don't update
    if (lastCheck) {
      const lastCheckDate = new Date(lastCheck);
      lastCheckDate.setHours(0, 0, 0, 0);

      if (lastCheckDate.getTime() === today.getTime()) {
        // Just fetch the current streak without updating
        const { data: currentStreak } = await supabase
          .from("streaks")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (currentStreak) {
          setStreak(currentStreak);
        }
        setLoading(false);
        return;
      }
    }

    // Update the streak
    await updateStreak();

    // Store today's date as the last check
    localStorage.setItem("lastStreakCheck", today.toISOString());
  };

  const updateStreak = async (currentTestDate?: Date | null) => {
    isUpdatingRef.current = true;

    try {
      // First, try to get the current streak
      const { data: existingStreak, error: fetchError } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      let newStreak = 1; // Default for new streaks
      let newLongestStreak = 1;

      if (existingStreak) {
        const lastActive = new Date(existingStreak.updated_at);
        // Use test date if in testing mode
        const now =
          TESTING && (currentTestDate || testDate)
            ? (currentTestDate || testDate)!
            : new Date();

        // Set times to midnight for accurate day comparison
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Convert lastActive to start of its day for comparison
        const lastActiveDay = new Date(lastActive);
        lastActiveDay.setHours(0, 0, 0, 0);

        if (lastActiveDay.getTime() === today.getTime()) {
          console.log(
            "Already active today, keeping streak:",
            existingStreak.current_streak
          );
          setStreak(existingStreak);
          setLoading(false);
          isUpdatingRef.current = false;
          return;
        }

        if (lastActiveDay.getTime() === yesterday.getTime()) {
          // If last active yesterday, increment streak
          newStreak = existingStreak.current_streak + 1;
          console.log("Active yesterday, incrementing streak to:", newStreak);
        } else {
          // If not active yesterday or today, reset streak
          newStreak = 1;
          console.log("Streak reset to 1");
        }

        newLongestStreak = Math.max(newStreak, existingStreak.longest_streak);
      }

      // Update or insert the streak record
      const { data, error } = await supabase
        .from("streaks")
        .upsert(
          {
            user_id: user.id,
            current_streak: newStreak,
            longest_streak: newLongestStreak,
            ...(TESTING && (currentTestDate || testDate)
              ? {
                  updated_at: (currentTestDate || testDate)!.toISOString(),
                }
              : {}),
          },
          {
            onConflict: "user_id",
          }
        )
        .select()
        .single();

      if (error) throw error;

      setStreak(data);
    } catch (error) {
      console.error("Error updating streak:", error);
    } finally {
      setLoading(false);
      isUpdatingRef.current = false;
    }
  };

  // Check streak on mount and when user changes
  useEffect(() => {
    if (user) {
      checkAndUpdateStreak();
    }
  }, [user]);

  // Set up daily check
  useEffect(() => {
    if (!user) return;

    const checkDaily = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const timeUntilTomorrow = tomorrow.getTime() - now.getTime();

      // Schedule the next check for tomorrow
      const timer = setTimeout(() => {
        checkAndUpdateStreak();
        // Set up the next check
        checkDaily();
      }, timeUntilTomorrow);

      return () => clearTimeout(timer);
    };

    // Start the daily check cycle
    const cleanup = checkDaily();

    return () => {
      cleanup();
    };
  }, [user]);

  // For testing purposes only
  const testStreak = async (daysToAdd: number) => {
    if (!TESTING) return;
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    // Update localStorage
    localStorage.setItem("test_date", date.toISOString());
    // Update state to trigger re-render
    setTestDate(date);
  };

  return {
    streak,
    loading,
    testStreak: TESTING ? testStreak : undefined,
  };
};
