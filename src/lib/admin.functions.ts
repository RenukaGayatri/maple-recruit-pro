import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADMIN_EMAIL = "info@maplelearningsolutions.com";
const ADMIN_PASSWORD = "Maple@2026";
const ADMIN_TOKEN = "mls-admin-2026-recruit"; // opaque session marker

const LoginInput = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
});

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => LoginInput.parse(raw))
  .handler(async ({ data }) => {
    if (data.email !== ADMIN_EMAIL || data.password !== ADMIN_PASSWORD) {
      throw new Error("Invalid email or password");
    }
    return { token: ADMIN_TOKEN };
  });

function requireAdmin(token: string) {
  if (token !== ADMIN_TOKEN) throw new Error("Unauthorized");
}

const TokenInput = z.object({ token: z.string() });

export const listCandidates = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => TokenInput.parse(raw))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("candidates")
      .select("id, full_name, email, phone, education_status, role, created_at, submitted_at, completed, total_score, percentage, status, ai_summary")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const exportCandidatesCsv = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => TokenInput.parse(raw))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("candidates")
      .select("id, full_name, email, phone, education_status, role, created_at, submitted_at, completed, total_score, percentage, status, ai_summary")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const csvRows = [
      [
        "Candidate",
        "Email",
        "Phone",
        "Education Status",
        "Role",
        "Date",
        "Score",
        "AI Score",
        "Status",
        "Summary",
      ],
      ...((rows ?? []).map((row) => [
        row.full_name,
        row.email,
        row.phone ?? "",
        row.education_status ?? "",
        row.role ?? "",
        row.submitted_at ?? row.created_at,
        String(row.total_score ?? ""),
        String(row.percentage ?? ""),
        row.status ?? "",
        row.ai_summary ?? "",
      ])),
    ];

    const csv = csvRows
      .map((entry) => entry.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return { csv };
  });

const GetInput = z.object({ token: z.string(), id: z.string().uuid() });
export const getCandidate = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => GetInput.parse(raw))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("candidates")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// Re-run AI evaluation for a candidate whose original evaluation fell back
// (e.g. gateway rate limit during a burst of simultaneous submissions).
export const reevaluateCandidate = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => GetInput.parse(raw))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { evaluateDescriptive } = await import("./evaluate.server");
    const { ROLES, PASS_PERCENTAGE, TOTAL_MARKS, MCQ_MARKS } = await import("./assessment-data");

    const { data: row, error } = await supabaseAdmin
      .from("candidates")
      .select("id, role, descriptive_answer, mcq_score")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    if (!row.role || !row.descriptive_answer) throw new Error("Candidate has no submitted answer yet");

    const roleDef = ROLES.find((r) => r.id === row.role);
    if (!roleDef) throw new Error("Unknown role on candidate record");

    const mcqScore = row.mcq_score ?? 0;
    const mcqPercent = Math.round((mcqScore / MCQ_MARKS) * 100);
    const ai = await evaluateDescriptive(row.role, roleDef.prompt, row.descriptive_answer, mcqPercent);

    const totalScore = mcqScore + ai.descriptive_score;
    const percentage = Math.round((totalScore / TOTAL_MARKS) * 100);

    const { error: upErr } = await supabaseAdmin
      .from("candidates")
      .update({
        descriptive_score: ai.descriptive_score,
        total_score: totalScore,
        percentage,
        status: percentage >= PASS_PERCENTAGE ? "PASS" : "FAIL",
        ai_evaluation: ai,
        ai_summary: ai.summary,
      })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true, fallback: ai.fallback === true };
  });

