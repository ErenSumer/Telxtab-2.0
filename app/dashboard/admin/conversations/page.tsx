"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { LoadingScreen } from "@/components/ui/loading";
import AdminSidebar from "@/components/layouts/admin-sidebar";
import { Search, Trash2, Eye, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

interface Conversation {
  id: string;
  user_id: string;
  topic?: string;
  language_style?: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  user: User | null;
}

export default function ConversationsPage() {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<
    Conversation[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string>("");
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }

    if (!loading && !profile?.is_admin) {
      router.push("/dashboard");
      return;
    }

    fetchConversations();
  }, [user, loading, profile, router]);

  const fetchConversations = async () => {
    try {
      const { data: conversationsData, error: conversationsError } =
        await supabase
          .from("ai_chats")
          .select(
            `
          id,
          user_id,
          topic,
          language_style,
          created_at,
          updated_at,
          last_message_at
        `
          )
          .order("created_at", { ascending: false });

      if (conversationsError) {
        toast.error("Failed to fetch conversations");
        throw conversationsError;
      }

      if (conversationsData) {
        const userIds = conversationsData.map((conv) => conv.user_id);
        const { data: usersData, error: usersError } = await supabase
          .from("profiles")
          .select("id, email, full_name, avatar_url")
          .in("id", userIds);

        if (usersError) {
          toast.error("Failed to fetch user details");
          throw usersError;
        }

        const conversationsWithUsers = conversationsData.map((conv) => ({
          ...conv,
          user: usersData?.find((user) => user.id === conv.user_id) || null,
        })) as Conversation[];

        setConversations(conversationsWithUsers);
        setFilteredConversations(conversationsWithUsers);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterConversations(query);
  };

  const filterConversations = (query: string) => {
    let filtered = conversations;

    if (query) {
      filtered = filtered.filter(
        (conv) =>
          conv.user?.email?.toLowerCase().includes(query.toLowerCase()) ||
          conv.user?.full_name?.toLowerCase().includes(query.toLowerCase()) ||
          conv.topic?.toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredConversations(filtered);
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      setActionInProgress(conversationId);

      const { error } = await supabase
        .from("ai_chats")
        .delete()
        .eq("id", conversationId);

      if (error) {
        toast.error("Failed to delete conversation");
        throw error;
      }

      toast.success("Conversation deleted successfully");

      // Update local state
      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId)
      );
      setFilteredConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId)
      );

      // Close modal if open
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    } finally {
      setActionInProgress("");
    }
  };

  if (loading || isLoading) {
    return <LoadingScreen />;
  }

  if (!user || !profile?.is_admin) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <div className="flex-1 ml-[280px]">
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                AI Conversations
              </h1>
              <p className="text-gray-400">
                Manage and monitor AI chat conversations
              </p>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search conversations by user or content..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Conversations Table */}
            <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-4 text-gray-400 font-medium">
                        User
                      </th>
                      <th className="text-left p-4 text-gray-400 font-medium">
                        Topic
                      </th>
                      <th className="text-left p-4 text-gray-400 font-medium">
                        Created
                      </th>
                      <th className="text-left p-4 text-gray-400 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConversations.map((conversation) => (
                      <tr
                        key={conversation.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                              {conversation.user?.avatar_url ? (
                                <img
                                  src={conversation.user.avatar_url}
                                  alt={conversation.user.full_name || "User"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {conversation.user?.full_name ||
                                  conversation.user?.email ||
                                  "User"}
                              </p>
                              <p className="text-sm text-gray-400">
                                {conversation.user?.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <MessageSquare className="w-5 h-5 text-gray-400" />
                              <span className="text-gray-400">
                                {conversation.topic || "No topic"}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {conversation.language_style}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-400">
                          <div className="flex flex-col">
                            <span>
                              {format(
                                new Date(conversation.created_at),
                                "MMM d, yyyy"
                              )}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(
                                new Date(conversation.last_message_at),
                                "h:mm a"
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                setSelectedConversation(conversation)
                              }
                              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                              title="View Conversation"
                            >
                              <Eye className="w-5 h-5 text-gray-400" />
                            </button>
                            <button
                              onClick={() =>
                                deleteConversation(conversation.id)
                              }
                              disabled={actionInProgress === conversation.id}
                              className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete Conversation"
                            >
                              {actionInProgress === conversation.id ? (
                                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>

        {/* Conversation Detail Modal */}
        {selectedConversation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gray-900/90 rounded-xl border border-gray-800 p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Conversation Details
                  </h2>
                  <p className="text-gray-400">
                    {format(
                      new Date(selectedConversation.created_at),
                      "MMMM d, yyyy"
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* User Info */}
              <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                    {selectedConversation.user?.avatar_url ? (
                      <img
                        src={selectedConversation.user.avatar_url}
                        alt={selectedConversation.user.full_name || "User"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {selectedConversation.user?.full_name ||
                        selectedConversation.user?.email ||
                        "User"}
                    </p>
                    <p className="text-gray-400">
                      {selectedConversation.user?.email || "No email"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Topic</p>
                    <p className="text-white">
                      {selectedConversation.topic || "No topic"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Language Style</p>
                    <p className="text-white capitalize">
                      {selectedConversation.language_style}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Created</p>
                    <p className="text-white">
                      {format(
                        new Date(selectedConversation.created_at),
                        "MMMM d, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Last Message</p>
                    <p className="text-white">
                      {format(
                        new Date(selectedConversation.last_message_at),
                        "MMMM d, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gray-800/50">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white">
                        This conversation&apos;s messages are stored in a
                        separate table.
                      </p>
                      <p className="text-xs text-gray-400 mt-1">AI Assistant</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => deleteConversation(selectedConversation.id)}
                  disabled={actionInProgress === selectedConversation.id}
                  className="px-4 py-2 rounded-lg text-sm flex items-center space-x-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionInProgress === selectedConversation.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Conversation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
