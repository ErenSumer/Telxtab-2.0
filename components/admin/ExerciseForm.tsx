"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { X, Plus, Trash2 } from "lucide-react";

interface ExerciseFormProps {
  courseId: string;
  selectedOrderIndex: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExerciseForm({
  courseId,
  selectedOrderIndex,
  onClose,
  onSuccess,
}: ExerciseFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "multiple_choice",
    question: "",
    correct_answer: "",
    explanation: "",
    options: ["", "", "", ""],
    order_index: selectedOrderIndex,
    course_id: courseId,
  });

  const supabase = createClientComponentClient();

  // Automatically update order_index when selectedOrderIndex changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      order_index: selectedOrderIndex,
    }));
  }, [selectedOrderIndex]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  };

  const addOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, ""],
    }));
  };

  const removeOption = (index: number) => {
    setFormData((prev) => {
      const newOptions = prev.options.filter((_, i) => i !== index);
      return { ...prev, options: newOptions.length ? newOptions : [""] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Filter out empty options
      const filteredOptions = formData.options.filter(
        (opt) => opt.trim() !== ""
      );

      // Check if there's at least 2 options for multiple choice
      if (formData.type === "multiple_choice" && filteredOptions.length < 2) {
        toast.error("Multiple choice questions need at least 2 options");
        setIsLoading(false);
        return;
      }

      // Make sure correct answer is one of the options for multiple choice
      if (
        formData.type === "multiple_choice" &&
        !filteredOptions.includes(formData.correct_answer)
      ) {
        toast.error("Correct answer must be one of the options");
        setIsLoading(false);
        return;
      }

      // First, shift all existing content with order_index >= selectedOrderIndex up by 1
      const { data: existingContent, error: fetchError } = await supabase
        .from("course_content")
        .select("*")
        .eq("course_id", courseId)
        .gte("order_index", selectedOrderIndex)
        .order("order_index", { ascending: true });

      if (fetchError) throw fetchError;

      if (existingContent && existingContent.length > 0) {
        const updatedContent = existingContent.map((item) => ({
          ...item,
          order_index: item.order_index + 1,
        }));

        const { error: updateError } = await supabase
          .from("course_content")
          .upsert(updatedContent);

        if (updateError) throw updateError;
      }

      // Then, insert the new exercise
      const { error: insertError } = await supabase.from("exercises").insert({
        course_id: courseId,
        type: formData.type,
        question: formData.question,
        correct_answer: formData.correct_answer,
        options: formData.type === "multiple_choice" ? filteredOptions : null,
        explanation: formData.explanation,
        order_index: selectedOrderIndex,
      });

      if (insertError) throw insertError;

      toast.success("Exercise created successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating exercise:", error);
      toast.error("Failed to create exercise");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0A0A0A] rounded-xl border border-gray-800 w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Create New Exercise</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-400 mb-2"
            >
              Exercise Type
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="matching">Matching</option>
              <option value="fill_in_blank">Fill in the Blank</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="question"
              className="block text-sm font-medium text-gray-400 mb-2"
            >
              Question
            </label>
            <textarea
              id="question"
              name="question"
              value={formData.question}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {formData.type === "multiple_choice" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-400">
                  Options
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              </div>
              <div className="space-y-3">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.options.length > 2) {
                          removeOption(index);
                        } else {
                          toast.error(
                            "Multiple choice needs at least 2 options"
                          );
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.type === "multiple_choice" && (
            <div>
              <label
                htmlFor="correct_answer"
                className="block text-sm font-medium text-gray-400 mb-2"
              >
                Correct Answer
              </label>
              <select
                id="correct_answer"
                name="correct_answer"
                value={formData.correct_answer}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select correct answer</option>
                {formData.options.map(
                  (option, index) =>
                    option && (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    )
                )}
              </select>
            </div>
          )}

          {formData.type === "fill_in_blank" && (
            <div>
              <label
                htmlFor="correct_answer"
                className="block text-sm font-medium text-gray-400 mb-2"
              >
                Correct Answer
              </label>
              <input
                type="text"
                id="correct_answer"
                name="correct_answer"
                value={formData.correct_answer}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="explanation"
              className="block text-sm font-medium text-gray-400 mb-2"
            >
              Explanation (Shown after answering)
            </label>
            <textarea
              id="explanation"
              name="explanation"
              value={formData.explanation}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Exercise"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
