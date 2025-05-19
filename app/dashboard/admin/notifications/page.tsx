"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/components/layouts/admin-sidebar";
import {
  Bell,
  Info,
  AlertTriangle,
  CheckCircle2,
  X,
  Users,
  ChevronRight,
  Search,
  Send,
  Plus,
  Trash2,
  Trophy,
  TrendingUp,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/context/ProfileContext";
import { motion } from "framer-motion";

interface NotificationTemplate {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "achievement";
  action_url?: string;
  action_text?: string;
}

interface User {
  id: string;
  email?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
}

export default function AdminNotificationsPage() {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] =
    useState<NotificationTemplate | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState<
    Omit<NotificationTemplate, "id">
  >({
    title: "",
    message: "",
    type: "info",
    action_url: "",
    action_text: "",
  });

  // Stats
  const [stats, setStats] = useState({
    totalNotifications: 0,
    unreadNotifications: 0,
    activeUsers: 0,
  });

  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }

    // Redirect non-admin users
    if (!loading && profile && !profile.is_admin) {
      router.push("/dashboard");
      return;
    }

    if (!user) return;

    fetchData();
  }, [user, loading, router, profile]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch notification templates
      const { data: templateData, error: templateError } = await supabase
        .from("notification_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (templateError) throw templateError;
      setTemplates(templateData || []);

      // Fetch users
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, email, full_name, username, avatar_url")
        .order("username", { ascending: true });

      if (userError) throw userError;
      setUsers(userData || []);

      // Fetch stats
      const { data: notificationCountData, error: notificationCountError } =
        await supabase.from("notifications").select("id", { count: "exact" });

      if (notificationCountError) throw notificationCountError;

      const { data: unreadCountData, error: unreadCountError } = await supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .eq("is_read", false);

      if (unreadCountError) throw unreadCountError;

      const { data: activeUsersData, error: activeUsersError } = await supabase
        .from("profiles")
        .select("id", { count: "exact" })
        .not("last_sign_in_at", "is", null);

      if (activeUsersError) throw activeUsersError;

      setStats({
        totalNotifications: notificationCountData.length,
        unreadNotifications: unreadCountData.length,
        activeUsers: activeUsersData.length,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((user) => user.id)));
    }
  };

  const createTemplate = async () => {
    try {
      // Validate
      if (!newTemplate.title.trim() || !newTemplate.message.trim()) {
        toast.error("Title and message are required");
        return;
      }

      const { data, error } = await supabase
        .from("notification_templates")
        .insert([newTemplate])
        .select()
        .single();

      if (error) throw error;

      setTemplates((prev) => [data, ...prev]);
      setShowAddTemplate(false);
      setNewTemplate({
        title: "",
        message: "",
        type: "info",
        action_url: "",
        action_text: "",
      });
      toast.success("Template created successfully");
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notification_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTemplates((prev) => prev.filter((template) => template.id !== id));
      if (selectedTemplate && selectedTemplate.id === id) {
        setSelectedTemplate(null);
      }
      toast.success("Template deleted");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const sendNotification = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    if (selectedUsers.size === 0) {
      toast.error("Please select at least one user");
      return;
    }

    try {
      // Create notifications for each selected user
      const notifications = Array.from(selectedUsers).map((userId) => ({
        user_id: userId,
        title: selectedTemplate.title,
        message: selectedTemplate.message,
        type: selectedTemplate.type,
        action_url: selectedTemplate.action_url,
        action_text: selectedTemplate.action_text,
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) throw error;

      toast.success(`Notifications sent to ${selectedUsers.size} users`);
      setSelectedUsers(new Set());
      setStats((prev) => ({
        ...prev,
        totalNotifications: prev.totalNotifications + notifications.length,
        unreadNotifications: prev.unreadNotifications + notifications.length,
      }));
    } catch (error) {
      console.error("Error sending notifications:", error);
      toast.error("Failed to send notifications");
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter((user) => {
    const searchTerm = userSearch.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchTerm) ||
      user.full_name?.toLowerCase().includes(searchTerm) ||
      user.email?.toLowerCase().includes(searchTerm)
    );
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "info":
        return <Info className="w-5 h-5 text-blue-400" />;
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case "error":
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case "achievement":
        return <Trophy className="w-5 h-5 text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getNotificationBg = (type: string) => {
    switch (type) {
      case "info":
        return "bg-blue-900/20 border-blue-700/30";
      case "success":
        return "bg-green-900/20 border-green-700/30";
      case "warning":
        return "bg-yellow-900/20 border-yellow-700/30";
      case "error":
        return "bg-red-900/20 border-red-700/30";
      case "achievement":
        return "bg-purple-900/20 border-purple-700/30";
      default:
        return "bg-gray-800/50";
    }
  };

  // Custom scrollbar styles
  const scrollbarStyle = `
    [data-custom-scrollbar]::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    [data-custom-scrollbar]::-webkit-scrollbar-track {
      background: rgba(31, 41, 55, 0.5);
      border-radius: 4px;
    }
    
    [data-custom-scrollbar]::-webkit-scrollbar-thumb {
      background: rgba(139, 92, 246, 0.5);
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    
    [data-custom-scrollbar]::-webkit-scrollbar-thumb:hover {
      background: rgba(139, 92, 246, 0.8);
    }
    
    [data-custom-scrollbar]::-webkit-scrollbar-corner {
      background: transparent;
    }
  `;

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <style jsx global>
        {scrollbarStyle}
      </style>
      <AdminSidebar />
      <div className="flex-1 ml-[280px]">
        <main className="pt-16 pb-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Notification Management
                </h1>
                <p className="text-gray-400">
                  Send and manage notifications for your users
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <Bell className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {stats.totalNotifications.toLocaleString()}
                </h3>
                <p className="text-sm text-gray-400">Total Notifications</p>
              </div>

              <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Bell className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {stats.unreadNotifications.toLocaleString()}
                </h3>
                <p className="text-sm text-gray-400">Unread Notifications</p>
              </div>

              <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Users className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {stats.activeUsers.toLocaleString()}
                </h3>
                <p className="text-sm text-gray-400">Active Users</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Templates Section */}
              <div className="lg:col-span-3 bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <h2 className="text-lg font-bold text-white">Templates</h2>
                  <button
                    onClick={() => setShowAddTemplate(true)}
                    className="p-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {showAddTemplate && (
                  <div className="p-4 border-b border-gray-800 bg-gray-800/30">
                    <h3 className="text-sm font-medium text-white mb-3">
                      New Template
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Title"
                          value={newTemplate.title}
                          onChange={(e) =>
                            setNewTemplate({
                              ...newTemplate,
                              title: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <textarea
                          placeholder="Message"
                          value={newTemplate.message}
                          onChange={(e) =>
                            setNewTemplate({
                              ...newTemplate,
                              message: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px]"
                        />
                      </div>
                      <div>
                        <select
                          value={newTemplate.type}
                          onChange={(e) =>
                            setNewTemplate({
                              ...newTemplate,
                              type: e.target.value as
                                | "info"
                                | "success"
                                | "warning"
                                | "error"
                                | "achievement",
                            })
                          }
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="info">Info</option>
                          <option value="success">Success</option>
                          <option value="warning">Warning</option>
                          <option value="error">Error</option>
                          <option value="achievement">Achievement</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Action URL (optional)"
                          value={newTemplate.action_url}
                          onChange={(e) =>
                            setNewTemplate({
                              ...newTemplate,
                              action_url: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Action Text (optional)"
                          value={newTemplate.action_text}
                          onChange={(e) =>
                            setNewTemplate({
                              ...newTemplate,
                              action_text: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setShowAddTemplate(false)}
                          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={createTemplate}
                          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className="h-[calc(100vh-400px)] overflow-y-auto"
                  data-custom-scrollbar
                >
                  {templates.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">No templates yet</p>
                    </div>
                  ) : (
                    templates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className={`p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? "bg-gray-800/70"
                            : ""
                        }`}
                      >
                        <div className="flex items-start">
                          <div className="p-2 rounded-lg bg-gray-800 mr-3">
                            {getNotificationIcon(template.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white text-sm">
                              {template.title}
                            </h3>
                            <p className="text-gray-400 text-xs line-clamp-2 mt-1">
                              {template.message}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplate(template.id);
                            }}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Users Section */}
              <div className="lg:col-span-4 bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="flex-1 bg-transparent border-none text-white focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="p-2 border-b border-gray-800">
                  <button
                    onClick={handleSelectAllUsers}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-4 h-4 rounded border mr-3 flex items-center justify-center ${
                          selectedUsers.size === filteredUsers.length &&
                          filteredUsers.length > 0
                            ? "bg-purple-500 border-purple-500"
                            : "border-gray-600"
                        }`}
                      >
                        {selectedUsers.size === filteredUsers.length &&
                          filteredUsers.length > 0 && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                      </div>
                      <span className="text-white text-sm font-medium">
                        Select all users
                      </span>
                    </div>
                    <span className="text-gray-400 text-xs">
                      {selectedUsers.size}/{filteredUsers.length}
                    </span>
                  </button>
                </div>

                <div
                  className="h-[calc(100vh-400px)] overflow-y-auto"
                  data-custom-scrollbar
                >
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-10 h-10 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">No users found</p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleSelectUser(user.id)}
                        className="flex items-center p-3 hover:bg-gray-800/50 cursor-pointer transition-colors"
                      >
                        <div
                          className={`w-4 h-4 rounded border mr-3 flex items-center justify-center ${
                            selectedUsers.has(user.id)
                              ? "bg-purple-500 border-purple-500"
                              : "border-gray-600"
                          }`}
                        >
                          {selectedUsers.has(user.id) && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-800 mr-3 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username || ""}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <Users className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white text-sm truncate">
                            {user.username ||
                              user.full_name ||
                              user.email?.split("@")[0]}
                          </h3>
                          {user.email && (
                            <p className="text-gray-400 text-xs truncate">
                              {user.email}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Preview and Send Section */}
              <div className="lg:col-span-5 bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h2 className="text-lg font-bold text-white">
                    Preview & Send
                  </h2>
                </div>

                {selectedTemplate ? (
                  <div className="p-6">
                    <div
                      className={`p-4 rounded-xl border mb-6 ${getNotificationBg(
                        selectedTemplate.type
                      )}`}
                    >
                      <div className="flex items-start">
                        <div className="p-2 rounded-lg bg-gray-800/70 mr-3">
                          {getNotificationIcon(selectedTemplate.type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-white">
                            {selectedTemplate.title}
                          </h3>
                          <p className="text-gray-300 mt-1">
                            {selectedTemplate.message}
                          </p>
                          {selectedTemplate.action_text &&
                            selectedTemplate.action_url && (
                              <button className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors">
                                {selectedTemplate.action_text}
                              </button>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-white font-medium mb-2">
                        Selected Recipients
                      </h3>
                      <div
                        className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-2"
                        data-custom-scrollbar
                      >
                        {selectedUsers.size === 0 ? (
                          <p className="text-gray-400 text-sm">
                            No recipients selected
                          </p>
                        ) : (
                          Array.from(selectedUsers).map((userId) => {
                            const user = users.find((u) => u.id === userId);
                            return (
                              <div
                                key={userId}
                                className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full"
                              >
                                <span className="text-sm text-white">
                                  {user?.username ||
                                    user?.full_name ||
                                    user?.email?.split("@")[0] ||
                                    "User"}
                                </span>
                                <button
                                  onClick={() => handleSelectUser(userId)}
                                  className="text-gray-400 hover:text-red-400"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <button
                      onClick={sendNotification}
                      disabled={selectedUsers.size === 0}
                      className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        Send to {selectedUsers.size}{" "}
                        {selectedUsers.size === 1 ? "user" : "users"}
                      </span>
                    </button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center h-[calc(100vh-380px)]"
                  >
                    <div className="text-center py-12">
                      <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-white mb-2">
                        No template selected
                      </h3>
                      <p className="text-gray-400 mb-6">
                        Select a template to send notifications
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
 