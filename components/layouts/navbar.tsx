"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, User, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferred_language: string | null;
  learning_languages: string[] | null;
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        // First try to fetch the existing profile
        const { data: existingProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (fetchError && fetchError.code === "PGRST116") {
          // Profile doesn't exist, create one
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              username: user.email?.split("@")[0] || "user",
              full_name: null,
              bio: null,
              preferred_language: null,
              learning_languages: [],
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error creating profile:", insertError);
            return;
          }

          setProfile(newProfile);
        } else if (fetchError) {
          console.error("Error fetching profile:", fetchError);
          return;
        } else {
          setProfile(existingProfile);
        }
      } catch (error) {
        console.error("Error in fetchProfile:", error);
      }
    };

    fetchProfile();
  }, [user]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Learn", href: "/dashboard/learn" },
    { name: "Practice", href: "/dashboard/practice" },
    { name: "Progress", href: "/dashboard/progress" },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="fixed top-0 right-0 left-[280px] z-40 bg-gray-900/50 backdrop-blur-lg border-b border-gray-800">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationDropdown />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{user?.email}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="hover:bg-gray-800"
            >
              <LogOut className="h-5 w-5 text-gray-400" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
