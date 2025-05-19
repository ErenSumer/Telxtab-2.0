"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";

interface MultipleChoiceExerciseProps {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  onComplete: (isCorrect: boolean) => void;
}

export default function MultipleChoiceExercise({
  question,
  options,
  correctAnswer,
  explanation,
  onComplete,
}: MultipleChoiceExerciseProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleAnswerSelect = (answer: string) => {
    if (!isSubmitted) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) return;

    const correct = selectedAnswer === correctAnswer;
    setIsCorrect(correct);
    setShowExplanation(true);
    setIsSubmitted(true);

    // Call the onComplete callback to update XP
    onComplete(correct);
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setIsCorrect(null);
    setIsSubmitted(false);
  };

  return (
    <div className="space-y-6">
      <p className="text-lg text-white mb-6">{question}</p>

      <div className="space-y-3">
        {options.map((option) => (
          <motion.button
            key={option}
            onClick={() => handleAnswerSelect(option)}
            className={`w-full p-4 text-left rounded-lg transition-all duration-200 ${
              selectedAnswer === option
                ? isSubmitted
                  ? option === correctAnswer
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                  : "bg-purple-500/20 text-white"
                : isSubmitted && option === correctAnswer
                  ? "bg-green-500/20 text-green-400"
                  : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50"
            } ${isSubmitted && "cursor-default"}`}
            whileHover={{ scale: isSubmitted ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitted ? 1 : 0.98 }}
            disabled={isSubmitted}
          >
            {option}
          </motion.button>
        ))}
      </div>

      {!isSubmitted ? (
        <motion.button
          onClick={handleSubmit}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            selectedAnswer
              ? "bg-purple-500 text-white hover:bg-purple-600"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}
          disabled={!selectedAnswer}
          whileHover={{ scale: selectedAnswer ? 1.02 : 1 }}
          whileTap={{ scale: selectedAnswer ? 0.98 : 1 }}
        >
          Submit Answer
        </motion.button>
      ) : (
        <motion.button
          onClick={handleNextQuestion}
          className="w-full py-3 rounded-lg font-medium bg-purple-500 text-white hover:bg-purple-600 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Next Question
        </motion.button>
      )}

      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-lg ${
              isCorrect ? "bg-green-500/20" : "bg-red-500/20"
            }`}
          >
            <div className="flex items-start gap-2">
              {isCorrect ? (
                <Check className="w-5 h-5 mt-1 text-green-400 flex-shrink-0" />
              ) : (
                <X className="w-5 h-5 mt-1 text-red-400 flex-shrink-0" />
              )}
              <div>
                <p className={isCorrect ? "text-green-400" : "text-red-400"}>
                  {isCorrect
                    ? "Correct!"
                    : `Incorrect. The correct answer is: ${correctAnswer}`}
                </p>
                <p className="text-gray-400 mt-2">{explanation}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
