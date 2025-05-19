"use client";

import { useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { X, Upload, Plus, Trash2, Video } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface Lesson {
  id?: string;
  title: string;
  description: string;
  video_path: string;
  duration: number;
  order_index: number;
}

interface CourseFormData {
  title: string;
  description: string;
  language: string;
  level: string;
  thumbnail_path: string;
  is_public: boolean;
  lessons: Lesson[];
  learning_objectives: string[];
  learning_requirements: string[];
}

export default function InteractiveCourseForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"course" | "lessons">("course");
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    language: "",
    level: "beginner",
    thumbnail_path: "",
    is_public: true,
    lessons: [],
    learning_objectives: [""],
    learning_requirements: [""],
  });

  const supabase = createClientComponentClient();

  const handleThumbnailChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Upload file to Supabase Storage
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("course-thumbnails")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setFormData((prev) => ({ ...prev, thumbnail_path: filePath }));
      toast.success("Thumbnail uploaded successfully");
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      toast.error("Failed to upload thumbnail");
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    lessonIndex: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `lessons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("lesson-videos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get video duration
      const videoElement = document.createElement("video");
      videoElement.src = URL.createObjectURL(file);
      const duration = await new Promise<number>((resolve) => {
        videoElement.onloadedmetadata = () => {
          resolve(videoElement.duration);
        };
      });

      const updatedLessons = [...formData.lessons];
      updatedLessons[lessonIndex] = {
        ...updatedLessons[lessonIndex],
        video_path: filePath,
        duration: Math.round(duration),
      };

      setFormData((prev) => ({ ...prev, lessons: updatedLessons }));
      toast.success("Video uploaded successfully");
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error("Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const addLesson = () => {
    setFormData((prev) => ({
      ...prev,
      lessons: [
        ...prev.lessons,
        {
          title: "",
          description: "",
          video_path: "",
          duration: 0,
          order_index: prev.lessons.length + 1,
        },
      ],
    }));
    setCurrentLessonIndex(formData.lessons.length);
  };

  const removeLesson = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      lessons: prev.lessons.filter((_, i) => i !== index),
    }));
    if (currentLessonIndex === index) {
      setCurrentLessonIndex(null);
    }
  };

  const handleLessonChange = (
    index: number,
    field: keyof Lesson,
    value: string | number
  ) => {
    const updatedLessons = [...formData.lessons];
    updatedLessons[index] = {
      ...updatedLessons[index],
      [field]: value,
    };
    setFormData((prev) => ({ ...prev, lessons: updatedLessons }));
  };

  const handleArrayChange = (
    index: number,
    value: string,
    field: "learning_objectives" | "learning_requirements"
  ) => {
    setFormData((prev) => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (
    field: "learning_objectives" | "learning_requirements"
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeArrayItem = (
    index: number,
    field: "learning_objectives" | "learning_requirements"
  ) => {
    setFormData((prev) => {
      const newArray = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: newArray.length ? newArray : [""] };
    });
  };

  const renderArrayInputs = (
    field: "learning_objectives" | "learning_requirements",
    title: string
  ) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-400">{title}</label>
        <button
          type="button"
          onClick={() => addArrayItem(field)}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {field === "learning_objectives" ? "Objective" : "Requirement"}
        </button>
      </div>
      <div className="space-y-3">
        {formData[field].map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => handleArrayChange(index, e.target.value, field)}
              placeholder={`Enter a ${field === "learning_objectives" ? "learning objective" : "requirement"}`}
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {formData[field].length > 1 && (
              <button
                type="button"
                onClick={() => removeArrayItem(index, field)}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Filter out empty learning objectives and requirements
      const filteredObjectives = formData.learning_objectives.filter(
        (obj) => obj.trim() !== ""
      );
      const filteredRequirements = formData.learning_requirements.filter(
        (req) => req.trim() !== ""
      );

      // First, create the course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .insert([
          {
            title: formData.title,
            description: formData.description,
            language: formData.language,
            level: formData.level,
            thumbnail_path: formData.thumbnail_path,
            is_public: formData.is_public,
            learning_objectives: filteredObjectives,
            learning_requirements: filteredRequirements,
          },
        ])
        .select()
        .single();

      if (courseError) throw courseError;

      // Then, create all lessons for the course
      const lessonsToInsert = formData.lessons.map((lesson) => ({
        ...lesson,
        course_id: courseData.id,
      }));

      const { error: lessonsError } = await supabase
        .from("lessons")
        .insert(lessonsToInsert);

      if (lessonsError) throw lessonsError;

      toast.success("Course and lessons created successfully");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Failed to create course");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] rounded-xl border border-gray-800 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">Create New Course</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-4 px-6 py-4 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("course")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "course"
                ? "bg-purple-500 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Course Details
          </button>
          <button
            onClick={() => setActiveTab("lessons")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "lessons"
                ? "bg-purple-500 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Lessons ({formData.lessons.length})
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {activeTab === "course" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Thumbnail
                    </label>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-32 h-32 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {previewUrl ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={previewUrl}
                              alt="Thumbnail preview"
                              fill
                              className="object-cover rounded-lg"
                            />
                          </div>
                        ) : (
                          <Upload className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleThumbnailChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-400">
                          {uploading
                            ? "Uploading..."
                            : previewUrl
                              ? "Click to change thumbnail"
                              : "Click to upload thumbnail"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Recommended size: 1280x720px
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      required
                      rows={4}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Language
                      </label>
                      <input
                        type="text"
                        value={formData.language}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            language: e.target.value,
                          }))
                        }
                        required
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Level
                      </label>
                      <select
                        value={formData.level}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            level: e.target.value,
                          }))
                        }
                        required
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_public}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_public: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 text-purple-500 rounded border-gray-800 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-400">
                        Make course public
                      </span>
                    </label>
                  </div>

                  {renderArrayInputs(
                    "learning_objectives",
                    "Learning Objectives"
                  )}
                  {renderArrayInputs("learning_requirements", "Requirements")}
                </motion.div>
              )}

              {activeTab === "lessons" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">
                      Lessons
                    </h3>
                    <button
                      type="button"
                      onClick={addLesson}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Add Lesson
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.lessons.map((lesson, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-lg border ${
                          currentLessonIndex === index
                            ? "border-purple-500"
                            : "border-gray-800"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-lg font-medium text-white">
                            Lesson {index + 1}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeLesson(index)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Title
                            </label>
                            <input
                              type="text"
                              value={lesson.title}
                              onChange={(e) =>
                                handleLessonChange(
                                  index,
                                  "title",
                                  e.target.value
                                )
                              }
                              required
                              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Description
                            </label>
                            <textarea
                              value={lesson.description}
                              onChange={(e) =>
                                handleLessonChange(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                              required
                              rows={3}
                              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Video
                            </label>
                            <div className="flex items-center gap-4">
                              {lesson.video_path ? (
                                <div className="flex items-center gap-2 text-purple-400">
                                  <Video className="w-5 h-5" />
                                  <span>Video uploaded</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => videoInputRef.current?.click()}
                                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                  <Upload className="w-5 h-5" />
                                  Upload Video
                                </button>
                              )}
                              <input
                                type="file"
                                ref={videoInputRef}
                                onChange={(e) => handleVideoUpload(e, index)}
                                accept="video/*"
                                className="hidden"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Order Index
                            </label>
                            <input
                              type="number"
                              value={lesson.order_index}
                              onChange={(e) =>
                                handleLessonChange(
                                  index,
                                  "order_index",
                                  parseInt(e.target.value)
                                )
                              }
                              required
                              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-end gap-4 p-6 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || uploading}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
 