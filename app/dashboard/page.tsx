"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "@/components/layouts/sidebar";
import {
  Trophy,
  BookOpen,
  Languages,
  Timer,
  TrendingUp,
  Users,
  Medal,
  Crown,
  Bell,
  Check,
  Clock,
  Video,
  PlayCircle,
} from "lucide-react";
import React from "react";
import { StreakDisplay } from "@/components/ui/StreakDisplay";
import { StreakTester } from "@/components/ui/StreakTester";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import RankBadge from "@/components/RankBadge";

// Define types for our data
interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  is_admin: boolean;
  is_banned: boolean;
  preferred_language?: string;
  learning_languages?: string[];
  study_hours?: number;
  xp?: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  thumbnail_path: string;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  duration: number;
}

interface RecentActivity {
  id: string;
  type: "lesson" | "course";
  title: string;
  description: string;
  courseId: string;
  lessonId?: string;
  time: string;
  progress: number;
  icon: React.ElementType;
  status: "completed" | "in_progress";
  duration?: string;
}

const DashboardPage = () => {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState("");
  const [leaderboardUsers, setLeaderboardUsers] = useState<Profile[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    []
  );
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!loading && !user) {
      setRedirectMessage("Redirecting to login...");
      setIsRedirecting(true);
      router.push("/");
      return;
    }

    // If user is admin, redirect to admin dashboard
    if (!loading && profile?.is_admin) {
      setRedirectMessage("Redirecting to admin dashboard...");
      setIsRedirecting(true);
      router.push("/dashboard/admin");
      return;
    }

    setIsRedirecting(false);
  }, [user, loading, router, profile]);

  // Fetch leaderboard data
  useEffect(() => {
    if (!user) return;

    const fetchLeaderboard = async () => {
      try {
        setIsLeaderboardLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "id, username, full_name, avatar_url, xp, is_admin, is_banned"
          )
          .not("xp", "is", null)
          .order("xp", { ascending: false })
          .limit(5);

        if (error) throw error;
        setLeaderboardUsers(data || []);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setIsLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user, supabase]);

  // Fetch recent activities
  useEffect(() => {
    if (!user) return;

    const fetchRecentActivities = async () => {
      try {
        setIsActivitiesLoading(true);

        // Fetch user's recent progress data with lesson and course info
        const { data: progressData, error: progressError } = await supabase
          .from("user_progress")
          .select(
            `
            *,
            lessons:lesson_id (
              id,
              title,
              description,
              duration,
              course_id
            ),
            courses:course_id (
              id,
              title,
              description,
              language,
              level
            )
          `
          )
          .eq("user_id", user.id)
          .order("last_watched_at", { ascending: false })
          .limit(5);

        if (progressError) throw progressError;

        // Transform the progress data into activity format
        const activities: RecentActivity[] = (progressData || []).map(
          (progress) => {
            const lesson = progress.lessons as unknown as Lesson;
            const course = progress.courses as unknown as Course;

            // Format duration from seconds to minutes
            const durationInMinutes = lesson?.duration
              ? Math.round(lesson.duration / 60)
              : undefined;

            return {
              id: progress.id,
              type: "lesson",
              title: lesson?.title || "Unknown Lesson",
              description: `${course?.title || "Unknown Course"} - ${course?.language || ""}`,
              courseId: progress.course_id,
              lessonId: progress.lesson_id,
              time: formatDistanceToNow(new Date(progress.last_watched_at), {
                addSuffix: true,
              }),
              progress: progress.progress_percent,
              icon: progress.completed ? Check : Clock,
              status: progress.completed ? "completed" : "in_progress",
              duration: durationInMinutes
                ? `${durationInMinutes} min`
                : undefined,
            };
          }
        );

        setRecentActivities(activities);
      } catch (error) {
        console.error("Error fetching recent activities:", error);
      } finally {
        setIsActivitiesLoading(false);
      }
    };

    fetchRecentActivities();
  }, [user, supabase]);

  if (loading || isRedirecting) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-2xl font-bold">{redirectMessage}</div>
          <div className="text-gray-500">Please wait...</div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  // If user is banned, show banned message
  if (profile.is_banned) {
    router.push("/suspended");
  }

  const userStats = [
    {
      name: "Daily Streak",
      component: <StreakDisplay />,
    },
    {
      name: "Experience Points",
      value: profile.xp ? `${profile.xp.toLocaleString()}` : "0",
      icon: Trophy,
      trend: "+100",
      color: "from-green-500 to-emerald-500",
      description: "Total XP earned",
      progress: 65,
      bgColor: "bg-green-500/10",
    },
    {
      name: "Languages",
      value: profile.learning_languages?.length || 0,
      icon: Languages,
      trend: "+1",
      color: "from-purple-500 to-pink-500",
      description: "Languages learning",
      progress: 60,
      bgColor: "bg-purple-500/10",
    },
    {
      name: "Study Time",
      value: profile?.study_hours ? `${profile.study_hours}h` : "0h",
      icon: Timer,
      trend: "+2h",
      color: "from-blue-500 to-cyan-500",
      description: "Total study time",
      progress: 75,
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <div className="flex-1 ml-[280px]">
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Welcome Section with Rank Badge */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome back,{" "}
                  {profile.full_name || user.email?.split("@")[0] || "User"}!
                </h1>
                <p className="text-gray-400">
                  Continue your language learning journey
                </p>
              </div>
              {profile?.xp !== undefined && (
                <RankBadge xp={profile.xp} showProgress size="lg" />
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {userStats.map((stat, index) =>
                stat.component ? (
                  <React.Fragment key={index}>{stat.component}</React.Fragment>
                ) : (
                  <div
                    key={stat.name}
                    className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-800 hover:border-purple-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-400">
                          {stat.trend}
                        </span>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {stat.value}
                    </h3>
                    <p className="text-sm text-gray-400">{stat.name}</p>
                    <div className="mt-4">
                      <div className="h-1 bg-gray-800 rounded-full">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${stat.color}`}
                          style={{ width: `${stat.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Recent Activities */}
              <div className="lg:col-span-2 bg-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-800">
                <h2 className="text-xl font-bold text-white mb-6">
                  Recent Activities
                </h2>
                {isActivitiesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                ) : recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <Link
                        key={activity.id}
                        href={`/dashboard/lessons/videos/${activity.courseId}${activity.lessonId ? `/${activity.lessonId}` : ""}`}
                      >
                        <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer">
                          <div
                            className={`p-3 rounded-lg ${
                              activity.status === "completed"
                                ? "bg-green-500/20"
                                : "bg-yellow-500/20"
                            }`}
                          >
                            {activity.status === "completed" ? (
                              <Check className="w-5 h-5 text-green-400" />
                            ) : (
                              <PlayCircle className="w-5 h-5 text-yellow-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate">
                              {activity.title}
                            </h3>
                            <p className="text-sm text-gray-400 truncate">
                              {activity.description}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex items-center space-x-2 mb-1">
                              {activity.duration && (
                                <span className="text-sm text-gray-400">
                                  {activity.duration}
                                </span>
                              )}
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  activity.status === "completed"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-yellow-500/20 text-yellow-400"
                                }`}
                              >
                                {activity.status === "completed"
                                  ? "Completed"
                                  : "In Progress"}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {activity.time}
                            </span>
                            {activity.status === "in_progress" && (
                              <div className="w-full h-1 bg-gray-800 rounded-full mt-2">
                                <div
                                  className="h-full bg-yellow-500 rounded-full"
                                  style={{ width: `${activity.progress}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-800/30 rounded-xl">
                    <Video className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">
                      No activities yet
                    </h3>
                    <p className="text-sm text-gray-400 mb-6">
                      Start watching lessons to see your recent activity
                    </p>
                    <Link
                      href="/dashboard/lessons"
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Browse Lessons</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Leaderboard Section (smaller card) */}
              <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800">
                <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
                  <h2 className="text-lg font-bold text-white">
                    XP Leaderboard
                  </h2>
                  <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/20 rounded-lg">
                    <Crown className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-purple-400">Top 5</span>
                  </div>
                </div>

                {isLeaderboardLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-8 h-8 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {leaderboardUsers.map((leaderUser, index) => {
                      const isCurrentUser = leaderUser.id === profile?.id;
                      return (
                        <div
                          key={leaderUser.id}
                          className={`flex items-center p-2 rounded-lg transition-colors ${
                            isCurrentUser
                              ? "bg-purple-500/20 border border-purple-500/30"
                              : "bg-gray-800/30 hover:bg-gray-800/50"
                          }`}
                        >
                          <div className="w-6 text-center font-medium mr-2">
                            {index === 0 ? (
                              <div className="w-6 h-6 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                                <Crown className="w-3 h-3 text-yellow-100" />
                              </div>
                            ) : index === 1 ? (
                              <div className="w-6 h-6 mx-auto rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
                                <Medal className="w-3 h-3 text-gray-100" />
                              </div>
                            ) : index === 2 ? (
                              <div className="w-6 h-6 mx-auto rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
                                <Medal className="w-3 h-3 text-amber-100" />
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                {index + 1}
                              </span>
                            )}
                          </div>

                          <div className="w-8 h-8 mr-2 bg-gray-700 rounded-full overflow-hidden">
                            {leaderUser.avatar_url ? (
                              <img
                                src={leaderUser.avatar_url}
                                alt={leaderUser.username || "User"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-purple-500/20">
                                <Users className="w-4 h-4 text-purple-400" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-sm truncate">
                              {isCurrentUser
                                ? "You"
                                : leaderUser.username ||
                                  leaderUser.full_name ||
                                  "User"}
                              {isCurrentUser && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-500/30 text-purple-300 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 ml-2">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="font-bold text-white text-sm">
                              {leaderUser.xp?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {leaderboardUsers.length === 0 && (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        No data yet. Complete lessons to earn XP!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <StreakTester />
      </div>
    </div>
  );
};

export default DashboardPage;
