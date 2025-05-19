"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { LoadingScreen } from "@/components/ui/loading";
import Sidebar from "@/components/layouts/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Search, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ChatUser {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  last_message?: Message;
  unread_count: number;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [chats, setChats] = useState<ChatUser[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (user) {
      fetchChats();
      const userId = searchParams.get("user");
      if (userId) {
        setSelectedChat(userId);
      }
    }

    // Cleanup function for when component unmounts
    return () => {
      supabase.removeAllChannels();
    };
  }, [user]);

  useEffect(() => {
    let cleanup: () => void = () => {};

    if (selectedChat) {
      fetchMessages(selectedChat);
      cleanup = subscribeToMessages(selectedChat);
    }

    return cleanup;
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChats = async () => {
    try {
      const { data: sentMessages, error: sentError } = await supabase
        .from("messages")
        .select("*, profiles!receiver_id(*)")
        .eq("sender_id", user?.id)
        .order("created_at", { ascending: false });

      const { data: receivedMessages, error: receivedError } = await supabase
        .from("messages")
        .select("*, profiles!sender_id(*)")
        .eq("receiver_id", user?.id)
        .order("created_at", { ascending: false });

      if (sentError) throw sentError;
      if (receivedError) throw receivedError;

      const chatMap = new Map<string, ChatUser>();

      // Process sent messages
      sentMessages.forEach((msg) => {
        const chatUser = msg.profiles;
        if (!chatMap.has(chatUser.id)) {
          chatMap.set(chatUser.id, {
            id: chatUser.id,
            full_name: chatUser.full_name,
            username: chatUser.username,
            avatar_url: chatUser.avatar_url,
            last_message: msg,
            unread_count: 0,
          });
        }
      });

      // Process received messages
      receivedMessages.forEach((msg) => {
        const chatUser = msg.profiles;
        if (!chatMap.has(chatUser.id)) {
          chatMap.set(chatUser.id, {
            id: chatUser.id,
            full_name: chatUser.full_name,
            username: chatUser.username,
            avatar_url: chatUser.avatar_url,
            last_message: msg,
            unread_count: msg.is_read ? 0 : 1,
          });
        } else {
          const existingChat = chatMap.get(chatUser.id)!;
          if (
            !existingChat.last_message ||
            new Date(msg.created_at) >
              new Date(existingChat.last_message.created_at)
          ) {
            existingChat.last_message = msg;
            existingChat.unread_count = msg.is_read ? 0 : 1;
          }
        }
      });

      setChats(Array.from(chatMap.values()));
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast.error("Failed to load chats");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user?.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user?.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      const unreadMessages = data?.filter(
        (msg) => msg.receiver_id === user?.id && !msg.is_read
      );
      if (unreadMessages?.length) {
        const { error: updateError } = await supabase
          .from("messages")
          .update({ is_read: true })
          .in(
            "id",
            unreadMessages.map((msg) => msg.id)
          );

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const subscribeToMessages = (userId: string) => {
    // Unsubscribe from any existing subscriptions first
    supabase.removeAllChannels();

    const channel = supabase
      .channel(`messages:${user?.id}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `or(and(sender_id=eq.${user?.id},receiver_id=eq.${userId}),and(sender_id=eq.${userId},receiver_id=eq.${user?.id}))`,
        },
        (payload) => {
          const newMessage = payload.new as Message;

          // Only add the message if it's not already in the list
          setMessages((prev) => {
            // Check if message already exists
            const exists = prev.some((msg) => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });

          // Update chat list with latest message
          if (newMessage.receiver_id === user?.id) {
            // Mark as read if we're currently viewing this chat
            markMessageAsRead(newMessage.id);

            // Update the chat list with the new message
            setChats((prevChats) => {
              return prevChats.map((chat) => {
                if (chat.id === newMessage.sender_id) {
                  return {
                    ...chat,
                    last_message: newMessage,
                    unread_count:
                      selectedChat === newMessage.sender_id
                        ? 0
                        : (chat.unread_count || 0) + 1,
                  };
                }
                return chat;
              });
            });
          }

          // Scroll to bottom with new message
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("id", messageId);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      sender_id: user?.id || "",
      receiver_id: selectedChat,
      content: newMessage.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
    };

    // Optimistically update UI
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage(""); // Clear input right away

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user?.id,
          receiver_id: selectedChat,
          content: tempMessage.content,
          is_read: false,
        })
        .select();

      if (error) throw error;

      // Replace temporary message with actual message from server
      if (data && data.length > 0) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? data[0] : msg))
        );

        // Also update the chat list with the latest message
        setChats((prevChats) => {
          const updatedChats = [...prevChats];
          const chatIndex = updatedChats.findIndex(
            (c) => c.id === selectedChat
          );

          if (chatIndex !== -1) {
            updatedChats[chatIndex] = {
              ...updatedChats[chatIndex],
              last_message: data[0],
            };
          }

          return updatedChats;
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");

      // Remove the temporary message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const filteredChats = chats.filter((chat) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      chat.full_name?.toLowerCase().includes(searchLower) ||
      chat.username?.toLowerCase().includes(searchLower)
    );
  });

  if (!user || !profile) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)]">
          <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800 h-full flex">
            {/* Chat List */}
            <div className="w-80 border-r border-gray-800 flex flex-col">
              <div className="p-4 border-b border-gray-800">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                  Messages
                </h1>
                <div className="mt-4 relative">
                  <Input
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-800 border-gray-700 pl-10"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <AnimatePresence>
                  {filteredChats.map((chat) => (
                    <motion.div
                      key={chat.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`p-4 cursor-pointer hover:bg-gray-800/50 transition-colors ${
                        selectedChat === chat.id ? "bg-gray-800/50" : ""
                      }`}
                      onClick={() => setSelectedChat(chat.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={chat.avatar_url || undefined} />
                          <AvatarFallback>
                            {chat.full_name
                              ? chat.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                              : chat.username?.[0].toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-white font-medium truncate">
                              {chat.full_name}
                            </p>
                            {chat.unread_count > 0 && (
                              <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                                {chat.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm truncate">
                            {chat.last_message?.content}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={
                            chats.find((c) => c.id === selectedChat)
                              ?.avatar_url || undefined
                          }
                        />
                        <AvatarFallback>
                          {chats
                            .find((c) => c.id === selectedChat)
                            ?.full_name?.split(" ")
                            .map((n) => n[0])
                            .join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-white font-medium">
                          {chats.find((c) => c.id === selectedChat)?.full_name}
                        </h2>
                        <p className="text-gray-400 text-sm">
                          @{chats.find((c) => c.id === selectedChat)?.username}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/profile/${selectedChat}`}
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      View Profile
                    </Link>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender_id === user.id
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender_id === user.id
                              ? "bg-purple-500/20 text-purple-400"
                              : "bg-gray-800/50 text-white"
                          }`}
                        >
                          <p>{message.content}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-800">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        className="bg-gray-800 border-gray-700"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-400">
                      Select a chat to start messaging
                    </h3>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
