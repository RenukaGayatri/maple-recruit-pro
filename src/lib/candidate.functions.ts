import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MCQ_QUESTIONS, ROLES, PASS_PERCENTAGE, TOTAL_MARKS } from "./assessment-data";

const CreateInput = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
});

export const createCandidate = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => CreateInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("candidates")
      .insert({ full_name: data.full_name, email: data.email })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

const SubmitInput = z.object({
  id: z.string().uuid(),
  role: z.enum(["learning-content-developer", "social-media-marketing", "business-development"]),
  mcq_answers: z.record(z.string(), z.string()),
  descriptive_answer: z.string().trim().min(1).max(5000),
});

type AiEval = {
  descriptive_score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  recommendation: string;
  summary: string;
  breakdown: {
    communication: number;
    clarity: number;
    creativity: number;
    role_understanding: number;
    problem_solving: number;
    professionalism: number;
  };
};

async function evaluateDescriptive(
  role: string,
  prompt: string,
  answer: string,
  mcqPercent: number,
): Promise<AiEval> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const roleDef = ROLES.find((r) => r.id === role);
  const roleName = roleDef?.shortTitle ?? role;

  const system = `You are a senior recruitment evaluator for Maple Learning Solutions.
Evaluate the candidate's descriptive answer for the "${roleName}" internship role.
Score each criterion from 0 to 10:
- communication, clarity, creativity, role_understanding, problem_solving, professionalism.
Then compute an overall descriptive_score out of 10 (weighted average, integer 0-10).
Also provide strengths (2-4), weaknesses (1-3), suggestions (2-3), a one-line recommendation
("Recommended for Interview" / "Borderline" / "Not Recommended"), and a short 2-3 sentence hiring summary
that references the candidate's aptitude percentage of ${mcqPercent}%.
Respond ONLY with valid JSON matching this schema:
{"descriptive_score":int,"strengths":[str],"weaknesses":[str],"suggestions":[str],"recommendation":str,"summary":str,"breakdown":{"communication":int,"clarity":int,"creativity":int,"role_understanding":int,"problem_solving":int,"professionalism":int}}`;

  const user = `ROLE: ${roleName}\nQUESTION: ${prompt}\n\nCANDIDATE ANSWER:\n${answer}`;

  try {
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "none",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI gateway ${res.status}: ${body}`);
    }
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    const parsed = JSON.parse(json.choices[0].message.content) as AiEval;
    parsed.descriptive_score = Math.max(0, Math.min(10, Math.round(parsed.descriptive_score)));
    return parsed;
  } catch (err) {
    console.error("AI evaluation failed:", err);
    // Fallback deterministic scoring so submission never breaks.
    const wc = answer.trim().split(/\s+/).length;
    const base = Math.min(10, Math.max(3, Math.round(wc / 15)));
    return {
      descriptive_score: base,
      strengths: ["Provided a written response within the time limit."],
      weaknesses: ["Automated evaluation was unavailable — manual review recommended."],
      suggestions: ["Review the answer with the hiring team."],
      recommendation: mcqPercent >= PASS_PERCENTAGE ? "Recommended for Interview" : "Not Recommended",
      summary:
        "Automated AI evaluation could not be completed. This candidate should be reviewed manually by the hiring team.",
      breakdown: {
        communication: base,
        clarity: base,
        creativity: base,
        role_understanding: base,
        problem_solving: base,
        professionalism: base,
      },
    };
  }
}

export const submitAssessment = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => SubmitInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
    const ai = await evaluateDescriptive(data.role, roleDef.prompt, data.descriptive_answer, mcqPercent);

    const descriptiveScore = ai.descriptive_score; // 0-10
    const totalScore = mcqScore + descriptiveScore;
    const percentage = Math.round((totalScore / TOTAL_MARKS) * 100);
    const status = percentage >= PASS_PERCENTAGE ? "PASS" : "FAIL";

    const { error } = await supabaseAdmin
      .from("candidates")
      .update({
        role: data.role,
        mcq_answers: data.mcq_answers,
        descriptive_answer: data.descriptive_answer,
        mcq_score: mcqScore,
        descriptive_score: descriptiveScore,
        total_score: totalScore,
        percentage,
        status,
        ai_evaluation: ai,
        ai_summary: ai.summary,
        completed: true,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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
