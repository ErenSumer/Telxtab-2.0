"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";

interface MatchingExerciseProps {
  question: string;
  correctPairs: { word: string; translation: string }[];
  onComplete: (isCorrect: boolean) => void;
}

export default function MatchingExercise({
  question,
  correctPairs,
  onComplete,
}: MatchingExerciseProps) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<{ [key: string]: string }>(
    {}
  );
  const [attempts, setAttempts] = useState<{ [key: string]: number }>({});
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Shuffle the words
  const leftWords = correctPairs.map((pair) => pair.word);
  const rightWords = correctPairs.map((pair) => pair.translation);

  // Fisher-Yates shuffle algorithm
  const shuffleArray = (array: string[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const [shuffledLeft, setShuffledLeft] = useState<string[]>([]);
  const [shuffledRight, setShuffledRight] = useState<string[]>([]);

  useEffect(() => {
    setShuffledLeft(shuffleArray(leftWords));
    setShuffledRight(shuffleArray(rightWords));
  }, []);

  const handleWordClick = (word: string, isLeft: boolean) => {
    if (isLeft) {
      if (selectedLeft === word) {
        setSelectedLeft(null);
      } else {
        setSelectedLeft(word);
      }
    } else {
      if (selectedRight === word) {
        setSelectedRight(null);
      } else {
        setSelectedRight(word);
      }
    }

    // If both words are selected, check if they match
    if (selectedLeft && word !== selectedLeft && isLeft) {
      checkMatch(selectedLeft, word);
    } else if (selectedRight && word !== selectedRight && !isLeft) {
      checkMatch(word, selectedRight);
    }
  };

  const checkMatch = (leftWord: string, rightWord: string) => {
    const correct = correctPairs.some(
      (pair) => pair.word === leftWord && pair.translation === rightWord
    );
    setIsCorrect(correct);
    setShowFeedback(true);

    // Update attempts count
    setAttempts((prev) => ({
      ...prev,
      [leftWord]: (prev[leftWord] || 0) + 1,
    }));

    if (correct) {
      setMatchedPairs((prev) => ({
        ...prev,
        [leftWord]: rightWord,
      }));
    }

    // Reset selection after a short delay
    setTimeout(() => {
      setSelectedLeft(null);
      setSelectedRight(null);
      setShowFeedback(false);
      setIsCorrect(null);

      // Check if all pairs are matched
      if (
        Object.keys(matchedPairs).length + (correct ? 1 : 0) ===
        leftWords.length
      ) {
        onComplete(true);
      }
    }, 1000);
  };

  const getWordStyle = (word: string, isLeft: boolean) => {
    const isSelected = isLeft ? selectedLeft === word : selectedRight === word;
    const isMatched =
      Object.keys(matchedPairs).includes(word) ||
      Object.values(matchedPairs).includes(word);
    const attemptsCount = attempts[word] || 0;

    let backgroundColor = "bg-gray-800/50";
    if (isSelected) backgroundColor = "bg-purple-500/20";
    if (isMatched) backgroundColor = "bg-green-500/20";
    if (attemptsCount > 1) backgroundColor = "bg-red-500/20";

    return `p-4 rounded-lg cursor-pointer transition-all duration-200 ${backgroundColor} ${
      isMatched ? "text-green-400" : "text-gray-300"
    }`;
  };

  return (
    <div className="space-y-6">
      <p className="text-lg text-white mb-6">{question}</p>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-3">
          {shuffledLeft.map((word) => (
            <motion.button
              key={word}
              onClick={() => handleWordClick(word, true)}
              className={getWordStyle(word, true)}
              disabled={Object.keys(matchedPairs).includes(word)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {word}
            </motion.button>
          ))}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {shuffledRight.map((word) => (
            <motion.button
              key={word}
              onClick={() => handleWordClick(word, false)}
              className={getWordStyle(word, false)}
              disabled={Object.values(matchedPairs).includes(word)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {word}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg ${
              isCorrect ? "bg-green-500/20" : "bg-red-500/20"
            }`}
          >
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <X className="w-5 h-5 text-red-400" />
              )}
              <p className={isCorrect ? "text-green-400" : "text-red-400"}>
                {isCorrect ? "Correct match!" : "Try again!"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-purple-500"
            initial={{ width: 0 }}
            animate={{
              width: `${(Object.keys(matchedPairs).length / leftWords.length) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-sm text-gray-400">
          {Object.keys(matchedPairs).length} / {leftWords.length}
        </span>
      </div>
    </div>
  );
}
