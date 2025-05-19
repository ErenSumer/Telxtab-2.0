"use client";

import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { LoadingScreen } from "@/components/ui/loading";
import Sidebar from "@/components/layouts/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Edit2,
  Save,
  X,
  Camera,
  UserPlus,
  MessageSquare,
  Sparkles,
  UserMinus,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SuggestedUser {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  preferred_language?: string;
  learning_languages?: string[];
  match_reason: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    bio: "",
    preferred_language: "",
    learning_languages: [] as string[],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [profileStats, setProfileStats] = useState({
    followers: 0,
    following: 0,
    totalConnections: 0,
    activeConnections: 0,
    study_hours: 0,
    xp: 0,
  });
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        preferred_language: profile.preferred_language || "",
        learning_languages: profile.learning_languages || [],
      });
      fetchSuggestedUsers();
      fetchAllUsersAndFollowing();
      fetchProfileStats();
    }
  }, [profile]);

  const fetchAllUsersAndFollowing = async () => {
    if (!user) return;
    try {
      // Get all users except self
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id);
      if (usersError) throw usersError;
      setAllUsers(users || []);

      // Get following ids
      const { data: following, error: followingError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      if (followingError) throw followingError;
      setFollowingIds(following.map((f) => f.following_id));
    } catch (error) {
      console.error("Error fetching users/following:", error);
    }
  };

  const fetchSuggestedUsers = async () => {
    if (!profile) return;

    setIsLoadingSuggestions(true);
    try {
      // Get users who are not already followed
      const { data: following, error: followingError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user?.id);

      if (followingError) throw followingError;

      const followingIds = following.map((f) => f.following_id);
      followingIds.push(user?.id || ""); // Exclude self

      // Get potential matches based on learning preferences
      const { data: potentialMatches, error: matchesError } = await supabase
        .from("profiles")
        .select("*")
        .not("id", "in", `(${followingIds.join(",")})`)
        .limit(20);

      if (matchesError) throw matchesError;

      // Use AI to analyze and rank potential matches
      const model = new GoogleGenerativeAI(
        process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
      );
      const genModel = model.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are a language learning matchmaker. Analyze these potential language learning connections and suggest the best matches.
        User Profile:
        - Learning Languages: ${profile.learning_languages?.join(", ")}
        - Preferred Language: ${profile.preferred_language}
        - Bio: ${profile.bio}

        Potential Matches:
        ${potentialMatches
          .map(
            (match) => `
          - ID: ${match.id}
          - Name: ${match.full_name}
          - Learning: ${match.learning_languages?.join(", ")}
          - Preferred: ${match.preferred_language}
          - Bio: ${match.bio}
        `
          )
          .join("\n")}

        For each potential match, provide:
        1. A match score (0-100)
        2. A brief explanation of why they would be a good connection
        3. Select the top 5 matches

        Return ONLY a JSON array with the following structure, no other text:
        [
          {
            "id": "user_id",
            "match_score": number,
            "match_reason": "explanation"
          }
        ]`;

      const result = await genModel.generateContent(prompt);
      const response = result.response.text();

      // Extract JSON from the response
      let matches;
      try {
        // Try to parse the response directly
        matches = JSON.parse(response);
      } catch (error) {
        // If direct parsing fails, try to extract JSON from the text
        const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (!jsonMatch) {
          throw new Error("Failed to parse AI response");
        }
        matches = JSON.parse(jsonMatch[0]);
      }

      // Validate matches structure
      if (!Array.isArray(matches)) {
        throw new Error("Invalid matches format");
      }

      // Combine match data with user profiles
      const suggestedUsers = potentialMatches
        .filter((match) =>
          matches.some((m: { id: string }) => m.id === match.id)
        )
        .map((match) => ({
          ...match,
          match_score:
            matches.find(
              (m: { id: string; match_score?: number }) => m.id === match.id
            )?.match_score || 0,
          match_reason:
            matches.find(
              (m: { id: string; match_reason?: string }) => m.id === match.id
            )?.match_reason || "",
        }))
        .sort((a, b) => {
          const scoreA = a.match_score || 0;
          const scoreB = b.match_score || 0;
          return scoreB - scoreA;
        })
        .slice(0, 5);

      setSuggestedUsers(suggestedUsers);
    } catch (error) {
      console.error("Error fetching suggested users:", error);
      toast.error("Failed to load suggested connections");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      const { error } = await supabase.from("follows").insert({
        follower_id: user?.id,
        following_id: userId,
      });
      if (error) throw error;
      toast.success("Followed successfully");
      fetchAllUsersAndFollowing();
      fetchSuggestedUsers();
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("Failed to follow user");
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user?.id)
        .eq("following_id", userId);
      if (error) throw error;
      toast.success("Unfollowed successfully");
      fetchAllUsersAndFollowing();
      fetchSuggestedUsers();
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow user");
    }
  };

  // Filter users by search
  const filteredUsers = allUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  });
  const peopleYouFollow = filteredUsers.filter((u) =>
    followingIds.includes(u.id)
  );
  const peopleYouDontFollow = filteredUsers.filter(
    (u) => !followingIds.includes(u.id)
  );

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          username: formData.username,
          bio: formData.bio,
          preferred_language: formData.preferred_language,
          learning_languages: formData.learning_languages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (error) throw error;
      await refreshProfile();
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user?.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user?.id);

      if (updateError) throw updateError;
      await refreshProfile();
      toast.success("Avatar updated successfully!");
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error("Failed to update avatar");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfileStats = async () => {
    if (!user) return;
    try {
      // Get followers count
      const { count: followersCount, error: followersError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);
      if (followersError) throw followersError;

      // Get following count
      const { count: followingCount, error: followingError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);
      if (followingError) throw followingError;

      // Get active connections (users who have interacted in the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: activeConnections, error: activeError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .gte("created_at", thirtyDaysAgo.toISOString());
      if (activeError) throw activeError;

      // Get study hours and XP from profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("study_hours, xp")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;

      setProfileStats({
        followers: followersCount || 0,
        following: followingCount || 0,
        totalConnections: followersCount || 0,
        activeConnections: activeConnections || 0,
        study_hours: profileData?.study_hours || 0,
        xp: profileData?.xp || 0,
      });
    } catch (error) {
      console.error("Error fetching profile stats:", error);
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
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              My Profile
            </h1>
            <Button
              onClick={() => router.push("/dashboard/settings")}
              className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>

          {/* Profile Information */}
          <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-8 border border-gray-800 mb-8">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center space-x-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {profile?.full_name
                      ? profile.full_name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                      : profile?.username?.[0].toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                    {profile?.full_name}
                  </h2>
                  <p className="text-gray-400">@{profile?.username}</p>
                  {profile?.bio && (
                    <p className="text-gray-300 mt-2">{profile.bio}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
                  Learning Stats
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400">Study Hours</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {profileStats.study_hours}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">XP Points</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {profileStats.xp}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
                  Languages
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400">Preferred Language</p>
                    <p className="text-lg text-purple-400">
                      {profile?.preferred_language || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Learning</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile?.learning_languages?.map((lang) => (
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
                <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
                  Follow Stats
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400">Followers</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {profileStats.followers}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Following</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {profileStats.following}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
                Member Since
              </h3>
              <p className="text-purple-400">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <Input
              placeholder="Search people by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border-gray-700 text-gray-300 placeholder-gray-500"
            />
          </div>

          {/* People You Follow */}
          <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-8 border border-gray-800 mb-8">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
              People You Follow
            </h2>
            {peopleYouFollow.length === 0 ? (
              <p className="text-gray-400">You are not following anyone yet.</p>
            ) : (
              <div className="space-y-4">
                {peopleYouFollow.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-4">
                      <Link href={`/dashboard/profile/${user.id}`}>
                        <Avatar className="w-10 h-10 cursor-pointer">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.full_name
                              ? user.full_name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                              : user.username?.[0].toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div>
                        <Link
                          href={`/dashboard/profile/${user.id}`}
                          className="text-lg font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          {user.full_name}
                        </Link>
                        <p className="text-gray-400">@{user.username}</p>
                        {user.bio && (
                          <p className="text-gray-300 mt-1">{user.bio}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleUnfollow(user.id)}
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Unfollow
                      </Button>
                      <Link href={`/dashboard/messages?user=${user.id}`}>
                        <Button
                          variant="outline"
                          className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-8 border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                Suggested Connections
              </h2>
              <Button
                onClick={fetchSuggestedUsers}
                disabled={isLoadingSuggestions}
                variant="outline"
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Refresh Suggestions
              </Button>
            </div>

            {isLoadingSuggestions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">
                  Finding your perfect language learning partners...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {suggestedUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <Link href={`/dashboard/profile/${user.id}`}>
                          <Avatar className="w-12 h-12 cursor-pointer">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.full_name
                                ? user.full_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                : user.username?.[0].toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div>
                          <Link
                            href={`/dashboard/profile/${user.id}`}
                            className="text-lg font-semibold text-white hover:text-purple-400 transition-colors"
                          >
                            {user.full_name}
                          </Link>
                          <p className="text-gray-400">@{user.username}</p>
                          {user.bio && (
                            <p className="text-gray-300 mt-1">{user.bio}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {user.learning_languages?.map((lang) => (
                              <span
                                key={lang}
                                className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs"
                              >
                                Learning {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleFollow(user.id)}
                          variant="outline"
                          className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Follow
                        </Button>
                        <Link href={`/dashboard/messages?user=${user.id}`}>
                          <Button
                            variant="outline"
                            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-purple-500/10 rounded-lg">
                      <p className="text-purple-400 text-sm">
                        <Sparkles className="w-4 h-4 inline mr-2" />
                        {user.match_reason}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {suggestedUsers.length === 0 && !isLoadingSuggestions && (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">
                      No suggestions available at the moment. Try updating your
                      profile with more details about your language learning
                      goals!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
