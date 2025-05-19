"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "@/components/layouts/sidebar";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Play,
  Clock,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Lock,
  CheckCircle2,
  Globe,
  BarChart,
  Award,
  Users,
} from "lucide-react";
import { use } from "react";

interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  thumbnail_path: string;
  created_at: string;
  learning_objectives: string[];
  learning_requirements: string[];
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
}

interface Section {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
}

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed: boolean;
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

interface CourseDetailPageProps {
  params: Promise<{
    courseId: string;
  }>;
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { courseId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [courseProgressPercent, setCourseProgressPercent] = useState(0);
  const supabase = createClientComponentClient();

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

        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .single();

        if (enrollmentError && enrollmentError.code !== "PGRST116") {
          throw enrollmentError;
        }
        setEnrollment(enrollmentData);

        setExpandedSections(new Set(sectionsData.map((s) => s.id)));

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
        toast.error("Failed to load course");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [courseId, user, router, supabase]);

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
  }, [lessons, userProgress]);

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

  const getThumbnailUrl = (path: string) => {
    const { data } = supabase.storage
      .from("course-thumbnails")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  const handleEnroll = async () => {
    try {
      const { error } = await supabase.from("enrollments").insert({
        user_id: user?.id,
        course_id: courseId,
      });

      if (error) throw error;

      const { data: enrollmentData } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user?.id)
        .eq("course_id", courseId)
        .single();

      setEnrollment(enrollmentData);
      toast.success("Successfully enrolled in the course!");
    } catch (error) {
      console.error("Error enrolling in course:", error);
      toast.error("Failed to enroll in course");
    }
  };

  const handleStartLearning = () => {
    if (!lessons.length) return;
    router.push(`/dashboard/lessons/videos/${courseId}/${lessons[0].id}`);
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

  if (!course) {
    return (
      <div className="flex min-h-screen bg-[#0A0A0A]">
        <Sidebar />
        <div className="flex-1 ml-[280px] flex items-center justify-center">
          <p className="text-gray-400">Course not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <div className="flex-1 ml-[280px]">
        {/* Course Header Banner */}
        <div className="relative w-full h-[400px] bg-gradient-to-r from-purple-900/50 to-pink-900/50">
          {course.thumbnail_path && (
            <Image
              src={getThumbnailUrl(course.thumbnail_path)}
              alt={course.title}
              fill
              className="object-cover opacity-20"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
          <div className="container mx-auto px-4 h-full flex items-end pb-12 relative z-10">
            <div className="max-w-4xl">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-bold text-white mb-6"
            >
              {course.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
                className="text-xl text-gray-300 mb-8 line-clamp-2"
            >
              {course.description}
            </motion.p>
              <div className="flex items-center gap-6 text-gray-300">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-400" />
                  <span>{course.language}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-purple-400" />
                  <span>{course.level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span>
                    {Math.round(
                      lessons.reduce((acc, l) => acc + l.duration, 0) / 60
                    )}{" "}
                    min total
              </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <span>{lessons.length} lessons</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-12">
          <div className="flex gap-8">
            {/* Main Content */}
            <div className="w-2/3">
              {/* Course Overview */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">
                  What you&apos;ll learn
                </h2>
                <div className="grid grid-cols-2 gap-4 p-6 bg-gray-900/50 rounded-2xl border border-gray-800/50">
                  {course.learning_objectives.length > 0 ? (
                    course.learning_objectives.map((objective, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-purple-400 mt-1" />
                        <span className="text-gray-300">{objective}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-gray-400 text-center py-4">
                      No learning objectives specified
                    </div>
                  )}
                </div>
              </div>

              {/* Requirements */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Requirements
                </h2>
                <div className="grid grid-cols-2 gap-4 p-6 bg-gray-900/50 rounded-2xl border border-gray-800/50">
                  {course.learning_requirements.length > 0 ? (
                    course.learning_requirements.map((requirement, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-purple-400 mt-1" />
                        <span className="text-gray-300">{requirement}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-gray-400 text-center py-4">
                      No requirements specified
                    </div>
                  )}
                </div>
              </div>

              {/* Course Content */}
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Course Content
                  </h2>
                  <div className="text-sm text-gray-400">
                    {sections.length} sections • {lessons.length} lessons •{" "}
                    {Math.round(
                      lessons.reduce((acc, l) => acc + l.duration, 0) / 60
                    )}{" "}
                    min total
                  </div>
                </div>
                <div className="space-y-4 bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden">
                  {sections.map((section, sectionIndex) => (
                    <div key={section.id}>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {expandedSections.has(section.id) ? (
                            <ChevronDown className="w-5 h-5 text-purple-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-purple-400" />
                          )}
                          <div>
                            <h3 className="font-medium text-white">
                              Section {sectionIndex + 1}: {section.title}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {section.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          {
                            lessons.filter((l) => l.section_id === section.id)
                              .length
                          }{" "}
                          lessons
                        </div>
                      </button>

                      {expandedSections.has(section.id) && (
                        <div className="border-t border-gray-800/50">
                          {lessons
                            .filter((l) => l.section_id === section.id)
                            .map((lesson, lessonIndex) => (
                              <button
                key={lesson.id}
                                onClick={() => {
                                  if (enrollment) {
                  router.push(
                    `/dashboard/lessons/videos/${courseId}/${lesson.id}`
                                    );
                                  } else {
                                    toast.error(
                                      "Please enroll in the course first"
                                    );
                                  }
                                }}
                                className="w-full flex items-center gap-4 p-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 last:border-b-0"
              >
                                <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center">
                                  <Play className="w-4 h-4 text-purple-400" />
                  </div>
                                <div className="flex-1 flex items-center justify-between">
                                  <div className="text-left">
                                    <h4 className="text-gray-300 font-medium">
                                      {sectionIndex + 1}.{lessonIndex + 1}{" "}
                      {lesson.title}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                      {lesson.description}
                    </p>
                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-400">
                                      {Math.round(lesson.duration / 60)} min
                                    </span>
                                    {!enrollment && (
                                      <Lock className="w-4 h-4 text-gray-600" />
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Course Sidebar */}
            <div className="w-1/3">
              <div className="sticky top-8">
                <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden">
                  {course.thumbnail_path && (
                    <div className="relative w-full h-48">
                      <Image
                        src={getThumbnailUrl(course.thumbnail_path)}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    {enrollment ? (
                      <>
                        <div className="flex items-center gap-2 mb-6">
                          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${courseProgressPercent}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-purple-400">
                            {courseProgressPercent}% Complete
                          </span>
                        </div>
                        <button
                          onClick={handleStartLearning}
                          className="w-full py-4 px-6 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors mb-6"
                        >
                          Continue Learning
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleEnroll}
                        className="w-full py-4 px-6 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors mb-6"
                      >
                        Enroll Now
                      </button>
                    )}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-gray-300">
                        <Award className="w-5 h-5 text-purple-400" />
                        <span>Certificate of completion</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-300">
                        <Clock className="w-5 h-5 text-purple-400" />
                        <span>
                          {Math.round(
                            lessons.reduce((acc, l) => acc + l.duration, 0) / 60
                          )}{" "}
                          minutes of content
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-300">
                        <Users className="w-5 h-5 text-purple-400" />
                        <span>Access to community</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-300">
                        <Globe className="w-5 h-5 text-purple-400" />
                        <span>Available in {course.language}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
