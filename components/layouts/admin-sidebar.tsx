"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Settings,
  LogOut,
  Users,
  Shield,
  BarChart3,
  MessageSquare,
  Video,
  Bell,
  FileText,
} from "lucide-react";

const AdminSidebar = () => {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navigation = [
    { name: "Overview", href: "/dashboard/admin", icon: BarChart3 },
    { name: "Users", href: "/dashboard/admin/users", icon: Users },
    {
      name: "AI Conversations",
      href: "/dashboard/admin/conversations",
      icon: MessageSquare,
    },
    { name: "Video Lessons", href: "/dashboard/admin/videos", icon: Video },
    { name: "Blog", href: "/dashboard/admin/blog", icon: FileText },
    {
      name: "Notifications",
      href: "/dashboard/admin/notifications",
      icon: Bell,
    },
    { name: "Settings", href: "/dashboard/admin/settings", icon: Settings },
  ];

  return (
    <div className="w-[280px] h-screen bg-gray-900/50 backdrop-blur-lg border-r border-gray-800 fixed left-0 top-0 z-50">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center p-4 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-500">
              Admin Panel
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <div className="px-3">
            <div className="space-y-1">
              {navigation.map((item) => {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive(item.href)
                        ? "bg-red-500/20 text-red-400"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="ml-3">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User Profile and Logout */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 ring-2 ring-red-500/50">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-red-500/10 text-red-400">
                {profile?.full_name
                  ? profile.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                  : user?.email?.[0].toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name || profile?.username || user?.email}
              </p>
              <p className="text-sm text-red-400">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-4 w-full flex items-center px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="ml-3">Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
