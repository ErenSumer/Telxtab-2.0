import { useEffect, useState, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuth } from "@/context/AuthContext";

export const useStudyTimer = () => {
  const [startTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  // Update elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(timer);
      // Save study time when component unmounts
      if (user) {
        const secondsStudied = Math.floor((Date.now() - startTime) / 1000);
        supabase
          .rpc("increment_study_hours", {
            p_user_id: user.id,
            p_seconds_studied: secondsStudied,
          })
          .then(({ error }) => {
            if (error) {
              console.error("Error updating study hours:", error);
            }
          });
      }
    };
  }, [startTime, user]);

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return {
      hours,
      minutes,
      seconds: remainingSeconds,
      formatted: `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`,
    };
  }, []);

  return {
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
  };
};
