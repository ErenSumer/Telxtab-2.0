"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/components/layouts/admin-sidebar";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Video, BookOpen, X, Upload } from "lucide-react";
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
}

interface Section {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
}

interface Lesson {
  id: string;
  section_id: string;
  title: string;
  description: string;
  video_path: string;
  duration: number;
  order_index: number;
  topic?: string;
}

export default function CourseEditPageClient({
  courseId,
}: {
  courseId: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [newSection, setNewSection] = useState({
    title: "",
    description: "",
  });
  const [newLesson, setNewLesson] = useState({
    title: "",
    description: "",
    topic: "",
    video: null as File | null,
    uploadProgress: 0,
    isUploading: false,
  });
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch course
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        // Fetch sections
        const { data: sectionsData, error: sectionsError } = await supabase
          .from("sections")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index");

        if (sectionsError) throw sectionsError;
        setSections(sectionsData);

        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from("lessons")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index");

        if (lessonsError) throw lessonsError;
        setLessons(lessonsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load course data");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, router, supabase, courseId]);

  useEffect(() => {
    console.log("isAddingLesson:", isAddingLesson);
    console.log("selectedSection:", selectedSection);
  }, [isAddingLesson, selectedSection]);

  const handleDeleteSection = async (sectionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this section? This will also delete all associated lessons."
      )
    ) {
      return;
    }

    try {
      // Delete section and its lessons
      const { error } = await supabase
        .from("sections")
        .delete()
        .eq("id", sectionId);

      if (error) throw error;

      setSections(sections.filter((section) => section.id !== sectionId));
      setLessons(lessons.filter((lesson) => lesson.section_id !== sectionId));
      toast.success("Section deleted successfully");
    } catch (error) {
      console.error("Error deleting section:", error);
      toast.error("Failed to delete section");
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

  const handleAddSection = async () => {
    if (!newSection.title.trim()) {
      toast.error("Section title is required");
      return;
    }

    try {
      const { data: sectionData, error } = await supabase
        .from("sections")
        .insert([
          {
            course_id: courseId,
            title: newSection.title,
            description: newSection.description,
            order_index: sections.length,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setSections([...sections, sectionData]);
      setNewSection({ title: "", description: "" });
      setIsAddingSection(false);
      toast.success("Section created successfully");
    } catch (error) {
      console.error("Error creating section:", error);
      toast.error("Failed to create section");
    }
  };

  const handleVideoUpload = async (file: File) => {
    try {
      setNewLesson((prev) => ({
        ...prev,
        isUploading: true,
        uploadProgress: 0,
      }));

      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${courseId}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("lesson-videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get video duration
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          resolve(null);
        };
      });

      const duration = Math.round(video.duration);

      // Create lesson record
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .insert([
          {
            course_id: courseId,
            section_id: selectedSection?.id,
            title: newLesson.title,
            description: newLesson.description,
            topic: newLesson.topic,
            video_path: filePath,
            duration: duration,
            order_index: lessons.filter(
              (l) => l.section_id === selectedSection?.id
            ).length,
          },
        ])
        .select()
        .single();

      if (lessonError) throw lessonError;

      setLessons([...lessons, lessonData]);
      setNewLesson({
        title: "",
        description: "",
        topic: "",
        video: null,
        uploadProgress: 0,
        isUploading: false,
      });
      setIsAddingLesson(false);
      toast.success("Lesson created successfully");
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast.error("Failed to create lesson");
      setNewLesson((prev) => ({ ...prev, isUploading: false }));
    }
  };

  const handleAddLessonClick = (section: Section) => {
    console.log("Add Lesson clicked for section:", section);
    setSelectedSection(section);
    setIsAddingLesson(true);
  };

  const handleAddLesson = async () => {
    if (!newLesson.title.trim()) {
      toast.error("Lesson title is required");
      return;
    }

    if (!newLesson.video) {
      toast.error("Please select a video file");
      return;
    }

    await handleVideoUpload(newLesson.video);
  };

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

  if (!course) {
    return (
      <div className="flex min-h-screen bg-[#0A0A0A]">
        <AdminSidebar />
        <div className="flex-1 ml-[280px] flex items-center justify-center">
          <div className="text-white">Course not found</div>
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
            {/* Course Header */}
            <div className="flex items-start gap-6 mb-8">
              <div className="aspect-video relative w-64 flex-shrink-0">
                {course.thumbnail_path ? (
                  <Image
                    src={
                      supabase.storage
                        .from("course-thumbnails")
                        .getPublicUrl(course.thumbnail_path).data.publicUrl
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
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {course.title}
                </h1>
                <p className="text-gray-400 mb-4">{course.description}</p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full">
                    {course.level}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-800 text-gray-400 rounded-full">
                    {course.language}
                  </span>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Sections</h2>
                <button
                  onClick={() => setIsAddingSection(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Section
                </button>
              </div>

              <div className="space-y-4">
                {sections.map((section) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800 p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                              {section.title}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              {section.description}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedSection(section)}
                              className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSection(section.id)}
                              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Lessons in Section */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-lg font-medium text-white">
                              Lessons
                            </h4>
                            <button
                              onClick={() => handleAddLessonClick(section)}
                              className="flex items-center gap-2 px-3 py-1 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Add Lesson
                            </button>
                          </div>

                          <div className="space-y-3">
                            {lessons
                              .filter(
                                (lesson) => lesson.section_id === section.id
                              )
                              .map((lesson) => (
                                <motion.div
                                  key={lesson.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-gray-800/50 backdrop-blur-lg rounded-lg border border-gray-700 p-4"
                                >
                                  <div className="flex items-start gap-4">
                                    <div className="flex-1">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h5 className="text-lg font-medium text-white mb-1">
                                            {lesson.title}
                                          </h5>
                                          <p className="text-gray-400 text-sm">
                                            {lesson.description}
                                          </p>
                                          <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                                            <Video className="w-4 h-4" />
                                            <span>
                                              {Math.round(lesson.duration / 60)}{" "}
                                              min
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() =>
                                              router.push(
                                                `/dashboard/admin/videos/${courseId}/lessons/${lesson.id}/edit`
                                              )
                                            }
                                            className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                                          >
                                            <Edit className="w-5 h-5" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleDeleteLesson(lesson.id)
                                            }
                                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                          >
                                            <Trash2 className="w-5 h-5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Add Section Modal */}
        {isAddingSection && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Add New Section
                </h3>
                <button
                  onClick={() => setIsAddingSection(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newSection.title}
                    onChange={(e) =>
                      setNewSection({
                        ...newSection,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newSection.description}
                    onChange={(e) =>
                      setNewSection({
                        ...newSection,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingSection(false)}
                    className="px-4 py-2 text-gray-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
                  >
                    Add Section
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add Lesson Modal */}
        {isAddingLesson && selectedSection && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Add New Lesson
                </h3>
                <button
                  onClick={() => {
                    setIsAddingLesson(false);
                    setSelectedSection(null);
                  }}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Section
                  </label>
                  <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                    {selectedSection.title}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newLesson.title}
                    onChange={(e) =>
                      setNewLesson({
                        ...newLesson,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newLesson.description}
                    onChange={(e) =>
                      setNewLesson({
                        ...newLesson,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={newLesson.topic}
                    onChange={(e) =>
                      setNewLesson({
                        ...newLesson,
                        topic: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    placeholder="e.g., Grammar, Vocabulary, Pronunciation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Video
                  </label>
                  {newLesson.isUploading ? (
                    <div className="w-full bg-gray-800 rounded-lg overflow-hidden">
                      <div
                        className="h-1 bg-purple-500"
                        style={{ width: `${newLesson.uploadProgress}%` }}
                      />
                      <div className="px-3 py-2 text-sm text-gray-400">
                        Uploading: {newLesson.uploadProgress}%
                      </div>
                    </div>
                  ) : newLesson.video ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                      <Video className="w-4 h-4 text-purple-400" />
                      <span className="flex-1 truncate">
                        {newLesson.video.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setNewLesson({
                            ...newLesson,
                            video: null,
                          })
                        }
                        className="p-1 text-gray-400 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 px-3 py-4 bg-gray-800 border border-gray-700 border-dashed rounded-lg text-gray-400 cursor-pointer hover:bg-gray-750">
                      <Upload className="w-5 h-5" />
                      <span>Click to upload video</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewLesson({
                              ...newLesson,
                              video: file,
                            });
                            handleVideoUpload(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingLesson(false);
                      setSelectedSection(null);
                    }}
                    className="px-4 py-2 text-gray-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddLesson}
                    disabled={
                      !newLesson.title ||
                      !newLesson.video ||
                      newLesson.isUploading
                    }
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Lesson
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
