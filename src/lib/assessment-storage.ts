import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withRetry } from "./retry";

const AssessmentRecordInput = z.object({
  candidateId: z.string().uuid(),
  assessmentId: z.string().min(1),
  answers: z.record(z.string(), z.string()),
  role: z.string().nullable().optional(),
  descriptive: z.string().optional(),
  score: z.number().optional(),
  percentage: z.number().optional(),
  aiScore: z.number().optional(),
  recommendation: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  summary: z.string().optional(),
  skillLevel: z.string().optional(),
  suitableJobRoles: z.array(z.string()).optional(),
});

export const saveAssessmentRecord = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => AssessmentRecordInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    return withRetry(async () => {
      const { data: candidate, error: candidateError } = await supabaseAdmin
        .from("assessment_candidates")
        .select("id")
        .eq("id", data.candidateId)
        .maybeSingle();

      if (candidateError) throw candidateError;
      if (!candidate) {
        const { error: insertCandidateError } = await supabaseAdmin.from("assessment_candidates").insert({
          id: data.candidateId,
          name: "Imported candidate",
          email: "unknown@example.com",
          phone: null,
          education_status: null,
        });
        if (insertCandidateError) throw insertCandidateError;
      }

      const { data: attempt, error: attemptError } = await supabaseAdmin
        .from("assessment_attempts")
        .insert({
          candidate_id: data.candidateId,
          assessment_id: data.assessmentId,
          status: "submitted",
        })
        .select("id")
        .single();

      if (attemptError) throw attemptError;

      const answerRows = Object.entries(data.answers).map(([questionId, selectedAnswer]) => ({
        attempt_id: attempt.id,
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: false,
        time_taken: 0,
      }));

      if (answerRows.length > 0) {
        const { error: answersError } = await supabaseAdmin.from("assessment_answers").insert(answerRows);
        if (answersError) throw answersError;
      }

      const { error: scoreError } = await supabaseAdmin.from("assessment_scores").insert({
        attempt_id: attempt.id,
        score: data.score ?? 0,
        percentage: data.percentage ?? 0,
        ai_score: data.aiScore ?? 0,
        recommendation: data.recommendation ?? null,
        strengths: data.strengths ?? [],
        weaknesses: data.weaknesses ?? [],
        summary: data.summary ?? null,
        skill_level: data.skillLevel ?? null,
        suitable_job_roles: data.suitableJobRoles ?? [],
      });

      if (scoreError) throw scoreError;
      return { ok: true };
    });
  });
