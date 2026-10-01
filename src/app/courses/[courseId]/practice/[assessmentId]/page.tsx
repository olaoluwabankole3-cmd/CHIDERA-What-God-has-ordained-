import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AssessmentSession } from "@/components/assessment-session";
import type {
  PublicAssessmentQuestion,
  StoredAssessmentConfiguration,
} from "@/lib/assessment-types";
import { getCourseWorkspace } from "@/lib/academic";
import { createClient } from "@/lib/supabase/server";

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ courseId: string; assessmentId: string }>;
}) {
  const { courseId, assessmentId } = await params;
  const workspace = await getCourseWorkspace(courseId);

  if (!workspace) redirect("/auth");
  if (!workspace.academicProfile) redirect("/onboarding");
  if (!workspace.course) notFound();

  const supabase = await createClient();
  const { data: assessment, error } = await supabase
    .from("assessments")
    .select("id, title, assessment_type, configuration")
    .eq("id", assessmentId)
    .eq("course_id", workspace.course.id)
    .eq("user_id", workspace.user.id)
    .maybeSingle();

  if (error || !assessment) notFound();

  const configuration =
    assessment.configuration as StoredAssessmentConfiguration;

  if (!Array.isArray(configuration?.questions) || configuration.questions.length === 0) {
    notFound();
  }

  const questions: PublicAssessmentQuestion[] = configuration.questions.map(
    ({ correctOptionIndex: _correctOptionIndex, explanation: _explanation, ...question }) =>
      question,
  );

  const profile = workspace.academicProfile;
  const meta = `${profile.level} · ${profile.department}`;

  return (
    <AppShell studentName={workspace.name} studentMeta={meta}>
      <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
        <Link
          href={`/courses/${workspace.course.id}/practice`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-700"
        >
          <ArrowLeft size={14} /> Practice Center
        </Link>

        <div className="mt-5">
          <AssessmentSession
            assessmentId={assessment.id}
            courseId={workspace.course.id}
            title={assessment.title}
            assessmentType={assessment.assessment_type}
            questions={questions}
          />
        </div>
      </div>
    </AppShell>
  );
}
