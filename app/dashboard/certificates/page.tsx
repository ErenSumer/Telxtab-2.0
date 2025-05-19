"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "@/components/layouts/sidebar";
import { toast } from "sonner";
import Image from "next/image";
import { Award, CheckCircle, Clock, ChevronRight } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  thumbnail_path: string;
  created_at: string;
}

interface CompletedCourse extends Course {
  completed_at: string;
  certificate_id?: string;
  total_lessons: number;
  lessons_completed: number;
  completion_percentage: number;
  is_completed: boolean;
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>(
    []
  );
  const [inProgressCourses, setInProgressCourses] = useState<CompletedCourse[]>(
    []
  );
  const [generatingCertificate, setGeneratingCertificate] = useState<
    string | null
  >(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    const fetchCompletedCourses = async () => {
      try {
        // Get all courses
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*, lessons(count)");

        if (courseError) throw courseError;

        // Get user progress for all courses
        const { data: progressData, error: progressError } = await supabase
          .from("user_progress")
          .select("*")
          .eq("user_id", user.id);

        if (progressError) throw progressError;

        // Calculate course completion stats
        const coursesWithStatus = await Promise.all(
          courseData.map(async (course) => {
            // Get all lessons for this course
            const { data: lessonData, error: lessonError } = await supabase
              .from("lessons")
              .select("id")
              .eq("course_id", course.id);

            if (lessonError) throw lessonError;

            const totalLessons = lessonData.length;
            const lessonsCompleted = progressData.filter(
              (progress) =>
                progress.course_id === course.id && progress.completed
            ).length;

            const completionPercentage =
              totalLessons > 0 ? (lessonsCompleted / totalLessons) * 100 : 0;

            // Get the latest completion date
            const latestCompletion = progressData
              .filter(
                (progress) =>
                  progress.course_id === course.id && progress.completed
              )
              .sort(
                (a, b) =>
                  new Date(b.last_watched_at).getTime() -
                  new Date(a.last_watched_at).getTime()
              )[0];

            return {
              ...course,
              total_lessons: totalLessons,
              lessons_completed: lessonsCompleted,
              completion_percentage: completionPercentage,
              completed_at: latestCompletion?.last_watched_at || null,
              is_completed: completionPercentage === 100,
            };
          })
        );

        // Filter completed and in-progress courses
        setCompletedCourses(
          coursesWithStatus.filter((course) => course.is_completed)
        );
        setInProgressCourses(
          coursesWithStatus.filter(
            (course) => !course.is_completed && course.lessons_completed > 0
          )
        );
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast.error("Failed to load certificates");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompletedCourses();
  }, [user, router, supabase]);

  const getThumbnailUrl = (path: string) => {
    const { data } = supabase.storage
      .from("course-thumbnails")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  const handleGenerateCertificate = async (
    courseId: string,
    courseTitle: string
  ) => {
    if (generatingCertificate === courseId) return;

    try {
      setGeneratingCertificate(courseId);

      // In a real application, this would generate a PDF certificate
      // For now, we'll simulate a delay and then show a download
      setTimeout(() => {
        // Create a certificate-like canvas element
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 1200;
        canvas.height = 800;

        if (ctx) {
          // Set background
          ctx.fillStyle = "#0A0A0A";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Add border
          ctx.strokeStyle = "#9333EA";
          ctx.lineWidth = 10;
          ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

          // Add title
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 48px Arial";
          ctx.textAlign = "center";
          ctx.fillText("Certificate of Completion", canvas.width / 2, 150);

          // Add text
          ctx.font = "26px Arial";
          ctx.fillText("This is to certify that", canvas.width / 2, 250);

          // Add name
          ctx.font = "bold 42px Arial";
          ctx.fillText(user?.email || "Student", canvas.width / 2, 320);

          // Add more text
          ctx.font = "26px Arial";
          ctx.fillText("has successfully completed", canvas.width / 2, 400);

          // Add course name
          ctx.font = "bold 36px Arial";
          ctx.fillStyle = "#9333EA";
          ctx.fillText(courseTitle, canvas.width / 2, 470);

          // Add date
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "24px Arial";
          ctx.fillText(
            `Completed on: ${new Date().toLocaleDateString()}`,
            canvas.width / 2,
            550
          );

          // Add signature line
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2 - 150, 650);
          ctx.lineTo(canvas.width / 2 + 150, 650);
          ctx.strokeStyle = "#444444";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.font = "22px Arial";
          ctx.fillText("Authorized Signature", canvas.width / 2, 680);
        }

        // Convert to data URL and trigger download
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `${courseTitle.replace(/\s+/g, "_")}_Certificate.png`;
        link.href = dataUrl;
        link.click();

        toast.success("Certificate generated successfully!");
        setGeneratingCertificate(null);
      }, 1500);
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error("Failed to generate certificate");
      setGeneratingCertificate(null);
    }
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

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <div className="flex-1 ml-[280px] p-8">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-2">Certificates</h1>
            <p className="text-gray-400">
              View and download certificates for your completed courses
            </p>
          </header>

          {completedCourses.length === 0 && inProgressCourses.length === 0 ? (
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-12 text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-gray-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                No Certificates Yet
              </h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Complete courses to earn certificates. Track your progress and
                start learning today.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                Explore Courses
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Completed Courses */}
              {completedCourses.length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">
                    Completed Courses
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {completedCourses.map((course) => (
                      <div
                        key={course.id}
                        className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden flex flex-col"
                      >
                        <div className="relative h-48 bg-gray-800">
                          {course.thumbnail_path && (
                            <Image
                              src={getThumbnailUrl(course.thumbnail_path)}
                              alt={course.title}
                              fill
                              className="object-cover"
                            />
                          )}
                          <div className="absolute top-4 right-4 bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>Completed</span>
                          </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="text-xl font-bold text-white mb-2">
                            {course.title}
                          </h3>
                          <div className="text-sm text-gray-400 mb-4">
                            Completed on{" "}
                            {new Date(course.completed_at).toLocaleDateString()}
                          </div>
                          <div className="mb-5 text-gray-400 text-sm">
                            {course.lessons_completed} / {course.total_lessons}{" "}
                            lessons
                          </div>
                          <div className="mt-auto">
                            <button
                              onClick={() =>
                                handleGenerateCertificate(
                                  course.id,
                                  course.title
                                )
                              }
                              disabled={generatingCertificate === course.id}
                              className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:bg-purple-500/50"
                            >
                              {generatingCertificate === course.id ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>Generating...</span>
                                </>
                              ) : (
                                <>
                                  <Award className="w-5 h-5" />
                                  <span>Get Certificate</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* In-Progress Courses */}
              {inProgressCourses.length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">
                    Courses in Progress
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {inProgressCourses.map((course) => (
                      <div
                        key={course.id}
                        className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden flex flex-col"
                      >
                        <div className="relative h-48 bg-gray-800">
                          {course.thumbnail_path && (
                            <Image
                              src={getThumbnailUrl(course.thumbnail_path)}
                              alt={course.title}
                              fill
                              className="object-cover"
                            />
                          )}
                          <div className="absolute top-4 right-4 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>In Progress</span>
                          </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="text-xl font-bold text-white mb-2">
                            {course.title}
                          </h3>
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm text-gray-400">
                              {Math.round(course.completion_percentage)}%
                              completed
                            </span>
                            <span className="text-sm text-gray-400">
                              {course.lessons_completed} /{" "}
                              {course.total_lessons} lessons
                            </span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full mb-5 overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{
                                width: `${course.completion_percentage}%`,
                              }}
                            />
                          </div>
                          <div className="mt-auto">
                            <button
                              onClick={() =>
                                router.push(
                                  `/dashboard/lessons/videos/${course.id}`
                                )
                              }
                              className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                              <ChevronRight className="w-5 h-5" />
                              <span>Continue Learning</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
 