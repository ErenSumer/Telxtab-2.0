"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "@/components/layouts/sidebar";
import {
  Bell,
  Info,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "achievement";
  is_read: boolean;
  created_at: string;
  action_url?: string;
  action_text?: string;
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!user && !loading) {
      router.push("/");
      return;
    }

    if (!user) return;

    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setNotifications(data || []);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        toast.error("Failed to load notifications");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();

    // Set up real-time subscription
    const subscription = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          toast.info("New notification received!");
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, loading, router, supabase]);

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, is_read: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from("notifications").delete().eq("id", id);

      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      toast.success("Notification removed");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user?.id)
        .eq("is_read", false);

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const clearAllNotifications = async () => {
    try {
      await supabase.from("notifications").delete().eq("user_id", user?.id);

      setNotifications([]);
      toast.success("All notifications cleared");
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error("Failed to clear notifications");
    }
  };

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

  const getNotificationBg = (type: string, isRead: boolean) => {
    if (isRead) return "bg-gray-800/50";

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <div className="flex-1 ml-[280px]">
        <main className="pt-16 pb-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Notifications
                </h1>
                <p className="text-gray-400">
                  Stay updated on your learning journey
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Mark all as read
                </button>
                <button
                  onClick={clearAllNotifications}
                  className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : notifications.length > 0 ? (
              <AnimatePresence initial={false}>
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-4 p-4 rounded-xl border ${getNotificationBg(notification.type, notification.is_read)} transition-colors relative overflow-hidden`}
                    >
                      <div className={`p-3 rounded-full bg-gray-800/70`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <h3
                            className={`font-medium ${notification.is_read ? "text-gray-300" : "text-white"}`}
                          >
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(notification.created_at)}
                            </span>
                            <button
                              onClick={() =>
                                deleteNotification(notification.id)
                              }
                              className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p
                          className={`text-sm mt-1 ${notification.is_read ? "text-gray-500" : "text-gray-300"}`}
                        >
                          {notification.message}
                        </p>
                        {notification.action_url &&
                          notification.action_text && (
                            <button
                              onClick={() => {
                                markAsRead(notification.id);
                                router.push(notification.action_url!);
                              }}
                              className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                            >
                              {notification.action_text}
                            </button>
                          )}
                        {!notification.is_read && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-500"></div>
                        )}
                      </div>

                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="self-center text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-800/80 hover:bg-gray-700 rounded-md transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            ) : (
              <div className="text-center py-16 bg-gray-900/20 rounded-2xl border border-gray-800/30">
                <div className="w-16 h-16 mx-auto bg-gray-800/70 rounded-full flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">
                  No notifications yet
                </h3>
                <p className="text-gray-400 mb-6">
                  We'll notify you when there's something new
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
 