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

function normalizeAiEvaluation(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function parseComprehensiveRoleAnswers(raw: string | null | undefined) {
  if (!raw || !raw.trim()) return [] as Array<{ questionId: string; answer: string; label: string }>;

  const roleTitles = [
    "Finance Intern",
    "Social Media Marketing",
    "Business Development",
  ];

  const splitByRole = (value: string) => {
    const matches: Array<{ start: number; end: number; title: string }> = [];
    for (const title of roleTitles) {
      const regex = new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(value)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length, title });
      }
    }
    if (matches.length === 0) return [value.trim()];

    const ordered = matches.sort((a, b) => a.start - b.start);
    const blocks: string[] = [];
    for (let i = 0; i < ordered.length; i++) {
      const current = ordered[i];
      const next = ordered[i + 1];
      const segment = value.slice(current.start, next ? next.start : value.length).trim();
      if (segment) blocks.push(segment);
    }
    return blocks.filter(Boolean);
  };

  const sections = raw
    .split(/\n\s*---\s*\n/i)
    .map((block) => block.trim())
    .filter(Boolean);

  const candidateBlocks = sections.length > 0 ? sections : splitByRole(raw);
  const mapped: Array<{ questionId: string; answer: string; label: string }> = [];

  candidateBlocks.forEach((block, index) => {
    const lines = block
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const heading = lines[0] ?? "";
    const title = roleTitles.find((roleTitle) => heading.toLowerCase().includes(roleTitle.toLowerCase())) ?? `Role ${index + 1}`;
    const hasRoleTitle = typeof title === "string" && title !== `Role ${index + 1}`;
    const answerText = hasRoleTitle
      ? lines.slice(1).join("\n").trim() || block.replace(heading, "").trim()
      : block.trim();

    if (answerText) {
      mapped.push({
        questionId: `role-${index + 1}`,
        answer: answerText,
        label: title,
      });
    }
  });

  while (mapped.length < 3) {
    mapped.push({
      questionId: `role-${mapped.length + 1}`,
      answer: "Question not found in database.",
      label: roleTitles[mapped.length] ?? `Role ${mapped.length + 1}`,
    });
  }

  return mapped.slice(0, 3);
}

function questionCategory(questionId: string | number) {
  const qid = Number(questionId);
  if (qid >= 1 && qid <= 15) return "Aptitude";
  if (qid >= 16 && qid <= 30) return "Mathematics";
  if (qid >= 31 && qid <= 44) return "Logical Reasoning";
  if (qid >= 45 && qid <= 50) return "Communication";
  if (qid >= 51 && qid <= 53) return "Section A Comprehensive";
  return "General";
}

function buildQuestionMetadata(questionId: string | number) {
  const { getQuestionById } = require("@/lib/assessment-data");
  const question = getQuestionById(questionId);
  return {
    question: question?.question ?? `Question ${questionId}`,
    questionId: String(questionId),
    questionType: question?.type ?? "text",
    section: questionCategory(questionId),
    category: questionCategory(questionId),
    marks: question?.marks ?? 0,
    correctAnswer: question?.correct ?? "",
  };
}

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

export const getCandidateAssessmentDetail = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => GetInput.parse(raw))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getQuestionById } = await import("./assessment-data");

    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from("candidates")
      .select("*")
      .eq("id", data.id)
      .single();
    if (candidateError) throw new Error(candidateError.message);

    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from("assessment_attempts")
      .select("id, assessment_id, candidate_id, status, submitted_at")
      .eq("candidate_id", data.id)
      .order("submitted_at", { ascending: false })
      .limit(1);
    if (attemptsError) throw new Error(attemptsError.message);

    const attempt = attempts?.[0] ?? null;
    const attemptId = attempt?.id ?? null;
    const assessmentId = attempt?.assessment_id ?? null;

    const { data: answerRows, error: answersError } = attemptId
      ? await supabaseAdmin.from("assessment_answers").select("*").eq("attempt_id", attemptId)
      : { data: [], error: null };
    if (answersError) throw new Error(answersError.message);

    const foundQuestionIds = (answerRows ?? []).map((answer) => String(answer.question_id));
    const roleAnswers = parseComprehensiveRoleAnswers(candidate.descriptive_answer);
    const allAnswerRows = [...(answerRows ?? [])];

    const sectionAQuestionIds = ["51", "52", "53"];
    const roleQuestionIds = roleAnswers.map((item) => item.questionId);

    const storedRows = (answerRows ?? []).map((answer) => {
      const qid = String(answer.question_id);
      const bankQuestion = getQuestionById(answer.question_id);
      const questionText = bankQuestion?.question ?? `Question ${qid}`;
      const section = bankQuestion ? questionCategory(qid) : qid === "51" || qid === "52" || qid === "53" ? "Section A Comprehensive" : "General";

      return {
        id: answer.id,
        attempt_id: answer.attempt_id,
        question_id: qid,
        selected_answer: answer.selected_answer ?? "",
        is_correct: bankQuestion ? answer.selected_answer === bankQuestion.correct : null,
        section,
        question: questionText,
        questionType: bankQuestion?.type ?? "text",
        marks: bankQuestion?.marks ?? 0,
        correctAnswer: bankQuestion?.correct ?? "",
      };
    });

    const sectionARows = sectionAQuestionIds.map((questionId) => {
      const existing = storedRows.find((answer) => String(answer.question_id) === questionId);
      const bankQuestion = getQuestionById(questionId);
      return {
        id: existing?.id ?? `section-a-${questionId}`,
        attempt_id: attemptId,
        question_id: questionId,
        selected_answer: existing?.selected_answer ?? "Question not found in database.",
        is_correct: null,
        section: "Section A Comprehensive",
        question: bankQuestion?.question ?? `Question ${questionId}`,
        questionType: bankQuestion?.type ?? "text",
        marks: bankQuestion?.marks ?? 0,
        correctAnswer: bankQuestion?.correct ?? "",
      };
    });

    const sectionBRows = roleAnswers.map((entry, index) => ({
      id: `section-b-${index + 1}`,
      attempt_id: attemptId,
      question_id: entry.questionId,
      selected_answer: entry.answer,
      is_correct: null,
      section: "Section B Comprehensive",
      question: entry.label,
      questionType: "text",
      marks: 0,
      correctAnswer: "",
    }));

    const uniqueRows = [...storedRows, ...sectionARows, ...sectionBRows].reduce<Array<any>>((acc, row) => {
      const key = `${row.section}:${row.question_id}`;
      if (!acc.some((item) => `${item.section}:${item.question_id}` === key)) {
        acc.push(row);
      }
      return acc;
    }, []);

    const expectedQuestionIds = [
      ...Object.keys((candidate.mcq_answers as Record<string, string>) ?? {}),
      ...sectionAQuestionIds,
      ...roleQuestionIds,
    ].filter(Boolean);
    const missingQuestionIds = [...new Set(expectedQuestionIds)].filter((id) => {
      const hasStoredAnswer = foundQuestionIds.includes(id) || roleQuestionIds.includes(id);
      return !hasStoredAnswer && sectionAQuestionIds.includes(id);
    });

    const answerDetails = uniqueRows.map((answer) => {
      const qid = String(answer.question_id);
      const section = answer.section;
      const questionText = answer.question ?? `Question ${qid}`;
      const candidateAnswer = answer.selected_answer ?? "Question not found in database.";
      return {
        id: answer.id,
        attemptId: answer.attempt_id,
        questionId: qid,
        question: questionText,
        questionType: answer.questionType ?? "text",
        section,
        category: section,
        marks: answer.marks ?? 0,
        candidateAnswer,
        correctAnswer: answer.correctAnswer ?? "",
        isCorrect: answer.is_correct ?? null,
        aiComment: null,
        aiScore: null,
        notes: "",
      };
    });

    const aiEvaluation = normalizeAiEvaluation(candidate.ai_evaluation) ?? null;
    const normalizedStatus = typeof candidate.percentage === "number" && candidate.percentage >= 55 ? "PASS" : "FAIL";

    return {
      candidate: {
        id: candidate.id,
        full_name: candidate.full_name,
        email: candidate.email,
        phone: candidate.phone,
        education_status: candidate.education_status,
        role: candidate.role,
        status: normalizedStatus,
        completed: candidate.completed,
        total_score: candidate.total_score,
        percentage: candidate.percentage,
        mcq_score: candidate.mcq_score,
        descriptive_score: candidate.descriptive_score,
        ai_summary: candidate.ai_summary,
      },
      attemptId,
      assessmentId,
      questionsExpected: expectedQuestionIds.length,
      answersFound: answerRows?.length ?? 0,
      questionIdsFound: [...new Set(foundQuestionIds)],
      questionIdsMissing: missingQuestionIds,
      answers: answerDetails,
      aiEvaluation,
      evaluationStatus: aiEvaluation && Object.keys(aiEvaluation).length > 0 ? "available" : "pending",
      candidateAnswerSummary: candidate.descriptive_answer ?? "",
    };
  });

// Re-run AI evaluation for a candidate whose original evaluation fell back
// or was never stored, using the saved answers in assessment_answers.
export const reevaluateCandidate = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => GetInput.parse(raw))
  .handler(async ({ data }) => {
    requireAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { evaluateDescriptive } = await import("./evaluate.server");
    const { ROLES, PASS_PERCENTAGE, TOTAL_MARKS, MCQ_MARKS, getQuestionById } = await import("./assessment-data");

    const { data: row, error } = await supabaseAdmin
      .from("candidates")
      .select("id, role, descriptive_answer, mcq_score, ai_evaluation, ai_summary")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from("assessment_attempts")
      .select("id, assessment_id")
      .eq("candidate_id", data.id)
      .order("submitted_at", { ascending: false })
      .limit(1);
    if (attemptsError) throw new Error(attemptsError.message);

    const attempt = attempts?.[0] ?? null;
    const attemptId = attempt?.id ?? null;

    const { data: answerRows, error: answersError } = attemptId
      ? await supabaseAdmin.from("assessment_answers").select("*").eq("attempt_id", attemptId)
      : { data: [], error: null };
    if (answersError) throw new Error(answersError.message);

    let mcqScore = row.mcq_score ?? 0;
    const mcqAnswers = (answerRows ?? []).filter((answer) => {
      const q = getQuestionById(answer.question_id);
      return q && q.type === "mcq";
    });
    if (mcqAnswers.length > 0) {
      mcqScore = mcqAnswers.reduce((total, answer) => {
        const q = getQuestionById(answer.question_id);
        if (!q) return total;
        return total + (answer.selected_answer === q.correct ? q.marks : 0);
      }, 0);
    }
    const mcqPercent = Math.round((mcqScore / MCQ_MARKS) * 100);

    const role = row.role ?? "finance-intern";
    const roleDef = ROLES.find((r) => r.id === role);
    if (!roleDef) throw new Error("Unknown role on candidate record");

    const parsedComprehensive = parseComprehensiveRoleAnswers(row.descriptive_answer);
    const compositeResponse = [
      ...parsedComprehensive.map((entry) => `Q${entry.questionId}: ${entry.answer}`),
      ...((answerRows ?? [])
        .filter((answer) => String(answer.question_id) === "51" || String(answer.question_id) === "52" || String(answer.question_id) === "53")
        .map((answer) => `Q${answer.question_id}: ${answer.selected_answer ?? ""}`)),
    ].join("\n\n");

    const sourceAnswer = (row.descriptive_answer && row.descriptive_answer.trim()) || compositeResponse || "No stored descriptive answer was found.";
    const ai = await evaluateDescriptive(role, roleDef.prompt, sourceAnswer, mcqPercent);

    const totalScore = mcqScore + ai.descriptive_score;
    const percentage = Math.round((totalScore / TOTAL_MARKS) * 100);

    const payload = {
      ...ai,
      overallScore: totalScore,
      percentage,
      status: percentage >= PASS_PERCENTAGE ? "PASS" : "FAIL",
      sectionScores: {
        aptitude: Math.max(0, Math.min(100, Math.round((mcqScore / MCQ_MARKS) * 100))),
        mathematics: Math.max(0, Math.min(100, Math.round((mcqScore / MCQ_MARKS) * 100))),
        logical_reasoning: Math.max(0, Math.min(100, Math.round((mcqScore / MCQ_MARKS) * 100))),
        communication: Math.max(0, Math.min(100, Math.round(((ai.breakdown?.communication ?? 0) / 10) * 100))),
        comprehensive: Math.max(0, Math.min(100, Math.round(((ai.descriptive_score ?? 0) / 10) * 100))),
      },
    };

    const { error: upErr } = await supabaseAdmin
      .from("candidates")
      .update({
        descriptive_score: ai.descriptive_score,
        total_score: totalScore,
        percentage,
        status: percentage >= PASS_PERCENTAGE ? "PASS" : "FAIL",
        ai_evaluation: payload,
        ai_summary: ai.summary,
      })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);

    if (attemptId) {
      const { error: scoreError } = await supabaseAdmin
        .from("assessment_scores")
        .update({
          score: totalScore,
          percentage,
          ai_score: ai.descriptive_score,
          recommendation: ai.recommendation,
          strengths: ai.strengths,
          weaknesses: ai.weaknesses,
          summary: ai.summary,
        })
        .eq("attempt_id", attemptId);
      if (scoreError && scoreError.code !== "PGRST116") throw new Error(scoreError.message);
    }

    return { ok: true, fallback: ai.fallback === true, payload };
  });

