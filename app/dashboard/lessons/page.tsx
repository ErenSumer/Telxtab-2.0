"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { LoadingScreen } from "@/components/ui/loading";
import Sidebar from "@/components/layouts/sidebar";
import { motion } from "framer-motion";
import { Video, MessageSquare } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LessonsPage() {
  const { user, loading } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }

    // If user has already selected a learning preference, redirect them
    if (profile?.learning_preference) {
      if (profile.learning_preference === "ai_conversations") {
        router.push("/dashboard/lessons/ai_conversations");
      } else if (profile.learning_preference === "videos") {
        router.push("/dashboard/lessons/videos");
      }
      return;
    }
  }, [user, loading, router, profile]);

  const handlePreferenceSelection = async (
    preference: "ai_conversations" | "videos"
  ) => {
    if (!user || isUpdating) return;

    try {
      setIsUpdating(true);

      // Update the user's learning preference in Supabase
      const { error } = await supabase
        .from("profiles")
        .update({ learning_preference: preference })
        .eq("id", user.id);

      if (error) throw error;

      // Refresh the profile to get the updated data
      await refreshProfile();

      // Redirect to the appropriate page
      router.push(`/dashboard/lessons/${preference}`);
    } catch (error) {
      console.error("Error updating learning preference:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Show loading screen if:
  // 1. Auth is loading
  // 2. User has a learning preference (will redirect)
  // 3. Update is in progress
  if (loading || profile?.learning_preference || isUpdating) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <div className="flex-1 ml-[280px]">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4"
              >
                How Would You Like to Learn?
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-gray-400 text-lg"
              >
                Choose your preferred learning method to get started
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                onClick={() => handlePreferenceSelection("ai_conversations")}
                className="group cursor-pointer relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-8 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <div className="relative">
                  <div className="p-4 rounded-xl bg-purple-500/20 w-fit mb-6">
                    <MessageSquare className="w-8 h-8 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">
                    AI Conversations
                  </h2>
                  <p className="text-gray-400">
                    Practice with AI tutors that adapt to your level and provide
                    instant feedback
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                onClick={() => handlePreferenceSelection("videos")}
                className="group cursor-pointer relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-8 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <div className="relative">
                  <div className="p-4 rounded-xl bg-purple-500/20 w-fit mb-6">
                    <Video className="w-8 h-8 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">
                    Video Lessons
                  </h2>
                  <p className="text-gray-400">
                    Learn through structured video lessons with interactive
                    exercises
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
