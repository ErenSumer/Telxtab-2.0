"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, User, Globe, BookOpen, Upload } from "lucide-react";
import { LoadingScreen } from "@/components/ui/loading";
import Sidebar from "@/components/layouts/sidebar";
import { useProfile } from "@/context/ProfileContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import AdminSidebar from "@/components/layouts/admin-sidebar";

const AVAILABLE_LANGUAGES = [
  "English"
];

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const { profile, updateProfile, refreshProfile } = useProfile();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [, setIsUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setIsRedirecting(true);
      router.push("/");
      return;
    }

    if (user) {
      setIsLoading(false);
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let avatarUrl = profile.avatar_url;

      // Handle avatar upload if a new file is selected
      if (avatarFile && user) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);
        avatarUrl = publicUrl;
      }

      // Update profile with all changes including avatar
      const { error } = await supabase
        .from("profiles")
        .update({
          username: profile.username,
          full_name: profile.full_name,
          bio: profile.bio,
          preferred_language: profile.preferred_language,
          learning_languages: profile.learning_languages,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (error) throw error;
      setSuccess("Profile updated successfully!");
      await refreshProfile();
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return;

    setIsUploading(true);
    try {
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSuccess("Profile picture updated successfully!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      setError("Failed to upload profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading || isRedirecting) {
    return <LoadingScreen />;
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#0A0A0A]">
      <AdminSidebar/>
      <div className="flex-1 ml-[280px]">
        

        <div className="pt-20 px-8 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/40 backdrop-blur-xl rounded-3xl p-8 border border-gray-800/50 shadow-2xl shadow-purple-500/10">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                    Profile Settings
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Manage your account settings and preferences
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                    <Avatar className="h-24 w-24 ring-2 ring-purple-500/30 transition-all duration-300 group-hover:ring-purple-500/50 relative">
                      <AvatarImage
                        src={avatarPreview || profile?.avatar_url || undefined}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500/30 to-pink-500/30 text-xl">
                        {profile?.full_name
                          ? profile.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full backdrop-blur-sm">
                      <label
                        htmlFor="avatar"
                        className="cursor-pointer p-4 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 hover:from-purple-500/40 hover:to-pink-500/40 transition-all duration-300 shadow-lg shadow-purple-500/20"
                      >
                        <Upload className="w-7 h-7 text-white" />
                      </label>
                      <input
                        id="avatar"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm backdrop-blur-sm"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm backdrop-blur-sm"
                >
                  {success}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label
                      htmlFor="username"
                      className="text-sm font-medium text-gray-300"
                    >
                      Username
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-400 transition-colors">
                          <User size={18} />
                        </div>
                        <Input
                          id="username"
                          value={profile.username}
                          onChange={(e) => {
                            const updatedProfile = {
                              ...profile,
                              username: e.target.value,
                            };
                            updateProfile(updatedProfile);
                          }}
                          className="pl-12 bg-gray-800/50 border-gray-700 focus:border-purple-500 text-white transition-all duration-300 h-12"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label
                      htmlFor="full_name"
                      className="text-sm font-medium text-gray-300"
                    >
                      Full Name
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-400 transition-colors">
                          <User size={18} />
                        </div>
                        <Input
                          id="full_name"
                          value={profile.full_name || ""}
                          onChange={(e) => {
                            const updatedProfile = {
                              ...profile,
                              full_name: e.target.value,
                            };
                            updateProfile(updatedProfile);
                          }}
                          className="pl-12 bg-gray-800/50 border-gray-700 focus:border-purple-500 text-white transition-all duration-300 h-12"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label
                    htmlFor="bio"
                    className="text-sm font-medium text-gray-300"
                  >
                    Bio
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative">
                      <Textarea
                        id="bio"
                        value={profile.bio || ""}
                        onChange={(e) => {
                          const updatedProfile = {
                            ...profile,
                            bio: e.target.value,
                          };
                          updateProfile(updatedProfile);
                        }}
                        className="bg-gray-800/50 border-gray-700 focus:border-purple-500 text-white transition-all duration-300 min-h-[120px]"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label
                      htmlFor="preferred_language"
                      className="text-sm font-medium text-gray-300"
                    >
                      Preferred Language
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-400 transition-colors">
                          <Globe size={18} />
                        </div>
                        <Select
                          value={profile.preferred_language || ""}
                          onValueChange={(value) =>
                            updateProfile({
                              ...profile,
                              preferred_language: value,
                            })
                          }
                        >
                          <SelectTrigger className="pl-12 bg-gray-800/50 border-gray-700 focus:border-purple-500 text-white transition-all duration-300 h-12">
                            <SelectValue placeholder="Select your preferred language" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-800">
                            {AVAILABLE_LANGUAGES.map((lang) => (
                              <SelectItem
                                key={lang}
                                value={lang}
                                className="hover:bg-gray-800"
                              >
                                {lang}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label
                      htmlFor="learning_languages"
                      className="text-sm font-medium text-gray-300"
                    >
                      Learning Languages
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-400 transition-colors">
                          <BookOpen size={18} />
                        </div>
                        <Select
                          value={profile.learning_languages?.join(",") || ""}
                          onValueChange={(value) =>
                            updateProfile({
                              ...profile,
                              learning_languages: value ? value.split(",") : [],
                            })
                          }
                        >
                          <SelectTrigger className="pl-12 bg-gray-800/50 border-gray-700 focus:border-purple-500 text-white transition-all duration-300 h-12">
                            <SelectValue placeholder="Select languages you're learning" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-800">
                            {AVAILABLE_LANGUAGES.map((lang) => (
                              <SelectItem
                                key={lang}
                                value={lang}
                                className="hover:bg-gray-800"
                              >
                                {lang}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-8">
                  <Button
                    type="submit"
                    className="relative group overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 px-8 py-6 rounded-xl"
                    disabled={isSaving}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative flex items-center">
                      {isSaving ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-5 w-5" />
                      )}
                      <span className="font-medium">Save Changes</span>
                    </div>
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
