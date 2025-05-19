"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "@/components/layouts/sidebar";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Play, Clock, BookOpen, Star } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  thumbnail_url: string;
  lesson_count: number;
  duration: number;
}

export default function VideoLessonsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }

    const fetchCourses = async () => {
      try {
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select(
            `
            *,
            lessons:lessons(count)
          `
          )
          .eq("is_public", true);

        if (coursesError) throw coursesError;

        // Calculate total duration for each course
        const { data: lessonsData, error: lessonsError } = await supabase
          .from("lessons")
          .select("course_id, duration");

        if (lessonsError) throw lessonsError;

        const coursesWithStats = coursesData.map((course: any) => {
          const courseLessons = lessonsData.filter(
            (lesson) => lesson.course_id === course.id
          );
          const totalDuration = courseLessons.reduce(
            (sum, lesson) => sum + (lesson.duration || 0),
            0
          );

          return {
            ...course,
            lesson_count: course.lessons[0].count,
            duration: totalDuration,
          };
        });

        setCourses(coursesWithStats);
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast.error("Failed to load courses");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchCourses();
    }
  }, [user, loading, router, supabase]);

  if (loading || isLoading) {
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
      <div className="flex-1 ml-[280px]">
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Video Courses
              </h1>
              <p className="text-gray-400">Choose a course to start learning</p>
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() =>
                    router.push(`/dashboard/lessons/videos/${course.id}`)
                  }
                  className="group cursor-pointer relative bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800 hover:border-purple-500/50 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Course Thumbnail */}
                  <div className="aspect-video relative">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-purple-500/10 flex items-center justify-center">
                        <Play className="w-12 h-12 text-purple-500" />
                      </div>
                    )}
                  </div>

                  {/* Course Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full">
                        {course.level}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-800 text-gray-400 rounded-full">
                        {course.language}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-2">
                      {course.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{course.lesson_count} lessons</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{Math.round(course.duration / 60)} min</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>4.8</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
