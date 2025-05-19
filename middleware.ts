import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check if the path starts with /dashboard
  const isDashboardPath = request.nextUrl.pathname.startsWith("/dashboard");
  const isAdminPath = request.nextUrl.pathname.startsWith("/dashboard/admin");
  const isLessonPath = request.nextUrl.pathname.match(
    /^\/dashboard\/lessons\/videos\/[^/]+\/[^/]+$/
  );
  const isCourseOverviewPath = request.nextUrl.pathname.match(
    /^\/dashboard\/lessons\/videos\/[^/]+$/
  );

  // If there's no session and trying to access dashboard routes
  if (!session && isDashboardPath) {
    // Store the attempted URL to redirect back after login
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If there's a session, check admin access and course enrollment
  if (session) {
  // Get the user's profile to check admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", session.user.id)
    .single();

  // If trying to access admin routes and user is not admin
    if (isAdminPath && !profile?.is_admin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Only check enrollment for specific lesson pages, not course overview pages
    if (isLessonPath && !profile?.is_admin) {
      const courseId = request.nextUrl.pathname.split("/")[4];
      if (courseId) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("course_id", courseId)
          .single();

        // If not enrolled, redirect to course overview page
        if (!enrollment) {
          return NextResponse.redirect(
            new URL(`/dashboard/lessons/videos/${courseId}`, request.url)
          );
        }
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
