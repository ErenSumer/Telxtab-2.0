"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { LoadingScreen } from "@/components/ui/loading";
import Sidebar from "@/components/layouts/sidebar";
import { Globe, Loader2, MessageSquarePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIChat {
  id: string;
  topic: string;
  language_style: "formal" | "informal";
  created_at: string;
  last_message_at: string;
}

export default function AIConversationsPage() {
  const { user, loading } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [chats, setChats] = useState<AIChat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!loading && !user) {
      setIsRedirecting(true);
      router.push("/");
      return;
    }

    // If user hasn't selected a learning preference, redirect to lessons page
    if (!profile?.learning_preference) {
      router.push("/dashboard/lessons");
      return;
    }

    // If user selected videos, redirect to videos page
    if (profile?.learning_preference === "videos") {
      router.push("/dashboard/lessons/videos");
      return;
    }
  }, [user, loading, router, profile]);

  useEffect(() => {
    const fetchChats = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("ai_chats")
          .select("*")
          .order("last_message_at", { ascending: false });

        if (error) throw error;
        setChats(data || []);
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setIsLoadingChats(false);
      }
    };

    fetchChats();
  }, [user, supabase]);

  const handleLanguageSelection = async () => {
    if (!user || isUpdating) return;

    setIsUpdating(true);
    try {
      // For now, we only support English
      const updatedLanguages = ["English"];

      const { error } = await supabase
        .from("profiles")
        .update({
          learning_languages: updatedLanguages,
          learning_preference: "ai_conversations",
        })
        .eq("id", user.id);

      if (error) throw error;

      // First refresh the profile
      await refreshProfile();

      // Then redirect directly to AI conversations
      router.push("/dashboard/lessons/ai_conversations");
    } catch (error) {
      console.error("Error updating learning languages:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateChat = () => {
    router.push("/dashboard/lessons/ai_conversations/create");
  };

  if (loading || isRedirecting) {
    return <LoadingScreen />;
  }

  if (!user || !profile) {
    return null;
  }

  // If user hasn't selected a language yet, show language selection
  if (!profile.learning_languages?.includes("English")) {
    return (
      <div className="flex min-h-screen bg-[#0A0A0A]">
        <Sidebar />
        <div className="flex-1 ml-[280px]">
          <main className="h-screen flex items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl w-full"
            >
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                  Choose Your Learning Goal
                </h1>
                <p className="text-gray-400 text-lg">
                  Select the language you want to master through AI
                  conversations
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLanguageSelection}
                disabled={isUpdating}
                className="w-full group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-purple-500/20">
                      <Globe className="w-8 h-8 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-semibold text-white mb-1">
                        English
                      </h3>
                      <p className="text-gray-400">
                        Practice English with AI conversation partners
                      </p>
                    </div>
                  </div>
                  {isUpdating ? (
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-purple-500/50 group-hover:bg-purple-500/50 transition-all duration-300" />
                  )}
                </div>
              </motion.button>

              <p className="text-center text-gray-500 mt-8 text-sm">
                More languages coming soon!
              </p>
            </motion.div>
          </main>
        </div>
      </div>
    );
  }

  // Show main chat interface
  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <div className="flex-1 ml-[280px]">
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">AI Conversations</h1>
            <Button
              onClick={handleCreateChat}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Conversation
            </Button>
          </div>

          {isLoadingChats ? (
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-[60vh] text-center"
            >
              <div className="p-4 rounded-full bg-purple-500/20 mb-4">
                <MessageSquarePlus className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                No Conversations Yet
              </h2>
              <p className="text-gray-400 mb-6 max-w-md">
                Start your language learning journey by creating your first AI
                conversation
              </p>
              <Button
                onClick={handleCreateChat}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Chat
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chats.map((chat) => (
                <motion.div
                  key={chat.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-800 hover:border-purple-500/50 transition-all duration-300 cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/dashboard/lessons/ai_conversations/${chat.id}`
                    )
                  }
                >
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {chat.topic}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {chat.language_style.charAt(0).toUpperCase() +
                      chat.language_style.slice(1)}{" "}
                    English
                  </p>
                  <div className="text-gray-500 text-sm">
                    Last message:{" "}
                    {new Date(chat.last_message_at).toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
