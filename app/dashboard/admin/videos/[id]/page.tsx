import { Suspense } from "react";
import CourseEditPageClient from "./CourseEditPageClient";

export default function CourseEditPage({ params }: { params: { id: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-[#0A0A0A]">
          <div className="flex-1 ml-[280px] flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <CourseEditPageClient courseId={params.id} />
    </Suspense>
  );
}
 