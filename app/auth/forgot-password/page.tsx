"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtSign, KeyRound, Loader2, ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch (err) {
      console.error("Password reset error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden flex flex-col">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e5,#ec4899)] opacity-20 mix-blend-multiply filter blur-xl animate-blob" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e5,#ec4899)] opacity-20 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e5,#ec4899)] opacity-20 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000" />
      </div>

      {/* Floating Elements */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="fixed top-20 left-10 w-20 h-20 bg-purple-500/20 rounded-full blur-2xl"
      />
      <motion.div
        animate={{
          y: [0, 20, 0],
          rotate: [0, -5, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="fixed bottom-20 right-10 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl"
      />

      <div className="flex flex-col items-center justify-center flex-grow px-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="inline-block mb-8">
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                LinguaLeap
              </h1>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-8 border border-gray-800 shadow-lg shadow-purple-500/10"
          >
            {success ? (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="bg-purple-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Check className="w-8 h-8 text-purple-400" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-4 text-white">
                  Check your email
                </h2>
                <p className="text-gray-300 mb-6">
                  We&apos;ve sent a password reset link to{" "}
                  <span className="text-purple-400">{email}</span>. Please check
                  your inbox and follow the instructions.
                </p>
                <div className="text-gray-400 text-sm mb-6">
                  Didn&apos;t receive the email? Check your spam folder or request a
                  new link.
                </div>
                <Button
                  onClick={() => setSuccess(false)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Send again
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Reset password
                  </h2>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <KeyRound className="w-6 h-6 text-purple-400" />
                  </motion.div>
                </div>

                <p className="text-gray-400 text-sm mb-6">
                  Enter your email address and we&apos;ll send you a link to reset
                  your password.
                </p>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm text-gray-300">
                      Email
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <AtSign size={18} />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 bg-gray-800/50 border-gray-700 focus:border-purple-500 text-white"
                      />
                    </div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Send reset link"
                      )}
                    </Button>
                  </motion.div>

                  <div className="mt-4 text-center">
                    <Link
                      href="/auth/login"
                      className="text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center text-sm"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back to login
                    </Link>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-center py-6 text-gray-400 text-sm"
      >
        <p>
          Need help?{" "}
          <Link
            href="/contact"
            className="text-purple-400 hover:text-purple-300"
          >
            Contact support
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
