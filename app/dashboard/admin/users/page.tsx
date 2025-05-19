"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { LoadingScreen } from "@/components/ui/loading";
import AdminSidebar from "@/components/layouts/admin-sidebar";
import {
  Search,
  Shield,
  Eye,
  Ban,
  Clock,
  Languages,
  Timer,
  Trophy,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  preferred_language?: string;
  learning_languages?: string[];
  study_hours?: number;
}

export default function UsersPage() {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "banned" | "admin"
  >("all");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
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

    fetchUsers();
  }, [user, loading, profile, router]);

  const fetchUsers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to fetch users");
        throw error;
      }

      if (usersData) {
        setUsers(usersData);
        setFilteredUsers(usersData);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterUsers(query, filterStatus);
  };

  const handleFilterChange = (
    status: "all" | "active" | "banned" | "admin"
  ) => {
    setFilterStatus(status);
    filterUsers(searchQuery, status);
  };

  const filterUsers = (query: string, status: string) => {
    let filtered = users;

    // Apply search filter
    if (query) {
      filtered = filtered.filter(
        (user) =>
          user.email?.toLowerCase().includes(query.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(query.toLowerCase()) ||
          user.username?.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply status filter
    switch (status) {
      case "active":
        filtered = filtered.filter((user) => !user.is_banned);
        break;
      case "banned":
        filtered = filtered.filter((user) => user.is_banned);
        break;
      case "admin":
        filtered = filtered.filter((user) => user.is_admin);
        break;
    }

    setFilteredUsers(filtered);
  };

  const toggleUserBan = async (userId: string, currentBanStatus: boolean) => {
    try {
      setActionInProgress(userId + "_ban");
      const newStatus = !currentBanStatus;

      // Update the user's ban status directly
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: newStatus })
        .eq("id", userId);

      if (error) {
        console.error("Error updating ban status:", error);
        toast.error("Failed to update user status");
        return;
      }

      // Update local state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, is_banned: newStatus } : user
        )
      );
      setFilteredUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, is_banned: newStatus } : user
        )
      );

      // Update selected user if modal is open
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) =>
          prev ? { ...prev, is_banned: newStatus } : null
        );
      }

      toast.success(`User ${newStatus ? "banned" : "unbanned"} successfully`);
    } catch (error) {
      console.error("Error toggling ban status:", error);
      toast.error("An error occurred while updating user status");
    } finally {
      setActionInProgress("");
    }
  };

  const toggleUserAdmin = async (
    userId: string,
    currentAdminStatus: boolean
  ) => {
    try {
      setActionInProgress(userId + "_admin");
      const newStatus = !currentAdminStatus;

      // Update the user's admin status directly
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: newStatus })
        .eq("id", userId);

      if (error) {
        console.error("Error updating admin status:", error);
        toast.error("Failed to update user role");
        return;
      }

      // Update local state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, is_admin: newStatus } : user
        )
      );
      setFilteredUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, is_admin: newStatus } : user
        )
      );

      // Update selected user if modal is open
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) =>
          prev ? { ...prev, is_admin: newStatus } : null
        );
      }

      toast.success(
        `User ${newStatus ? "made admin" : "removed from admin"} successfully`
      );
    } catch (error) {
      console.error("Error toggling admin status:", error);
      toast.error("An error occurred while updating user role");
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
                User Management
              </h1>
              <p className="text-gray-400">Manage and monitor user accounts</p>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <select
                  value={filterStatus}
                  onChange={(e) =>
                    handleFilterChange(
                      e.target.value as "all" | "active" | "banned" | "admin"
                    )
                  }
                  className="px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Users</option>
                  <option value="banned">Banned Users</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-4 text-gray-400 font-medium">
                        User
                      </th>
                      <th className="text-left p-4 text-gray-400 font-medium">
                        Status
                      </th>
                      <th className="text-left p-4 text-gray-400 font-medium">
                        Role
                      </th>
                      <th className="text-left p-4 text-gray-400 font-medium">
                        Joined
                      </th>
                      <th className="text-left p-4 text-gray-400 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>
                                {user.full_name
                                  ? user.full_name[0]
                                  : user.email?.[0].toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-white font-medium">
                                {user.full_name || "N/A"}
                              </p>
                              <p className="text-sm text-gray-400">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
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
                        <td className="p-4">
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
                        <td className="p-4 text-gray-400">
                          {format(new Date(user.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                              title="View Profile"
                            >
                              <Eye className="w-5 h-5 text-gray-400" />
                            </button>
                            <button
                              onClick={() =>
                                toggleUserBan(user.id, user.is_banned)
                              }
                              disabled={actionInProgress === user.id + "_ban"}
                              className={`p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={user.is_banned ? "Unban User" : "Ban User"}
                            >
                              {actionInProgress === user.id + "_ban" ? (
                                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                              ) : (
                                <Ban className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                toggleUserAdmin(user.id, user.is_admin)
                              }
                              disabled={actionInProgress === user.id + "_admin"}
                              className={`p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={
                                user.is_admin ? "Remove Admin" : "Make Admin"
                              }
                            >
                              {actionInProgress === user.id + "_admin" ? (
                                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                              ) : (
                                <Shield className="w-5 h-5 text-gray-400" />
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

        {/* User Profile Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gray-900/90 rounded-xl border border-gray-800 p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback>
                      {selectedUser.full_name
                        ? selectedUser.full_name[0]
                        : selectedUser.email?.[0].toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedUser.full_name || "N/A"}
                    </h2>
                    <p className="text-gray-400">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-5 h-5 text-purple-400" />
                      <h3 className="text-white font-medium">Account Info</h3>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">
                        Joined:{" "}
                        {format(
                          new Date(selectedUser.created_at),
                          "MMMM d, yyyy"
                        )}
                      </p>
                      <p className="text-sm text-gray-400">
                        Status:{" "}
                        <span
                          className={
                            selectedUser.is_banned
                              ? "text-red-400"
                              : "text-green-400"
                          }
                        >
                          {selectedUser.is_banned ? "Banned" : "Active"}
                        </span>
                      </p>
                      <p className="text-sm text-gray-400">
                        Role:{" "}
                        <span
                          className={
                            selectedUser.is_admin
                              ? "text-purple-400"
                              : "text-gray-400"
                          }
                        >
                          {selectedUser.is_admin ? "Administrator" : "User"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Languages className="w-5 h-5 text-purple-400" />
                      <h3 className="text-white font-medium">
                        Language Preferences
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">
                        Preferred Language:{" "}
                        {selectedUser.preferred_language || "Not set"}
                      </p>
                      <p className="text-sm text-gray-400">
                        Learning:{" "}
                        {selectedUser.learning_languages?.length
                          ? selectedUser.learning_languages.join(", ")
                          : "None"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Timer className="w-5 h-5 text-purple-400" />
                      <h3 className="text-white font-medium">Study Progress</h3>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">
                        Total Study Hours: {selectedUser.study_hours || 0}
                      </p>
                      {/* Add more study stats here */}
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Trophy className="w-5 h-5 text-purple-400" />
                      <h3 className="text-white font-medium">Achievements</h3>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">Coming soon...</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() =>
                    toggleUserBan(selectedUser.id, selectedUser.is_banned)
                  }
                  disabled={actionInProgress === selectedUser.id + "_ban"}
                  className={`px-4 py-2 rounded-lg text-sm flex items-center space-x-2 ${
                    selectedUser.is_banned
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {actionInProgress === selectedUser.id + "_ban" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>
                      {selectedUser.is_banned ? "Unban User" : "Ban User"}
                    </span>
                  )}
                </button>
                <button
                  onClick={() =>
                    toggleUserAdmin(selectedUser.id, selectedUser.is_admin)
                  }
                  disabled={actionInProgress === selectedUser.id + "_admin"}
                  className={`px-4 py-2 rounded-lg text-sm flex items-center space-x-2 ${
                    selectedUser.is_admin
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {actionInProgress === selectedUser.id + "_admin" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>
                      {selectedUser.is_admin ? "Remove Admin" : "Make Admin"}
                    </span>
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
