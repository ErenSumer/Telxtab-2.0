"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/components/layouts/admin-sidebar";
import InteractiveCourseForm from "@/components/admin/InteractiveCourseForm";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  Video,
  BookOpen,
  Eye,
  EyeOff,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";
import { Database } from "@/types/supabase";

interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  thumbnail_path: string;
  created_at: string;
  is_public: boolean;
  lesson_count?: number;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  video_path: string;
  duration: number;
  order_index: number;
}

interface CourseWithStats extends Course {
  lessons: { count: number }[];
}

export default function AdminVideosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    const fetchCourses = async () => {
      try {
        const { data: coursesData, error: coursesError } = await supabase.from(
          "courses"
        ).select(`
            *,
            lessons:lessons(count)
          `);

        if (coursesError) throw coursesError;

        const coursesWithStats = (coursesData as CourseWithStats[]).map(
          (course) => ({
            ...course,
            lesson_count: course.lessons[0].count,
          })
        );

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
  }, [user, router, supabase]);



  const handleDeleteCourse = async (courseId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this course? This will also delete all associated lessons and exercises."
      )
    ) {
      return;
    }

    try {
      // First, get all lessons to delete their videos
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("video_path")
        .eq("course_id", courseId);

      // Delete all lesson videos
      if (lessonsData) {
        const videoPaths = lessonsData.map((lesson) => lesson.video_path);
        await supabase.storage.from("lesson-videos").remove(videoPaths);
      }

      // Get course thumbnail path
      const { data: courseData } = await supabase
        .from("courses")
        .select("thumbnail_path")
        .eq("id", courseId)
        .single();

      // Delete course thumbnail
      if (courseData?.thumbnail_path) {
        await supabase.storage
          .from("course-thumbnails")
          .remove([courseData.thumbnail_path]);
      }

      // Delete course and its lessons
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (error) throw error;

      setCourses(courses.filter((course) => course.id !== courseId));
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
        setLessons([]);
      }
      toast.success("Course deleted successfully");
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this lesson? This will also delete all associated exercises."
      )
    ) {
      return;
    }

    try {
      // Get lesson video path
      const { data: lessonData } = await supabase
        .from("lessons")
        .select("video_path")
        .eq("id", lessonId)
        .single();

      // Delete lesson video
      if (lessonData?.video_path) {
        await supabase.storage
          .from("lesson-videos")
          .remove([lessonData.video_path]);
      }

      // Delete lesson
      const { error } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;

      setLessons(lessons.filter((lesson) => lesson.id !== lessonId));
      toast.success("Lesson deleted successfully");
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Failed to delete lesson");
    }
  };

  const toggleCourseVisibility = async (
    courseId: string,
    currentVisibility: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({ is_public: !currentVisibility })
        .eq("id", courseId);

      if (error) throw error;

      // Update the courses state
      setCourses(
        courses.map((course) =>
          course.id === courseId
            ? { ...course, is_public: !currentVisibility }
            : course
        )
      );

      toast.success(
        `Course ${!currentVisibility ? "made public" : "made private"}`
      );
    } catch (error) {
      console.error("Error toggling course visibility:", error);
      toast.error("Failed to update course visibility");
    }
  };

  const handleCourseSuccess = async () => {
    const { data: coursesData, error: coursesError } = await supabase.from(
      "courses"
    ).select(`
        *,
        lessons:lessons(count)
      `);

    if (coursesError) throw coursesError;

    const coursesWithStats = (coursesData as CourseWithStats[]).map(
      (course) => ({
        ...course,
        lesson_count: course.lessons[0].count,
      })
    );

    setCourses(coursesWithStats);
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesLanguage =
      selectedLanguage === "all" || course.language === selectedLanguage;
    const matchesLevel =
      selectedLevel === "all" || course.level === selectedLevel;
    return matchesSearch && matchesLanguage && matchesLevel;
  });

  const uniqueLanguages = Array.from(
    new Set(courses.map((course) => course.language))
  );
  const uniqueLevels = Array.from(
    new Set(courses.map((course) => course.level))
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0A0A0A]">
        <AdminSidebar />
        <div className="flex-1 ml-[280px] flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <div className="flex-1 ml-[280px]">
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Video Courses
                </h1>
                <p className="text-gray-400">Manage your video courses</p>
              </div>
              <button
                onClick={() => setIsAddingCourse(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Course
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white hover:bg-gray-800 transition-colors"
                >
                  <Filter className="w-5 h-5" />
                  Filters
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      isFilterOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-lg z-10">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Language
                        </label>
                        <select
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="all">All Languages</option>
                          {uniqueLanguages.map((language) => (
                            <option key={language} value={language}>
                              {language}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Level
                        </label>
                        <select
                          value={selectedLevel}
                          onChange={(e) => setSelectedLevel(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="all">All Levels</option>
                          {uniqueLevels.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Course List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredCourses.map((course) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="relative bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800 p-6 cursor-pointer hover:border-purple-500/50 transition-colors"
                    onClick={() =>
                      router.push(`/dashboard/admin/videos/${course.id}`)
                    }
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {course.title}
                        </h3>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full">
                            {course.level}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium bg-gray-800 text-gray-400 rounded-full">
                            {course.language}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCourseVisibility(course.id, course.is_public);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            course.is_public
                              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                          }`}
                          title={
                            course.is_public ? "Make Private" : "Make Public"
                          }
                        >
                          {course.is_public ? (
                            <>
                              <Eye className="w-5 h-5" />
                              <span className="text-sm">Public</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-5 h-5" />
                              <span className="text-sm">Private</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse(course.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="aspect-video relative mb-4">
                      {course.thumbnail_path ? (
                        <Image
                          src={
                            supabase.storage
                              .from("course-thumbnails")
                              .getPublicUrl(course.thumbnail_path).data
                              .publicUrl
                          }
                          alt={course.title}
                          fill
                          className="object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <BookOpen className="w-4 h-4" />
                      <span>{course.lesson_count} lessons</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Interactive Course Form Modal */}
            {isAddingCourse && (
              <InteractiveCourseForm
                onClose={() => setIsAddingCourse(false)}
                onSuccess={handleCourseSuccess}
              />
            )}

            {/* Lessons Section */}
            {selectedCourse && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800 p-6"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Lessons for {selectedCourse.title}
                  </h2>
                  <button
                    onClick={() =>
                      router.push(
                        `/dashboard/admin/lessons/${selectedCourse.id}/new`
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Lesson
                  </button>
                </div>

                <div className="space-y-4">
                  <AnimatePresence>
                    {lessons.map((lesson) => (
                      <motion.div
                        key={lesson.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700 p-6"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                              {lesson.title}
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                              {lesson.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <div className="flex items-center gap-1">
                                <Video className="w-4 h-4" />
                                <span>
                                  {Math.round(lesson.duration / 60)} min
                                </span>
                              </div>
                              <span>Order: {lesson.order_index}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/dashboard/admin/lessons/${lesson.id}/edit`
                                )
                              }
                              className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
