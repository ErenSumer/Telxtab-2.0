"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "@/components/layouts/sidebar";
import { toast } from "sonner";
import {
  Play,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Clock,
  BookOpen,
  Lock,
  Award,
  MessageSquare,
  Trophy,
  PartyPopper,
  BrainCircuit,
  ChevronUp,
} from "lucide-react";
import { use } from "react";
import MatchingExercise from "@/components/exercises/MatchingExercise";
import MultipleChoiceExercise from "@/components/exercises/MultipleChoiceExercise";
import CustomVideoPlayer from "@/components/video/CustomVideoPlayer";
import dynamic from "next/dynamic";
import {
  generateMultipleChoiceQuestions,
  QuestionResponse,
} from "@/services/ai";

// Dynamically import ReactConfetti to avoid SSR issues
const ReactConfetti = dynamic(() => import("react-confetti"), { ssr: false });

interface Exercise {
  id: string;
  lesson_id: string;
  type: string;
  question: string;
  options?: string[];
  correct_answer?: string;
  correct_pairs?: { word: string; translation: string }[];
  explanation: string;
  order_index: number;
}

interface Lesson {
  id: string;
  course_id: string;
  section_id: string;
  title: string;
  description: string;
  video_path: string;
  duration: number;
  order_index: number;
  topic?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  thumbnail_path: string;
  created_at: string;
}

interface Section {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
}

interface UserProgress {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  completed: boolean;
  progress_percent: number;
  last_watched_at: string;
}

interface LessonPageProps {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
}

export default function LessonPage({ params }: LessonPageProps) {
  const { courseId, lessonId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [courseProgressPercent, setCourseProgressPercent] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });
  const supabase = createClientComponentClient();

  // Add a new state for course content
  const [courseContent, setCourseContent] = useState<
    {
      id: string;
      type: "lesson" | "exercise";
      data: Lesson | Exercise;
      order_index: number;
    }[]
  >([]);

  // Add a state for the current content item
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [currentContent, setCurrentContent] = useState<{
    id: string;
    type: "lesson" | "exercise";
    data: Lesson | Exercise;
  } | null>(null);

  // Add new states for AI generated exercises
  const [aiExercises, setAiExercises] = useState<QuestionResponse[]>([]);
  const [currentAiExerciseIndex, setCurrentAiExerciseIndex] = useState(0);
  const [isGeneratingExercises, setIsGeneratingExercises] = useState(false);
  const [userXp, setUserXp] = useState(0);
  const [showExercises, setShowExercises] = useState(false);

  const getVideoUrl = (videoPath: string) => {
    const { data } = supabase.storage
      .from("lesson-videos")
      .getPublicUrl(videoPath);
    return data.publicUrl;
  };

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        const { data: sectionsData, error: sectionsError } = await supabase
          .from("sections")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true });

        if (sectionsError) throw sectionsError;
        setSections(sectionsData);

        const { data: lessonsData, error: lessonsError } = await supabase
          .from("lessons")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true });

        if (lessonsError) throw lessonsError;
        setLessons(lessonsData);

        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select("*")
          .eq("id", lessonId)
          .single();

        if (lessonError) throw lessonError;
        setLesson(lessonData);

        // When directly viewing a lesson, always set content type to "lesson"
        // Since we are in the [lessonId] route, we know this is a lesson page
        const lessonContent = {
          id: lessonId,
          type: "lesson" as const,
          data: lessonData,
          order_index: lessonData.order_index,
        };

        setCourseContent([lessonContent]);
        setCurrentContentIndex(0);
        setCurrentContent(lessonContent);

        // Fetch all exercises for the course
        const { data: exercisesData, error: exercisesError } = await supabase
          .from("exercises")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true });

        if (exercisesError) throw exercisesError;

        // Filter exercises to get the ones relevant to the current lesson
        const currentLessonExercises =
          exercisesData
            ?.filter((ex) => ex.lesson_id === lessonId)
            .sort((a, b) => a.order_index - b.order_index) || [];

        setExercises(currentLessonExercises);

        if (lessonData?.section_id) {
          setExpandedSections(new Set([lessonData.section_id]));
        }

        // Fetch user progress for this course
        const { data: progressData, error: progressError } = await supabase
          .from("user_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("course_id", courseId);

        if (progressError) throw progressError;
        setUserProgress(progressData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load course content");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [courseId, lessonId, user, router, supabase]);

  // Update window size for confetti
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const handleResize = () => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Calculate overall course progress whenever lessons or userProgress changes
  useEffect(() => {
    if (lessons.length === 0) return;

    // Calculate total lessons completed or partially watched
    let totalProgressPercent = 0;

    lessons.forEach((lesson) => {
      const progress = userProgress.find((p) => p.lesson_id === lesson.id);
      if (progress) {
        if (progress.completed) {
          totalProgressPercent += 100;
        } else {
          totalProgressPercent += progress.progress_percent;
        }
      }
    });

    // Calculate average progress
    const overallPercent = Math.round(totalProgressPercent / lessons.length);
    setCourseProgressPercent(overallPercent);

    // Show confetti and completion modal when course is 100% complete
    if (overallPercent === 100) {
      setShowConfetti(true);
      setShowCompletionModal(true);

      // Hide confetti after 5 seconds
      setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
    }
  }, [lessons, userProgress]);

  // Load AI exercises
  useEffect(() => {
    if (lesson?.topic && user) {
      fetchUserXp();
      loadAiExercises();
    }
  }, [lesson, user]);

  const fetchUserXp = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setUserXp(data.xp || 0);
    } catch (error) {
      console.error("Error fetching user XP:", error);
    }
  };

  const loadAiExercises = async () => {
    if (!lesson?.topic) return;

    try {
      setIsGeneratingExercises(true);
      const questions = await generateMultipleChoiceQuestions(
        lesson.topic,
        lesson.description || "",
        5 // Generate 5 questions
      );

      setAiExercises(questions);
      setIsGeneratingExercises(false);
    } catch (error) {
      console.error("Error generating AI exercises:", error);
      setIsGeneratingExercises(false);
    }
  };

  const handleExerciseComplete = async (isCorrect: boolean) => {
    if (!user || !isCorrect) return;

    try {
      // Increment XP by 10 if answer is correct
      const newXp = userXp + 10;

      const { error } = await supabase
        .from("profiles")
        .update({ xp: newXp })
        .eq("id", user.id);

      if (error) throw error;

      setUserXp(newXp);
      toast.success("+10 XP earned!");

      // Move to next exercise or complete
      if (currentAiExerciseIndex < aiExercises.length - 1) {
        setCurrentAiExerciseIndex((prevIndex) => prevIndex + 1);
      } else {
        // All exercises completed
        toast.success("All exercises completed! Great job!");
      }
    } catch (error) {
      console.error("Error updating XP:", error);
      toast.error("Failed to update XP");
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleAnswerSubmit = async () => {
    if (!selectedAnswer || !exercises[currentExerciseIndex]) return;

    const correct =
      selectedAnswer === exercises[currentExerciseIndex].correct_answer;
    setIsCorrect(correct);
    setShowExplanation(true);

    try {
      await supabase.from("exercise_attempts").insert({
        user_id: user?.id,
        exercise_id: exercises[currentExerciseIndex].id,
        attempt: selectedAnswer,
        is_correct: correct,
      });

      if (correct && exercises) {
        const { data: attempts } = await supabase
          .from("exercise_attempts")
          .select("exercise_id, is_correct")
          .eq("user_id", user?.id)
          .in(
            "exercise_id",
            exercises.map((ex) => ex.id)
          );

        const allCorrect = exercises.every((ex) =>
          attempts?.some(
            (attempt) => attempt.exercise_id === ex.id && attempt.is_correct
          )
        );

        if (allCorrect) {
          await supabase.from("user_progress").upsert({
            user_id: user?.id,
            course_id: courseId,
            lesson_id: lessonId,
            completed: true,
          });
        }
      }
    } catch (error) {
      console.error("Error saving attempt:", error);
    }
  };

  const handleNextExercise = () => {
    if (!exercises) return;

    const currentIndex = exercises.findIndex(
      (ex) => ex.id === exercises[currentExerciseIndex].id
    );
    const nextIndex = currentIndex + 1;

    if (nextIndex < exercises.length) {
      setCurrentExerciseIndex(nextIndex);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setIsCorrect(null);
    }
  };

  const handleMatchingComplete = async (isCorrect: boolean) => {
    if (!exercises[currentExerciseIndex]) return;

    try {
      await supabase.from("exercise_attempts").insert({
        user_id: user?.id,
        exercise_id: exercises[currentExerciseIndex].id,
        attempt: "matching_completed",
        is_correct: isCorrect,
      });

      if (isCorrect && exercises) {
        const { data: attempts } = await supabase
          .from("exercise_attempts")
          .select("exercise_id, is_correct")
          .eq("user_id", user?.id)
          .in(
            "exercise_id",
            exercises.map((ex) => ex.id)
          );

        const allCorrect = exercises.every((ex) =>
          attempts?.some(
            (attempt) => attempt.exercise_id === ex.id && attempt.is_correct
          )
        );

        if (allCorrect) {
          await supabase.from("user_progress").upsert({
            user_id: user?.id,
            course_id: courseId,
            lesson_id: lessonId,
            completed: true,
          });
        }
      }

      setTimeout(handleNextExercise, 1500);
    } catch (error) {
      console.error("Error saving attempt:", error);
    }
  };

  // Helper function to check if a lesson is completed
  const isLessonCompleted = (lessonId: string) => {
    return userProgress.some(
      (progress) => progress.lesson_id === lessonId && progress.completed
    );
  };

  // Helper function to get the progress percentage for a lesson
  const getLessonProgress = (lessonId: string) => {
    const progress = userProgress.find(
      (progress) => progress.lesson_id === lessonId
    );
    return progress ? progress.progress_percent : 0;
  };

  // Helper function to check if a lesson is in progress (started but not completed)
  const isLessonInProgress = (lessonId: string) => {
    const progress = userProgress.find(
      (progress) => progress.lesson_id === lessonId
    );
    return progress && progress.progress_percent > 0 && !progress.completed;
  };

  // Add a function to handle progress updates from the video player
  const handleProgressUpdate = (progressData: {
    lessonId: string;
    progress_percent: number;
    completed: boolean;
  }) => {
    const { lessonId, progress_percent, completed } = progressData;

    // Update the userProgress state to reflect changes immediately
    setUserProgress((prev) => {
      // Check if we already have a progress entry for this lesson
      const existingProgressIndex = prev.findIndex(
        (p) => p.lesson_id === lessonId
      );

      if (existingProgressIndex >= 0) {
        // Update existing progress
        const newProgress = [...prev];
        newProgress[existingProgressIndex] = {
          ...newProgress[existingProgressIndex],
          progress_percent,
          completed,
        };
        return newProgress;
      } else {
        // Add new progress entry
        return [
          ...prev,
          {
            id: `temp-${lessonId}`, // Temporary ID until refresh
            user_id: user?.id || "",
            course_id: courseId,
            lesson_id: lessonId,
            progress_percent,
            completed,
            last_watched_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ];
      }
    });
  };

  // Close the completion modal
  const handleCloseCompletionModal = () => {
    setShowCompletionModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0A0A0A]">
        <Sidebar />
        <div className="flex-1 ml-[280px] flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!lesson || !course) {
    return (
      <div className="flex min-h-screen bg-[#0A0A0A]">
        <Sidebar />
        <div className="flex-1 ml-[280px] flex items-center justify-center">
          <p className="text-gray-400">Lesson not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <div className="flex-1 ml-[280px]">
        {/* Confetti celebration when course is completed */}
        {showConfetti && (
          <ReactConfetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={500}
            colors={["#9333ea", "#c026d3", "#7e22ce", "#d946ef", "#f0abfc"]}
          />
        )}

        {/* Course Completion Modal */}
        {showCompletionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-[#0A0A0A] p-8 rounded-xl border border-gray-800 max-w-md w-full mx-4 shadow-xl animate-fadeIn">
              <div className="text-center">
                <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Congratulations!
                </h2>
                <p className="text-gray-300 mb-6">
                  You&apos;ve completed the &quot;{course?.title}&quot; course!
                </p>
                <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <PartyPopper className="w-5 h-5 text-purple-400" />
                    <p className="text-purple-300 font-medium">
                      Achievement Unlocked
                    </p>
                  </div>
                  <p className="text-gray-300">
                    You&apos;ve earned a certificate of completion!
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
                    onClick={() =>
                      router.push(`/dashboard/lessons/videos/${courseId}`)
                    }
                  >
                    View Course
                  </button>
                  <button
                    className="w-full py-3 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    onClick={() => router.push("/dashboard/certificates")}
                  >
                    <Award className="w-4 h-4" />
                    Get Certificate
                  </button>
                  <button
                    className="text-gray-400 hover:text-white mt-2"
                    onClick={handleCloseCompletionModal}
                  >
                    Continue Learning
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content (Video or Exercise) */}
        {currentContent?.type === "lesson" ? (
          // Video Player Section
          <div className="relative w-full bg-gradient-to-b from-purple-900/20 to-black">
            {lesson?.video_path ? (
              <CustomVideoPlayer
                videoUrl={getVideoUrl(lesson.video_path)}
                courseId={courseId}
                lessonId={lessonId}
                userId={user?.id || ""}
                onProgressUpdate={handleProgressUpdate}
                onError={(error) => {
                  console.error("Error loading video:", error);
                  toast.error("Failed to load video");
                }}
              />
            ) : (
              <div className="aspect-video max-w-[1200px] mx-auto flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No video available</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Exercise Section
          <div className="max-w-[1200px] mx-auto px-8 py-10">
            <div className="bg-gradient-to-b from-purple-900/20 to-gray-900/50 rounded-2xl border border-gray-800/50 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Practice Exercise
                </h2>
                <div className="text-gray-400">
                  {currentExerciseIndex + 1} of {exercises.length}
                </div>
              </div>

              {exercises[currentExerciseIndex]?.type === "matching" ? (
                <MatchingExercise
                  question={exercises[currentExerciseIndex].question}
                  correctPairs={
                    exercises[currentExerciseIndex].correct_pairs || []
                  }
                  onComplete={handleMatchingComplete}
                />
              ) : (
                <div className="space-y-6">
                  <p className="text-lg text-gray-300">
                    {exercises[currentExerciseIndex]?.question}
                  </p>

                  {exercises[currentExerciseIndex]?.type ===
                    "multiple_choice" && (
                    <div className="space-y-3">
                      {exercises[currentExerciseIndex]?.options?.map(
                        (option, index) => (
                          <button
                            key={index}
                            onClick={() =>
                              !showExplanation && setSelectedAnswer(option)
                            }
                            className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                              selectedAnswer === option
                                ? showExplanation
                                  ? isCorrect
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                                  : "bg-purple-500/20 text-purple-400"
                                : "bg-gray-800/50 text-gray-300 hover:bg-gray-800"
                            }`}
                          >
                            {option}
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {showExplanation && (
                    <div className="p-4 rounded-lg bg-gray-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        {isCorrect ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <X className="w-5 h-5 text-red-400" />
                        )}
                        <p className="text-gray-400">
                          {exercises[currentExerciseIndex]?.explanation}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    {!showExplanation ? (
                      <button
                        onClick={handleAnswerSubmit}
                        disabled={!selectedAnswer}
                        className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit Answer
                      </button>
                    ) : (
                      <button
                        onClick={handleNextExercise}
                        className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                      >
                        Next Exercise
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <main className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Main Content - Lesson Info */}
            <div className="w-2/3">
              {/* Lesson Info */}
              <div className="mb-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {currentContent?.type === "lesson"
                        ? (currentContent.data as Lesson).title
                        : `Exercise: ${
                            (currentContent?.data as Exercise)?.type ===
                            "multiple_choice"
                              ? "Multiple Choice"
                              : (currentContent?.data as Exercise)?.type ===
                                  "matching"
                                ? "Matching"
                                : "Fill in the Blank"
                          }`}
                    </h1>
                    <p className="text-gray-400">
                      {currentContent?.type === "lesson"
                        ? (currentContent.data as Lesson).description
                        : (currentContent?.data as Exercise)?.question}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors">
                      <MessageSquare className="w-5 h-5" />
                      <span>Ask a Question</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-gray-400">
                  {currentContent?.type === "lesson" && (
                    <>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <span>
                          {Math.round(
                            (currentContent.data as Lesson).duration / 60
                          )}{" "}
                          minutes
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        <span>
                          Section{" "}
                          {sections.findIndex(
                            (s) =>
                              s.id ===
                              (currentContent.data as Lesson).section_id
                          ) + 1}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    <span>Certificate available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Content Sidebar */}
            <div className="w-1/3">
              <div className="sticky top-8">
                <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-white">
                        Course Content
                      </h3>
                      <div className="text-sm text-gray-400">
                        {sections.length} sections • {lessons.length} lessons
                      </div>
                    </div>

                    {/* Course Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">
                          Course Progress
                        </span>
                        <span className="text-sm font-medium text-purple-400">
                          {courseProgressPercent}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-300"
                          style={{ width: `${courseProgressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                      {sections.map((section, sectionIndex) => (
                        <div key={section.id} className="space-y-2">
                          <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-800/50 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {expandedSections.has(section.id) ? (
                                <ChevronDown className="w-5 h-5 text-purple-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-purple-400" />
                              )}
                              <div>
                                <h4 className="font-medium text-white">
                                  Section {sectionIndex + 1}: {section.title}
                                </h4>
                                <p className="text-sm text-gray-400">
                                  {section.description}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm text-gray-400">
                              {
                                lessons.filter(
                                  (l) => l.section_id === section.id
                                ).length
                              }{" "}
                              lessons
                            </span>
                          </button>

                          {expandedSections.has(section.id) && (
                            <div className="pl-11 space-y-1">
                              {lessons
                                .filter((l) => l.section_id === section.id)
                                .map((l) => {
                                  // Find this lesson in courseContent to get its index
                                  const contentIndex = courseContent.findIndex(
                                    (item) =>
                                      item.type === "lesson" && item.id === l.id
                                  );

                                  return (
                                    <button
                                      key={l.id}
                                      onClick={() =>
                                        router.push(
                                          `/dashboard/lessons/videos/${courseId}/${l.id}`
                                        )
                                      }
                                      className={`w-full flex items-center gap-3 p-3 text-left rounded-xl transition-colors ${
                                        l.id === lessonId
                                          ? "bg-purple-500/20 text-purple-400"
                                          : contentIndex < currentContentIndex
                                            ? "text-gray-300 hover:bg-gray-800/50"
                                            : "text-gray-400 hover:bg-gray-800/50"
                                      }`}
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center">
                                        {isLessonCompleted(l.id) ? (
                                          <Check className="w-4 h-4 text-green-400" />
                                        ) : isLessonInProgress(l.id) ? (
                                          <div className="relative">
                                            <Clock className="w-4 h-4 text-yellow-400" />
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 rounded-full overflow-hidden">
                                              <div
                                                className="h-full bg-yellow-400"
                                                style={{
                                                  width: `${getLessonProgress(l.id)}%`,
                                                }}
                                              />
                                            </div>
                                          </div>
                                        ) : (
                                          <Play className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="truncate">{l.title}</p>
                                        <p className="text-xs text-gray-500">
                                          {Math.round(l.duration / 60)} min
                                          {isLessonInProgress(l.id) && (
                                            <span className="ml-2 text-yellow-400">
                                              {getLessonProgress(l.id)}%
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                      {!isLessonCompleted(l.id) &&
                                        !isLessonInProgress(l.id) &&
                                        contentIndex > currentContentIndex && (
                                          <Lock className="w-4 h-4 text-gray-600" />
                                        )}
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Exercises Section */}
        {lesson && (
          <div className="max-w-5xl mx-auto px-4 mt-12 mb-16">
            <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">
                    Practice Exercises
                  </h2>
                </div>
                <button
                  onClick={() => setShowExercises(!showExercises)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                >
                  {showExercises ? "Hide Exercises" : "Show Exercises"}
                  {showExercises ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {showExercises && (
                <div className="space-y-8">
                  {isGeneratingExercises ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
                      <p className="text-gray-400">
                        Generating exercises based on{" "}
                        {lesson.topic || "this lesson"}...
                      </p>
                    </div>
                  ) : aiExercises.length > 0 ? (
                    <div>
                      <div className="text-sm text-gray-400 mb-4 flex items-center justify-between">
                        <span>
                          Question {currentAiExerciseIndex + 1} of{" "}
                          {aiExercises.length}
                        </span>
                        <span>Your XP: {userXp}</span>
                      </div>

                      <MultipleChoiceExercise
                        question={aiExercises[currentAiExerciseIndex].question}
                        options={aiExercises[currentAiExerciseIndex].options}
                        correctAnswer={
                          aiExercises[currentAiExerciseIndex].correctAnswer
                        }
                        explanation={
                          aiExercises[currentAiExerciseIndex].explanation
                        }
                        onComplete={handleExerciseComplete}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400">
                        No exercises available for this lesson.
                      </p>
                      <button
                        onClick={loadAiExercises}
                        className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        Generate Exercises
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
