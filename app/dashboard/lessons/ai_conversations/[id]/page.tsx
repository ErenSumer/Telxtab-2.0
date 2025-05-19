"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { LoadingScreen } from "@/components/ui/loading";
import Sidebar from "@/components/layouts/sidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Loader2, Clock } from "lucide-react";
import {
  getChatResponse,
  type ChatMessage as GeminiChatMessage,
} from "@/lib/gemini";
import { use } from "react";
import { useStudyTimer } from "@/hooks/useStudyTimer";

interface AIChat {
  id: string;
  topic: string;
  language_style: "formal" | "informal";
  created_at: string;
  last_message_at: string;
}

interface ChatMessage extends GeminiChatMessage {
  chat_id: string;
  created_at: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ChatPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const chatId = resolvedParams.id;

  const { user, loading } = useAuth();
  const router = useRouter();
  const [chat, setChat] = useState<AIChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();
  const { formattedTime } = useStudyTimer();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch chat and messages
  useEffect(() => {
    const fetchChatAndMessages = async () => {
      if (!user) return;

      try {
        // Fetch chat details
        const { data: chatData, error: chatError } = await supabase
          .from("ai_chats")
          .select("*")
          .eq("id", chatId)
          .single();

        if (chatError) throw chatError;
        setChat(chatData);

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("ai_chat_messages")
          .select("*")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;
        setMessages(messagesData || []);
      } catch (error) {
        console.error("Error fetching chat:", error);
        setError("Failed to load chat");
      } finally {
        setIsLoadingChat(false);
      }
    };

    fetchChatAndMessages();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_chat_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          // Only add the message if it's not already in the list
          setMessages((current) => {
            const newMessage = payload.new as ChatMessage;
            const messageExists = current.some(
              (msg) => msg.created_at === newMessage.created_at
            );
            if (messageExists) return current;
            return [...current, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, chatId, supabase]);

  const handleSendMessage = async () => {
    if (!user || !chat || !newMessage.trim() || isSending) return;

    setIsSending(true);
    setError(null);
    const messageContent = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    try {
      // Optimistically add user message to UI
      const userMessage: ChatMessage = {
        chat_id: chat.id,
        role: "user",
        content: messageContent,
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, userMessage]);

      // Add user message to the database
      const { error: insertError } = await supabase
        .from("ai_chat_messages")
        .insert([userMessage]);

      if (insertError) throw insertError;

      // Update last_message_at in chat
      await supabase
        .from("ai_chats")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", chat.id);

      // Get AI response
      const aiResponse = await getChatResponse(
        [...messages, { role: "user", content: messageContent }],
        chat.topic,
        chat.language_style
      );

      // Optimistically add AI response to UI
      const assistantMessage: ChatMessage = {
        chat_id: chat.id,
        role: "assistant",
        content: aiResponse,
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, assistantMessage]);

      // Add AI response to the database
      const { error: aiInsertError } = await supabase
        .from("ai_chat_messages")
        .insert([assistantMessage]);

      if (aiInsertError) throw aiInsertError;
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message");
      // Revert optimistic updates on error
      setMessages((current) => current.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  };

  if (loading || isLoadingChat) {
    return <LoadingScreen />;
  }

  if (!user || !chat) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <div className="flex-1 ml-[280px] flex flex-col h-screen">
        {/* Header */}
        <header className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-white"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">{chat.topic}</h1>
                <p className="text-sm text-gray-400">
                  {chat.language_style.charAt(0).toUpperCase() +
                    chat.language_style.slice(1)}{" "}
                  English Practice
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-gray-800/50 px-4 py-2 rounded-lg">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">
                {formattedTime.formatted}
              </span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(31, 41, 55, 0.5);
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(139, 92, 246, 0.5);
              border-radius: 4px;
              transition: background-color 0.2s;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(139, 92, 246, 0.8);
            }
          `}</style>
          <div className="container mx-auto space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.role === "user"
                        ? "bg-purple-500/20 text-white"
                        : "bg-gray-800/50 text-gray-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-lg">
          <div className="container mx-auto">
            {error && (
              <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="flex space-x-4">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-gray-800/50 border-gray-700 focus:border-purple-500 text-white resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isSending || !newMessage.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
