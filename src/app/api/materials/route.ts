import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      return NextResponse.json({ materials: [] });
    }

    const url = new URL(request.url);
    const courseCode = url.searchParams.get("courseCode")?.trim();

    if (!courseCode) {
      return NextResponse.json({ error: "courseCode is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      return NextResponse.json({ materials: [] });
    }

    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("code", courseCode)
      .maybeSingle();

    if (!course) {
      return NextResponse.json({ materials: [] });
    }

    const { data, error } = await supabase
      .from("materials")
      .select("id, title, material_type, status, page_count, created_at")
      .eq("user_id", authData.user.id)
      .eq("course_id", course.id)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) throw error;

    return NextResponse.json({ materials: data || [] });
  } catch (error) {
    console.error("Materials list failed", error);
    return NextResponse.json({ error: "Could not load course materials." }, { status: 500 });
  }
}
