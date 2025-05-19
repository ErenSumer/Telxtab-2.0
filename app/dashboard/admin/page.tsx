"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { LoadingScreen } from "@/components/ui/loading";
import AdminSidebar from "@/components/layouts/admin-sidebar";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Users, Shield, UserX, TrendingUp } from "lucide-react";

// Define types for our data
interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  last_sign_in?: string;
  preferred_language?: string;
  learning_languages?: string[];
  study_hours?: number;
}

interface DashboardStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  banned_users: number;
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_users: 0,
    active_users: 0,
    admin_users: 0,
    banned_users: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }

    // If user is not admin, redirect to dashboard
    if (!loading && !profile?.is_admin) {
      router.push("/dashboard");
      return;
    }

    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch all users
        const { data: usersData } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (usersData) {
          setUsers(usersData);
          setDashboardStats({
            total_users: usersData.length,
            active_users: usersData.filter((u) => !u.is_banned).length,
            admin_users: usersData.filter((u) => u.is_admin).length,
            banned_users: usersData.filter((u) => u.is_banned).length,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, loading, router, profile, supabase]);

  const toggleUserBan = async (userId: string, currentBanStatus: boolean) => {
    try {
      await supabase
        .from("profiles")
        .update({ is_banned: !currentBanStatus })
        .eq("id", userId);

      // Refresh users list
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersData) {
        setUsers(usersData);
        setDashboardStats({
          total_users: usersData.length,
          active_users: usersData.filter((u) => !u.is_banned).length,
          admin_users: usersData.filter((u) => u.is_admin).length,
          banned_users: usersData.filter((u) => u.is_banned).length,
        });
      }
    } catch (error) {
      console.error("Error toggling ban status:", error);
    }
  };

  const toggleUserAdmin = async (
    userId: string,
    currentAdminStatus: boolean
  ) => {
    try {
      await supabase
        .from("profiles")
        .update({ is_admin: !currentAdminStatus })
        .eq("id", userId);

      // Refresh users list
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersData) {
        setUsers(usersData);
        setDashboardStats({
          total_users: usersData.length,
          active_users: usersData.filter((u) => !u.is_banned).length,
          admin_users: usersData.filter((u) => u.is_admin).length,
          banned_users: usersData.filter((u) => u.is_banned).length,
        });
      }
    } catch (error) {
      console.error("Error toggling admin status:", error);
    }
  };

  if (loading || isLoading) {
    return <LoadingScreen />;
  }

  if (!user || !profile?.is_admin) {
    return null;
  }

  const adminStats = [
    {
      name: "Total Users",
      value: dashboardStats.total_users,
      icon: Users,
      trend: `+${dashboardStats.total_users - dashboardStats.banned_users}`,
      color: "from-blue-500 to-cyan-500",
      description: "Platform users",
      progress: 100,
      bgColor: "bg-blue-500/10",
    },
    {
      name: "Active Users",
      value: dashboardStats.active_users,
      icon: Users,
      trend: `${((dashboardStats.active_users / dashboardStats.total_users) * 100).toFixed(1)}%`,
      color: "from-green-500 to-emerald-500",
      description: "Currently active",
      progress:
        (dashboardStats.active_users / dashboardStats.total_users) * 100,
      bgColor: "bg-green-500/10",
    },
    {
      name: "Admin Users",
      value: dashboardStats.admin_users,
      icon: Shield,
      trend: `${((dashboardStats.admin_users / dashboardStats.total_users) * 100).toFixed(1)}%`,
      color: "from-purple-500 to-pink-500",
      description: "With admin privileges",
      progress: (dashboardStats.admin_users / dashboardStats.total_users) * 100,
      bgColor: "bg-purple-500/10",
    },
    {
      name: "Banned Users",
      value: dashboardStats.banned_users,
      icon: UserX,
      trend: `${((dashboardStats.banned_users / dashboardStats.total_users) * 100).toFixed(1)}%`,
      color: "from-red-500 to-orange-500",
      description: "Suspended accounts",
      progress:
        (dashboardStats.banned_users / dashboardStats.total_users) * 100,
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <div className="flex-1 ml-[280px]">
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-400">Manage your platform and users</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {adminStats.map((stat) => (
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
              ))}
            </div>

            {/* User Management Table */}
            <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold text-white mb-6">
                User Management
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-gray-800">
                      <th className="pb-4 text-gray-400">User</th>
                      <th className="pb-4 text-gray-400">Email</th>
                      <th className="pb-4 text-gray-400">Status</th>
                      <th className="pb-4 text-gray-400">Role</th>
                      <th className="pb-4 text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-800/50">
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={user.avatar_url}
                              alt={user.full_name || "User Avatar"}
                              className="w-8 h-8 rounded-full"
                            />
                            <span className="text-white">
                              {user.full_name || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 text-gray-300">{user.email}</td>
                        <td className="py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              user.is_banned
                                ? "bg-red-500/20 text-red-400"
                                : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            {user.is_banned ? "Banned" : "Active"}
                          </span>
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              user.is_admin
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {user.is_admin ? "Admin" : "User"}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() =>
                                toggleUserBan(user.id, user.is_banned)
                              }
                              className={`px-3 py-1 rounded-lg text-xs ${
                                user.is_banned
                                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                  : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              }`}
                            >
                              {user.is_banned ? "Unban" : "Ban"}
                            </button>
                            <button
                              onClick={() =>
                                toggleUserAdmin(user.id, user.is_admin)
                              }
                              className={`px-3 py-1 rounded-lg text-xs ${
                                user.is_admin
                                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                  : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                              }`}
                            >
                              {user.is_admin ? "Remove Admin" : "Make Admin"}
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
      </div>
    </div>
  );
}
