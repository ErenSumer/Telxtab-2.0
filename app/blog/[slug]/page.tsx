"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { LoadingScreen } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, MessageCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  cover_image_url: string;
  author: {
    id: string;
    full_name: string;
    avatar_url: string;
    username: string;
  };
  published_at: string;
  read_time: number;
  tags: string[];
  views: number;
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
}

export default function BlogPostPage() {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiking, setIsLiking] = useState(false);
  const params = useParams();
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchPost = async () => {
      if (!params.slug) return;

      try {
        // Fetch post with author details and engagement counts
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
            views,
            author:author_id (
              id,
              full_name,
              avatar_url,
              username
            ),
            likes:blog_likes(count),
            comments:blog_comments(count)
          `
          )
          .eq("slug", params.slug)
          .eq("status", "published")
          .single();

        if (error) throw error;

        // Check if the current user has liked the post
        let isLiked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from("blog_likes")
            .select("id")
            .eq("post_id", data.id)
            .eq("user_id", user.id)
            .single();
          isLiked = !!likeData;
        }

        // Format the post data
        const formattedPost = {
          ...data,
          likes_count: data.likes[0].count,
          comments_count: data.comments[0].count,
          is_liked: isLiked,
        };

        setPost(formattedPost);

        // Increment view count
        await supabase.rpc("increment_blog_post_views", {
          post_id: data.id,
        });
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [params.slug, user, supabase]);

  const handleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like posts");
      return;
    }

    if (!post) return;

    setIsLiking(true);
    try {
      if (post.is_liked) {
        // Unlike
        await supabase
          .from("blog_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        setPost({
          ...post,
          likes_count: post.likes_count - 1,
          is_liked: false,
        });
      } else {
        // Like
        await supabase.from("blog_likes").insert({
          post_id: post.id,
          user_id: user.id,
        });
        setPost({
          ...post,
          likes_count: post.likes_count + 1,
          is_liked: true,
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like status");
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;

    try {
      await navigator.share({
        title: post.title,
        text: post.excerpt,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback to copying link
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-red-400">Post not found</h1>
          <p className="mt-2 text-gray-400">
            The post you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/blog">
            <Button className="mt-4 bg-red-500/20 hover:bg-red-500/30 text-red-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/blog">
            <Button
              variant="outline"
              className="border-gray-800 text-gray-300 hover:bg-gray-800/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
          <div className="flex items-center space-x-4 text-gray-400">
            <span>{post.views} views</span>
            <span>•</span>
            <span>{post.read_time} min read</span>
          </div>
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
            <Link
              href={`/dashboard/profile/${post.author.username}`}
              className="flex items-center hover:text-purple-400 transition-colors"
            >
              {post.author.avatar_url && (
                <img
                  src={post.author.avatar_url}
                  alt={post.author.full_name}
                  className="w-8 h-8 rounded-full mr-2"
                />
              )}
              <span>{post.author.full_name}</span>
            </Link>
            <span>•</span>
            <span>{format(new Date(post.published_at), "MMM d, yyyy")}</span>
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
          className="prose prose-invert prose-lg max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Engagement */}
        <div className="flex items-center justify-between border-t border-gray-800 pt-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={handleLike}
              disabled={isLiking}
              className={`${
                post.is_liked
                  ? "text-red-400 hover:text-red-300"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <Heart
                className={`w-5 h-5 mr-2 ${
                  post.is_liked ? "fill-current" : ""
                }`}
              />
              {post.likes_count}
            </Button>
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-gray-300"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              {post.comments_count}
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={handleShare}
            className="text-gray-400 hover:text-gray-300"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>
      </main>
    </div>
  );
}
