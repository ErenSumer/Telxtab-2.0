"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { LoadingScreen } from "@/components/ui/loading";
import Sidebar from "@/components/layouts/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageSquare, UserPlus, UserMinus } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

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
}

export default function ProfileSearchPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [following, setFollowing] = useState<string[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchFollowing();
  }, [user]);

  const fetchFollowing = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (error) throw error;
      setFollowing(data.map((f) => f.following_id));
    } catch (error) {
      console.error("Error fetching following:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .neq("id", user?.id)
        .limit(10);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error searching profiles:", error);
      toast.error("Failed to search profiles");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (profileId: string) => {
    if (!user) return;

    try {
      if (following.includes(profileId)) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileId);

        if (error) throw error;
        setFollowing(following.filter((id) => id !== profileId));
        toast.success("Unfollowed successfully");
      } else {
        // Follow
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: profileId,
        });

        if (error) throw error;
        setFollowing([...following, profileId]);
        toast.success("Followed successfully");
      }
    } catch (error) {
      console.error("Error following/unfollowing:", error);
      toast.error("Failed to update follow status");
    }
  };

  if (!user || !profile) {
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
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-8">
              Find Language Learners
            </h1>

            <div className="flex gap-4 mb-8">
              <div className="flex-1">
                <Input
                  placeholder="Search by username or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>

            <div className="space-y-4">
              {profiles.map((profile) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/50 rounded-lg p-6 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <Link href={`/dashboard/profile/${profile.id}`}>
                      <Avatar className="w-12 h-12 cursor-pointer">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {profile.full_name
                            ? profile.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                            : profile.username?.[0].toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <Link
                        href={`/dashboard/profile/${profile.id}`}
                        className="text-lg font-semibold text-white hover:text-purple-400 transition-colors"
                      >
                        {profile.full_name}
                      </Link>
                      <p className="text-gray-400">@{profile.username}</p>
                      {profile.bio && (
                        <p className="text-gray-300 mt-1">{profile.bio}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleFollow(profile.id)}
                      variant="outline"
                      className={`${
                        following.includes(profile.id)
                          ? "border-red-500/50 text-red-400 hover:bg-red-500/10"
                          : "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                      }`}
                    >
                      {following.includes(profile.id) ? (
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
                    <Link href={`/dashboard/messages?user=${profile.id}`}>
                      <Button
                        variant="outline"
                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}

              {profiles.length === 0 && searchQuery && !isLoading && (
                <p className="text-center text-gray-400">
                  No profiles found matching your search.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
