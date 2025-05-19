"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Undo,
  Redo,
} from "lucide-react";
import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "react-hot-toast";

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

export default function TipTapEditor({
  content,
  onChange,
  className = "",
}: TipTapEditorProps) {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const supabase = createClientComponentClient();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-400 hover:text-blue-300 underline",
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none max-w-none text-white ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const handleImageUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        // Log the current user and bucket status
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) {
          console.error("Auth error:", userError);
          toast.error("Authentication error. Please try logging in again.");
          return;
        }

        if (!user) {
          toast.error("You must be logged in to upload images");
          return;
        }

        console.log("Current user:", user.id);

        // Check bucket status
        const { data: bucket, error: bucketError } =
          await supabase.storage.getBucket("blog-images");

        if (bucketError) {
          console.error("Bucket error:", bucketError);
          if (bucketError.message.includes("not found")) {
            toast.error("Storage bucket not found. Please contact support.");
          } else {
            toast.error(`Storage error: ${bucketError.message}`);
          }
          return;
        }

        console.log("Bucket status:", bucket);

        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`; // Include user ID in path
        const { error: uploadError } = await supabase.storage
          .from("blog-images")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Upload failed: ${uploadError.message}`);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("blog-images")
          .getPublicUrl(fileName);

        if (!urlData?.publicUrl) {
          throw new Error("Failed to get public URL for uploaded image");
        }

        editor?.chain().focus().setImage({ src: urlData.publicUrl }).run();
        toast.success("Image uploaded successfully");
      } catch (error) {
        console.error("Error in image upload:", error);
        if (error instanceof Error) {
          toast.error(`Upload failed: ${error.message}`);
        } else {
          toast.error("Failed to upload image. Please try again.");
        }
      }
    };
    input.click();
  };

  const addLink = () => {
    if (linkUrl) {
      editor
        ?.chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
      setLinkUrl("");
      setIsLinkModalOpen(false);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-900/50 border-b border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("bold") ? "bg-gray-800 text-white" : "text-gray-400"
          }`}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("italic")
              ? "bg-gray-800 text-white"
              : "text-gray-400"
          }`}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={`h-8 w-8 p-0 ${
            editor.isActive("heading", { level: 1 })
              ? "bg-gray-800 text-white"
              : "text-gray-400"
          }`}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`h-8 w-8 p-0 ${
            editor.isActive("heading", { level: 2 })
              ? "bg-gray-800 text-white"
              : "text-gray-400"
          }`}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`h-8 w-8 p-0 ${
            editor.isActive("heading", { level: 3 })
              ? "bg-gray-800 text-white"
              : "text-gray-400"
          }`}
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("bulletList")
              ? "bg-gray-800 text-white"
              : "text-gray-400"
          }`}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("orderedList")
              ? "bg-gray-800 text-white"
              : "text-gray-400"
          }`}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("blockquote")
              ? "bg-gray-800 text-white"
              : "text-gray-400"
          }`}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("codeBlock")
              ? "bg-gray-800 text-white"
              : "text-gray-400"
          }`}
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsLinkModalOpen(true)}
          className={`h-8 w-8 p-0 ${
            editor.isActive("link") ? "bg-gray-800 text-white" : "text-gray-400"
          }`}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleImageUpload}
          className="h-8 w-8 p-0 text-gray-400"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 p-0 text-gray-400 disabled:opacity-50"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 p-0 text-gray-400 disabled:opacity-50"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} className="p-4" />

      {/* Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-4 rounded-lg w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Add Link</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkUrl("");
                }}
                className="border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button onClick={addLink} className="bg-purple-500 text-white">
                Add Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
