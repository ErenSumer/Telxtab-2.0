"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuth } from "@/context/AuthContext";
import { LoadingScreen } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  cover_image_url: string;
  author: {
    full_name: string;
    avatar_url: string;
  };
  published_at: string;
  read_time: number;
  tags: string[];
}

// Client component that uses useSearchParams
function BlogPreviewContent() {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("id");
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!user || !postId) {
      router.push("/dashboard/admin/blog");
    }
  }, [user, postId, router]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId || !user) return;

      try {
        const { data, error } = await supabase
          .from("blog_posts")
          .select(
            `
            id,
            title,
            content,
            excerpt,
            cover_image_url,
            published_at,
            read_time,
            tags,
            author:author_id (
              full_name,
              avatar_url
            )
          `
          )
          .eq("id", postId)
          .single();

        if (error) throw error;
        setPost(data);
      } catch (error) {
        console.error("Error fetching post:", error);
        router.push("/dashboard/admin/blog");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId, user, router, supabase]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-red-400">Post not found</h1>
          <p className="mt-2 text-gray-400">
            The post you&apos;re looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <Button
            onClick={() => router.push("/dashboard/admin/blog")}
            className="mt-4 bg-red-500/20 hover:bg-red-500/30 text-red-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard/admin/blog">
            <Button
              variant="outline"
              className="border-gray-800 text-gray-300 hover:bg-gray-800/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Editor
            </Button>
          </Link>
          <div className="text-sm text-gray-400">Preview Mode</div>
        </div>
      </header>

      {/* Post Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Cover Image */}
        {post.cover_image_url && (
          <div className="relative w-full h-[400px] rounded-lg overflow-hidden mb-8">
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Post Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
            {post.title}
          </h1>
          <div className="flex items-center space-x-4 text-gray-400">
            <div className="flex items-center">
              {post.author.avatar_url && (
                <img
                  src={post.author.avatar_url}
                  alt={post.author.full_name}
                  className="w-8 h-8 rounded-full mr-2"
                />
              )}
              <span>{post.author.full_name}</span>
            </div>
            <span>•</span>
            <span>{post.read_time} min read</span>
            {post.published_at && (
              <>
                <span>•</span>
                <span>
                  {format(new Date(post.published_at), "MMM d, yyyy")}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Excerpt */}
        {post.excerpt && (
          <div className="text-xl text-gray-300 mb-8 border-l-4 border-purple-500/50 pl-4">
            {post.excerpt}
          </div>
        )}

        {/* Content */}
        <article
          className="prose prose-invert prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </main>
    </div>
  );
}

// Page component with Suspense boundary
export default function BlogPreviewPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <BlogPreviewContent />
    </Suspense>
  );
}
