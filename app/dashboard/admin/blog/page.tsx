"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Clock,
  Tag,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingScreen } from "@/components/ui/loading";
import AdminSidebar from "@/components/layouts/admin-sidebar";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string;
  views: number;
  author: {
    full_name: string;
    username: string;
  };
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "published" | "archived"
  >("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from("blog_posts")
        .select(
          `
          *,
          author:profiles(full_name, username)
        `
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: posts, error } = await query;

      if (error) throw error;
      setPosts(posts || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to fetch blog posts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;

    try {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", postToDelete);

      if (error) throw error;

      toast.success("Post deleted successfully");
      setPosts(posts.filter((post) => post.id !== postToDelete));
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const handleStatusChange = async (
    postId: string,
    newStatus: BlogPost["status"]
  ) => {
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          status: newStatus,
          published_at:
            newStatus === "published" ? new Date().toISOString() : null,
        })
        .eq("id", postId);

      if (error) throw error;

      toast.success(`Post ${newStatus} successfully`);
      setPosts(
        posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                status: newStatus,
                published_at:
                  newStatus === "published" ? new Date().toISOString() : null,
              }
            : post
        )
      );
    } catch (error) {
      console.error("Error updating post status:", error);
      toast.error("Failed to update post status");
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <AdminSidebar />
      <div className="flex-1 ml-[280px]">
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Blog Management
                  </h1>
                  <p className="text-gray-400 mt-2">
                    Create, edit, and manage your blog posts
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/dashboard/admin/blog/new")}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Post
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search posts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-900/50 border-gray-800 text-gray-300 placeholder-gray-500"
                    />
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-gray-800 text-gray-300 hover:bg-gray-800/50"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Status:{" "}
                      {statusFilter.charAt(0).toUpperCase() +
                        statusFilter.slice(1)}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-900 border-gray-800">
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("all")}
                      className="text-gray-300 hover:bg-gray-800/50"
                    >
                      All Posts
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("draft")}
                      className="text-gray-300 hover:bg-gray-800/50"
                    >
                      Drafts
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("published")}
                      className="text-gray-300 hover:bg-gray-800/50"
                    >
                      Published
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("archived")}
                      className="text-gray-300 hover:bg-gray-800/50"
                    >
                      Archived
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Posts Table */}
              <div className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                          Title
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                          Author
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                          Created
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                          Views
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPosts.map((post) => (
                        <tr
                          key={post.id}
                          className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <span className="text-white font-medium">
                                {post.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={`${
                                    post.status === "published"
                                      ? "border-green-500/50 text-green-400"
                                      : post.status === "draft"
                                        ? "border-yellow-500/50 text-yellow-400"
                                        : "border-gray-500/50 text-gray-400"
                                  }`}
                                >
                                  {post.status.charAt(0).toUpperCase() +
                                    post.status.slice(1)}
                                  <ChevronDown className="w-4 h-4 ml-2" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-gray-900 border-gray-800">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(post.id, "draft")
                                  }
                                  className="text-gray-300 hover:bg-gray-800/50"
                                >
                                  Draft
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(post.id, "published")
                                  }
                                  className="text-gray-300 hover:bg-gray-800/50"
                                >
                                  Published
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(post.id, "archived")
                                  }
                                  className="text-gray-300 hover:bg-gray-800/50"
                                >
                                  Archived
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {post.author.full_name}
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {format(new Date(post.created_at), "MMM d, yyyy")}
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {post.views}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/blog/${post.slug}`)}
                              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/dashboard/admin/blog/edit/${post.id}`
                                )
                              }
                              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPostToDelete(post.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredPosts.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-400 text-lg">
                    No posts found matching your criteria.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </main>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">Delete Post</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete this post? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                className="border-gray-800 text-gray-300 hover:bg-gray-800/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeletePost}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
