"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { LoadingScreen } from "@/components/ui/loading";
import Sidebar from "@/components/layouts/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";

export default function CreateChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [topic, setTopic] = useState("");
  const [languageStyle, setLanguageStyle] = useState<"formal" | "informal">(
    "formal"
  );
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsCreating(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("ai_chats")
        .insert([
          {
            user_id: user.id,
            topic,
            language_style: languageStyle,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Redirect to the new chat
      router.push(`/dashboard/lessons/ai_conversations/${data.id}`);
    } catch (error) {
      console.error("Error creating chat:", error);
      setError("Failed to create chat. Please try again.");
      setIsCreating(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <div className="flex-1 ml-[280px]">
        <main className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            className="mb-8 text-gray-400 hover:text-white"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/40 backdrop-blur-xl rounded-3xl p-8 border border-gray-800/50 shadow-2xl shadow-purple-500/10">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
                Create New Conversation
              </h1>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-gray-300">
                    Conversation Topic
                  </Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Job Interview Practice"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="bg-gray-800/50 border-gray-700 focus:border-purple-500 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language-style" className="text-gray-300">
                    Language Style
                  </Label>
                  <Select
                    value={languageStyle}
                    onValueChange={(value: "formal" | "informal") =>
                      setLanguageStyle(value)
                    }
                  >
                    <SelectTrigger
                      id="language-style"
                      className="bg-gray-800/50 border-gray-700 focus:border-purple-500 text-white"
                    >
                      <SelectValue placeholder="Select language style" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-800">
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="informal">Informal</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-400 mt-2">
                    {languageStyle === "formal"
                      ? "Professional and polite language suitable for business contexts"
                      : "Casual and friendly language for everyday conversations"}
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-6"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Conversation"
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
