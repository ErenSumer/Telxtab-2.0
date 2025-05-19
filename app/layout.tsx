import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { NotificationProvider } from "@/context/NotificationContext";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Telxtab - Language Learning Platform",
  description: "Learn languages with AI-powered lessons and practice",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ProfileProvider>
            <NotificationProvider>
             {children}
            </NotificationProvider>
          </ProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
