"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { LoadingScreen } from "@/components/ui/loading";
import Sidebar from "@/components/layouts/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, UserPlus, UserMinus } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import { use } from "react";

interface Profile {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  preferred_language?: string;
  learning_languages?: string[];
  study_hours?: number;
  xp?: number;
  created_at: string;
}

interface FollowStats {
  followers: number;
  following: number;
}

export default function ProfileViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const [profileData, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState<FollowStats>({
    followers: 0,
    following: 0,
  });
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchProfile();
    fetchFollowStatus();
    fetchFollowStats();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFollowStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", user.id)
        .eq("following_id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error("Error fetching follow status:", error);
    }
  };

  const fetchFollowStats = async () => {
    try {
      const [followers, following] = await Promise.all([
        supabase
          .from("follows")
          .select("id", { count: "exact" })
          .eq("following_id", id),
        supabase
          .from("follows")
          .select("id", { count: "exact" })
          .eq("follower_id", id),
      ]);

      if (followers.error) throw followers.error;
      if (following.error) throw following.error;

      setFollowStats({
        followers: followers.count || 0,
        following: following.count || 0,
      });
    } catch (error) {
      console.error("Error fetching follow stats:", error);
    }
  };

  const handleFollow = async () => {
    if (!user) return;

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", id);

        if (error) throw error;
        setIsFollowing(false);
        setFollowStats((prev) => ({
          ...prev,
          followers: prev.followers - 1,
        }));
        toast.success("Unfollowed successfully");
      } else {
        // Follow
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: id,
        });

        if (error) throw error;
        setIsFollowing(true);
        setFollowStats((prev) => ({
          ...prev,
          followers: prev.followers + 1,
        }));
        toast.success("Followed successfully");
      }
    } catch (error) {
      console.error("Error following/unfollowing:", error);
      toast.error("Failed to update follow status");
    }
  };

  if (isLoading || !profileData) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <main className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-8 border border-gray-800">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center space-x-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profileData.avatar_url || undefined} />
                  <AvatarFallback>
                    {profileData.full_name
                      ? profileData.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                      : profileData.username?.[0].toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    {profileData.full_name}
                  </h1>
                  <p className="text-gray-400">@{profileData.username}</p>
                  {profileData.bio && (
                    <p className="text-gray-300 mt-2">{profileData.bio}</p>
                  )}
                </div>
              </div>

              {user && user.id !== profileData.id && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleFollow}
                    variant="outline"
                    className={`${
                      isFollowing
                        ? "border-red-500/50 text-red-400 hover:bg-red-500/10"
                        : "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="w-4 h-4 mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                  <Link href={`/dashboard/messages?user=${profileData.id}`}>
                    <Button
                      variant="outline"
                      className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Learning Stats
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400">Study Hours</p>
                    <p className="text-2xl font-bold text-white">
                      {profileData.study_hours || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">XP Points</p>
                    <p className="text-2xl font-bold text-white">
                      {profileData.xp || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Languages
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400">Preferred Language</p>
                    <p className="text-lg text-white">
                      {profileData.preferred_language || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Learning</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profileData.learning_languages?.map((lang) => (
                        <span
                          key={lang}
                          className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Follow Stats
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400">Followers</p>
                    <p className="text-2xl font-bold text-white">
                      {followStats.followers}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Following</p>
                    <p className="text-2xl font-bold text-white">
                      {followStats.following}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Member Since
              </h3>
              <p className="text-gray-300">
                {new Date(profileData.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
