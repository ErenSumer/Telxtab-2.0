"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";

export default function SuspendedPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkBanStatus = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("id", session.user.id)
        .single();

      // If user is not banned, redirect them to dashboard
      if (!profile?.is_banned) {
        router.push("/dashboard");
      }
    };

    checkBanStatus();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] items-center justify-center p-4">
      <div className="max-w-md w-full text-center p-8 bg-gray-900/50 backdrop-blur-lg rounded-xl border border-red-500/50">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-white mb-4">
          Account Suspended
        </h1>
        <p className="text-gray-400 mb-8">
          Your account has been suspended due to a violation of our terms of
          service. If you believe this is a mistake, please contact our support
          team.
        </p>
        <div className="space-y-4">
          <a
            href="mailto:support@yourdomain.com"
            className="block w-full px-4 py-3 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
          >
            Contact Support
          </a>
          <Button
            onClick={handleSignOut}
            className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
