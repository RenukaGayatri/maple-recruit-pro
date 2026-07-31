import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertSupabaseConfigured, getSupabaseErrorMessage } from "./supabase-env";
import { getQuestionById, ROLES, PASS_PERCENTAGE, TOTAL_MARKS, MCQ_MARKS } from "./assessment-data";

const CreateInput = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(1).max(30),
  education_status: z.enum(["Still Pursuing", "Completed"]),
});

export const createCandidate = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => CreateInput.parse(raw))
  .handler(async ({ data }) => {
    try {
      assertSupabaseConfigured();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: row, error } = await supabaseAdmin
        .from("candidates")
        .insert({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
          education_status: data.education_status,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      const { error: normalizedError } = await supabaseAdmin
        .from("assessment_candidates")
        .upsert({
          id: row.id as string,
          name: data.full_name,
          email: data.email,
          phone: data.phone,
          education_status: data.education_status,
        }, { onConflict: "id" });
      if (normalizedError) throw new Error(normalizedError.message);

      return { id: row.id as string };
    } catch (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }
  });

const SubmitInput = z.object({
  id: z.string().uuid(),
  role: z.enum(["learning-content-developer", "social-media-marketing", "business-development"]),
  mcq_answers: z.record(z.string(), z.string()),
  descriptive_answer: z.string().trim().min(1).max(5000),
});

export const submitAssessment = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => SubmitInput.parse(raw))
  .handler(async ({ data }) => {
    assertSupabaseConfigured();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { evaluateDescriptive } = await import("./evaluate.server");

    // Score MCQs — each candidate gets a random subset of the 50-question bank,
    // so we score only the questions that were actually served to them.
    let mcqScore = 0;
    for (const [qid, chosen] of Object.entries(data.mcq_answers)) {
      const q = getQuestionById(qid);
      if (q && chosen === q.correct) mcqScore += q.marks;
    }
    const mcqMax = MCQ_MARKS; // 10 questions × 2 marks
    const mcqPercent = Math.round((mcqScore / mcqMax) * 100);

    const roleDef = ROLES.find((r) => r.id === data.role)!;

    // Persist the raw submission FIRST so nothing can be lost while the AI runs.
    const { error: saveError } = await supabaseAdmin
      .from("candidates")
      .update({
        role: data.role,
        mcq_answers: data.mcq_answers,
        descriptive_answer: data.descriptive_answer,
        mcq_score: mcqScore,
        completed: true,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (saveError) throw new Error(saveError.message);

    const ai = await evaluateDescriptive(data.role, roleDef.prompt, data.descriptive_answer, mcqPercent);

    const descriptiveScore = ai.descriptive_score; // 0-10
    const totalScore = mcqScore + descriptiveScore;
    const percentage = Math.round((totalScore / TOTAL_MARKS) * 100);
    const status = percentage >= PASS_PERCENTAGE ? "PASS" : "FAIL";

    const { error } = await supabaseAdmin
      .from("candidates")
      .update({
        descriptive_score: descriptiveScore,
        total_score: totalScore,
        percentage,
        status,
        ai_evaluation: ai,
        ai_summary: ai.summary,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("assessment_attempts")
      .insert({
        candidate_id: data.id,
        assessment_id: "maple-internship-assessment",
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (attemptError) throw new Error(attemptError.message);

    const answerRows = Object.entries(data.mcq_answers).map(([questionId, selectedAnswer]) => {
      const question = getQuestionById(questionId);
      return {
        attempt_id: attempt.id as string,
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: Boolean(question && selectedAnswer === question.correct),
        time_taken: 0,
      };
    });

    if (answerRows.length > 0) {
      const { error: answersError } = await supabaseAdmin.from("assessment_answers").insert(answerRows);
      if (answersError) throw new Error(answersError.message);
    }

    const { error: scoreError } = await supabaseAdmin.from("assessment_scores").insert({
      attempt_id: attempt.id as string,
      score: totalScore,
      percentage,
      ai_score: descriptiveScore,
      recommendation: ai.recommendation,
      strengths: ai.strengths,
      weaknesses: ai.weaknesses,
      summary: ai.summary,
      skill_level: percentage >= PASS_PERCENTAGE ? "Strong Fit" : "Needs Review",
      suitable_job_roles: ROLES.map((roleDef) => roleDef.shortTitle).slice(0, 3),
    });
    if (scoreError) throw new Error(scoreError.message);

    return { ok: true, aiFallback: ai.fallback === true };

  });

// Auto-save draft
const DraftInput = z.object({
  id: z.string().uuid(),
  role: z.string().nullable(),
  mcq_answers: z.record(z.string(), z.string()),
  descriptive_answer: z.string(),
});
export const saveDraft = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => DraftInput.parse(raw))
  .handler(async ({ data }) => {
    assertSupabaseConfigured();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("candidates")
      .update({
        role: data.role,
        mcq_answers: data.mcq_answers,
        descriptive_answer: data.descriptive_answer,
      })
      .eq("id", data.id)
      .eq("completed", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
