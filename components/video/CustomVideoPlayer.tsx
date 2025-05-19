"use client";

import { useEffect, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  SkipForward,
  SkipBack,
  Minimize2,
} from "lucide-react";

interface CustomVideoPlayerProps {
  videoUrl: string;
  courseId: string;
  lessonId: string;
  userId: string;
  onError?: (error: Error) => void;
  onProgressUpdate?: (progress: {
    lessonId: string;
    progress_percent: number;
    completed: boolean;
  }) => void;
}

export default function CustomVideoPlayer({
  videoUrl,
  courseId,
  lessonId,
  userId,
  onError,
  onProgressUpdate,
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClientComponentClient();

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  const updateProgress = async (progress: number) => {
    try {
      // Only update database every 5% progress to reduce API calls
      if (progress % 5 !== 0 && progress !== 100) return;

      // Check if there's an existing progress record
      const { data: existingProgress } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("lesson_id", lessonId)
        .single();

      if (existingProgress) {
        // Only update if new progress is higher than existing
        if (progress > existingProgress.progress_percent) {
          await supabase
            .from("user_progress")
            .update({
              progress_percent: progress,
              last_watched_at: new Date().toISOString(),
              completed: progress === 100,
            })
            .eq("user_id", userId)
            .eq("lesson_id", lessonId);

          // Notify parent component about the progress update
          if (onProgressUpdate) {
            onProgressUpdate({
              lessonId,
              progress_percent: progress,
              completed: progress === 100,
            });
          }
        }
      } else {
        // Create new progress record
        await supabase.from("user_progress").insert({
          user_id: userId,
          course_id: courseId,
          lesson_id: lessonId,
          progress_percent: progress,
          completed: progress === 100,
        });

        // Notify parent component about the progress update
        if (onProgressUpdate) {
          onProgressUpdate({
            lessonId,
            progress_percent: progress,
            completed: progress === 100,
          });
        }
      }
    } catch (error) {
      console.error("Error updating progress:", error);
      // Don't show toast on every update to avoid spam
      if (progress === 100) {
        toast.error("Failed to update progress");
      }
    }
  };

  const handleVideoEnd = async () => {
    if (videoRef.current) {
      setIsPlaying(false);
      await updateProgress(100);

      // Award XP for completing the lesson
      try {
        await supabase.rpc("increment_user_xp", {
          p_user_id: userId,
          p_xp_amount: 100,
        });

        // Show XP notification
        toast.success("Lesson completed! +100 XP", {
          description: "Keep learning to earn more XP!",
          duration: 5000,
        });
      } catch (error) {
        console.error("Error awarding XP:", error);
      toast.success("Lesson completed!");
      }

      // Notify parent component
      if (onProgressUpdate) {
        onProgressUpdate({
          lessonId,
          progress_percent: 100,
          completed: true,
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const videoDuration = videoRef.current.duration;

      setCurrentTime(current);

      const progress = Math.round((current / videoDuration) * 100);
      setProgressPercent(progress);

      // Only call updateProgress occasionally to reduce API calls
      if (progress % 5 === 0 || progress === 100) {
        updateProgress(progress);
      }
    }
  };

  const handleVideoClick = () => {
    togglePlay();
    showControls();
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 1;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / progressRef.current.offsetWidth;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        videoRef.current.currentTime - 10
      );
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration,
        videoRef.current.currentTime + 10
      );
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Make the container element fullscreen to keep our custom controls
      const playerContainer = playerContainerRef.current;
      if (playerContainer) {
        playerContainer
          .requestFullscreen()
          .then(() => {
            setIsFullscreen(true);
          })
          .catch((err) => {
            console.error(
              `Error attempting to enable fullscreen: ${err.message}`
            );
          });
      }
    } else {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
        })
        .catch((err) => {
          console.error(`Error attempting to exit fullscreen: ${err.message}`);
        });
    }
  };

  const showControls = () => {
    setIsControlsVisible(true);

    // Clear any existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Set a new timeout to hide controls
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setIsControlsVisible(false);
      }
    }, 3000);
  };

  useEffect(() => {
    const video = videoRef.current;

    // Listen for fullscreen change events
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    if (video) {
      video.addEventListener("ended", handleVideoEnd);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("loadedmetadata", () => {
        setDuration(video.duration);
      });
      video.addEventListener("play", () => setIsPlaying(true));
      video.addEventListener("pause", () => setIsPlaying(false));

      // Show controls on mouse move
      const container = video.parentElement;
      if (container) {
        container.addEventListener("mousemove", showControls);
      }

      return () => {
        video.removeEventListener("ended", handleVideoEnd);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("loadedmetadata", () => {});
        video.removeEventListener("play", () => {});
        video.removeEventListener("pause", () => {});

        if (container) {
          container.removeEventListener("mousemove", showControls);
        }

        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange
        );
      };
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [videoRef.current, isPlaying]);

  return (
    <div
      ref={playerContainerRef}
      className={`relative w-full bg-[#0A0A0A] group ${
        isFullscreen ? "fixed inset-0 z-50 w-screen h-screen" : ""
      }`}
    >
      <div
        className={`${
          isFullscreen ? "w-full h-full" : "aspect-video max-w-[1200px] mx-auto"
        } relative`}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className={`${
            isFullscreen ? "w-screen h-screen object-contain" : "w-full h-full"
          } cursor-pointer`}
          onClick={handleVideoClick}
          onError={(e) => {
            console.error("Error loading video:", e);
            onError?.(new Error("Failed to load video"));
          }}
        />

        {/* Play/Pause Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="w-20 h-20 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <Play className="w-10 h-10 text-white" />
            </button>
          )}
        </div>

        {/* Custom Controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-2 transition-opacity duration-300 ${isControlsVisible || !isPlaying ? "opacity-100" : "opacity-0"}`}
        >
          {/* Progress Bar */}
          <div
            ref={progressRef}
            className="h-1 bg-gray-600 rounded-full mb-4 cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-purple-500 rounded-full relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full"></div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-purple-400 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </button>

              {/* Skip Backward 10s */}
              <button
                onClick={skipBackward}
                className="text-white hover:text-purple-400 transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Skip Forward 10s */}
              <button
                onClick={skipForward}
                className="text-white hover:text-purple-400 transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-purple-400 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 accent-purple-500"
                />
              </div>

              {/* Time Display */}
              <div className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Settings Button */}
              <button className="text-white hover:text-purple-400 transition-colors">
                <Settings className="w-5 h-5" />
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-purple-400 transition-colors"
                aria-label={
                  isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                }
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
