"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoadingScreen } from "@/components/ui/loading";
import AdminSidebar from "@/components/layouts/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import dynamic from "next/dynamic";
import { ImagePlus, Save, Eye, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Import TipTap editor dynamically to avoid SSR issues
const TipTapEditor = dynamic(
  () => import("@/components/editor/tip-tap-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 w-full bg-gray-900/50 rounded-lg animate-pulse" />
    ),
  }
);

export default function NewBlogPostPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }

    setIsSaving(true);
    try {
      let coverImageUrl = "";

      // Upload cover image if exists
      if (coverImage) {
        const fileExt = coverImage.name.split(".").pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("blog-covers")
          .upload(fileName, coverImage);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("blog-covers")
          .getPublicUrl(fileName);
        coverImageUrl = data.publicUrl;
      }

      // Calculate read time (rough estimate: 200 words per minute)
      const wordCount = content.split(/\s+/).length;
      const readTime = Math.ceil(wordCount / 200);

      // Generate slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Create blog post
      const { data: post, error } = await supabase
        .from("blog_posts")
        .insert({
          title,
          slug,
          content,
          excerpt,
          cover_image_url: coverImageUrl,
          author_id: user?.id,
          status,
          published_at:
            status === "published" ? new Date().toISOString() : null,
          tags,
          read_time: readTime,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(
        `Post ${status === "published" ? "published" : "saved as draft"} successfully`
      );
      router.push("/dashboard/admin/blog");
    } catch (error) {
      console.error("Error saving post:", error);
      toast.error("Failed to save post");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <div className="flex-1 ml-[280px]">
        <main className="pt-16">
          <div className="max-w-4xl mx-auto px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <Link href="/dashboard/admin/blog">
                    <Button
                      variant="outline"
                      className="border-gray-800 text-gray-300 hover:bg-gray-800/50"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      New Blog Post
                    </h1>
                    <p className="text-gray-400 mt-2">
                      Create a new blog post for Telxtab
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/blog/preview")}
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Post"}
                  </Button>
                </div>
              </div>

              {/* Editor Form */}
              <div className="space-y-8">
                {/* Title and Status */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <Label htmlFor="title" className="text-gray-300">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter post title..."
                      className="bg-gray-900/50 border-gray-800 text-gray-300 placeholder-gray-500 mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status" className="text-gray-300">
                      Status
                    </Label>
                    <Select
                      value={status}
                      onValueChange={(value: "draft" | "published") =>
                        setStatus(value)
                      }
                    >
                      <SelectTrigger
                        id="status"
                        className="bg-gray-900/50 border-gray-800 text-gray-300 mt-2"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800">
                        <SelectItem
                          value="draft"
                          className="text-gray-300 hover:bg-gray-800/50"
                        >
                          Draft
                        </SelectItem>
                        <SelectItem
                          value="published"
                          className="text-gray-300 hover:bg-gray-800/50"
                        >
                          Published
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Cover Image */}
                <div>
                  <Label className="text-gray-300">Cover Image</Label>
                  <div className="mt-2">
                    {coverImagePreview ? (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden">
                        <img
                          src={coverImagePreview}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCoverImage(null);
                            setCoverImagePreview("");
                          }}
                          className="absolute top-2 right-2 bg-black/50 border-gray-800 text-gray-300 hover:bg-gray-800/50"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-800 rounded-lg cursor-pointer hover:border-gray-700 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImagePlus className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-400">
                            Click to upload cover image
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleCoverImageChange}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label className="text-gray-300">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm flex items-center"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-purple-300"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag..."
                      className="bg-gray-900/50 border-gray-800 text-gray-300 placeholder-gray-500"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddTag}
                      variant="outline"
                      className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    >
                      Add Tag
                    </Button>
                  </div>
                </div>

                {/* Excerpt */}
                <div>
                  <Label htmlFor="excerpt" className="text-gray-300">
                    Excerpt
                  </Label>
                  <Textarea
                    id="excerpt"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Write a brief excerpt for your post..."
                    className="bg-gray-900/50 border-gray-800 text-gray-300 placeholder-gray-500 mt-2 h-24"
                  />
                </div>

                {/* Content Editor */}
                <div>
                  <Label className="text-gray-300">Content</Label>
                  <div className="mt-2 border border-gray-800 rounded-lg overflow-hidden">
                    <TipTapEditor
                      content={content}
                      onChange={setContent}
                      className="min-h-[500px] bg-gray-900/50"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
