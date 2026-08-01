import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BrandHeader } from "@/components/BrandHeader";
import { getCandidateAssessmentDetail, reevaluateCandidate } from "@/lib/admin.functions";
import { PASS_PERCENTAGE, ROLES } from "@/lib/assessment-data";

export const Route = createFileRoute("/admin/candidate/$id")({
  head: () => ({
    meta: [
      { title: "Candidate Assessment — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CandidateDetail,
});

type DetailCandidate = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  education_status: string | null;
  role: string | null;
  status: string | null;
  completed: boolean;
  total_score: number | null;
  percentage: number | null;
  mcq_score: number | null;
  descriptive_score: number | null;
  ai_summary: string | null;
};

type AnswerRow = {
  id: string;
  attemptId: string | null;
  questionId: string;
  question: string;
  questionType: string;
  section: string;
  category: string;
  marks: number;
  candidateAnswer: string;
  correctAnswer: string;
  isCorrect: boolean | null;
  aiComment: string | null;
  aiScore: number | null;
  notes: string;
};

type AssessmentDetail = {
  candidate: DetailCandidate;
  attemptId: string | null;
  assessmentId: string | null;
  questionsExpected: number;
  answersFound: number;
  questionIdsFound: string[];
  questionIdsMissing: string[];
  answers: AnswerRow[];
  aiEvaluation: Record<string, unknown> | null;
  evaluationStatus: "available" | "pending";
  candidateAnswerSummary: string;
};

const SECTION_ORDER = [
  "Aptitude",
  "Logical Reasoning",
  "Mathematics",
  "Communication",
  "Section A Comprehensive",
  "Section B Comprehensive",
];

function CandidateDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const getDetailFn = useServerFn(getCandidateAssessmentDetail);
  const reevalFn = useServerFn(reevaluateCandidate);
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const [rerunMsg, setRerunMsg] = useState<string | null>(null);
  const [manualEdits, setManualEdits] = useState<Record<string, { score: string; notes: string }>>({});

  const load = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("mls_admin_token") : null;
    if (!token) {
      nav({ to: "/admin" });
      return;
    }
    getDetailFn({ data: { token, id } })
      .then((r) => setDetail(r as AssessmentDetail))
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load candidate details"));
  }, [getDetailFn, id, nav]);

  useEffect(() => {
    load();
  }, [load]);

  const ai = detail?.aiEvaluation ?? null;
  const roleDef = ROLES.find((r) => r.id === detail?.candidate.role ?? "");
  const isQualified = Number(detail?.candidate.percentage ?? 0) >= PASS_PERCENTAGE;

  const groupedAnswers = useMemo(() => {
    const groups: Record<string, AnswerRow[]> = {};
    SECTION_ORDER.forEach((section) => {
      groups[section] = [];
    });
    for (const answer of detail?.answers ?? []) {
      const section = answer.section || "General";
      if (!groups[section]) groups[section] = [];
      groups[section].push(answer);
    }
    return groups;
  }, [detail]);

  const performanceCards = useMemo(() => {
    const overallScore = typeof detail?.candidate.percentage === "number" ? detail.candidate.percentage : 0;
    return [{ label: "Overall Score", value: overallScore, percent: overallScore }];
  }, [detail]);

  async function onRerun() {
    const token = typeof window !== "undefined" ? localStorage.getItem("mls_admin_token") : null;
    if (!token || !detail) return;

    setRerunning(true);
    setRerunMsg(null);
    try {
      const res = await reevalFn({ data: { token, id } });
      setRerunMsg(
        res.fallback ? "AI is still temporarily unavailable. The stored answers remain visible and the admin can retry." : "AI evaluation refreshed.",
      );
      load();
    } catch (e) {
      setRerunMsg(e instanceof Error ? e.message : "Re-evaluation failed");
    } finally {
      setRerunning(false);
    }
  }

  function getPerformanceLabel(score: number) {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 55) return "Average";
    return "Needs Improvement";
  }

  function renderAnswerTable(rows: AnswerRow[], sectionLabel: string) {
    if (!rows.length) return null;
    return (
      <div key={sectionLabel} className="mt-8">
        <h3 className="font-display text-xl font-bold text-brand">{sectionLabel}</h3>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-white/80">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Candidate Answer</th>
                <th className="px-4 py-3">Correct Answer</th>
                {sectionLabel.includes("Comprehensive") ? <th className="px-4 py-3">AI Evaluation</th> : <th className="px-4 py-3">Correct / Incorrect</th>}
                <th className="px-4 py-3">Marks</th>
                {sectionLabel.includes("Comprehensive") && <th className="px-4 py-3">Comments</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const aiSummary =
                  typeof ai === "object" && ai && "summary" in ai && typeof ai.summary === "string" ? ai.summary : "";
                const qId = row.questionId;
                const isComprehensive = sectionLabel.includes("Comprehensive");
                const editable = manualEdits[qId] ?? { score: "", notes: "" };
                return (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="px-4 py-4 font-medium text-brand">{row.question}</td>
                    <td
                      className={[
                        "px-4 py-4 whitespace-pre-wrap max-w-md",
                        row.isCorrect === true ? "bg-emerald-50 text-emerald-900" : row.isCorrect === false ? "bg-red-50 text-red-900" : "text-brand",
                      ].join(" ")}
                    >
                      {row.candidateAnswer || "—"}
                    </td>
                    <td className="px-4 py-4 text-brand whitespace-pre-wrap max-w-md">{row.correctAnswer || "—"}</td>
                    {isComprehensive ? (
                      <td className="px-4 py-4 align-top">
                        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                          {aiSummary || "AI comment pending"}
                        </div>
                      </td>
                    ) : (
                      <td className={[
                        "px-4 py-4 font-semibold",
                        row.isCorrect === true ? "text-emerald-700" : row.isCorrect === false ? "text-red-700" : "text-brand",
                      ].join(" ")}>
                        {row.isCorrect === true ? "Correct" : row.isCorrect === false ? "Incorrect" : "Not scored"}
                      </td>
                    )}
                    <td className="px-4 py-4 font-semibold text-brand">{row.marks}</td>
                    {isComprehensive && (
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <input
                            value={editable.score}
                            onChange={(e) =>
                              setManualEdits((prev) => ({
                                ...prev,
                                [qId]: { ...prev[qId], score: e.target.value },
                              }))
                            }
                            placeholder="Score"
                            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs outline-none focus:border-[color:var(--accent-green)]"
                          />
                          <textarea
                            value={editable.notes}
                            onChange={(e) =>
                              setManualEdits((prev) => ({
                                ...prev,
                                [qId]: { ...prev[qId], notes: e.target.value },
                              }))
                            }
                            placeholder="Notes"
                            className="min-h-[80px] w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs outline-none focus:border-[color:var(--accent-green)]"
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (err)
    return (
      <div className="mesh-bg min-h-screen">
        <BrandHeader />
        <div className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-destructive">{err}</div>
      </div>
    );
  if (!detail)
    return (
      <div className="mesh-bg min-h-screen">
        <BrandHeader />
        <div className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-muted-foreground">Loading candidate assessment…</div>
      </div>
    );

  const candidate = detail.candidate;
  const hasAi = detail.evaluationStatus === "available" && ai && Object.keys(ai).length > 0;

  return (
    <div className="mesh-bg min-h-screen">
      <BrandHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/admin/dashboard" className="text-xs text-muted-foreground hover:text-brand">
          ← Back to Dashboard
        </Link>

        <div className="card-premium mt-4 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-brand sm:text-3xl">{candidate.full_name}</h1>
              <p className="text-sm text-muted-foreground">{candidate.email}</p>
              <p className="text-sm text-muted-foreground">Phone: {candidate.phone ?? "—"}</p>
              <p className="text-sm text-muted-foreground">Education: {candidate.education_status ?? "—"}</p>
              {roleDef && <div className="mt-3 chip">{roleDef.shortTitle}</div>}
            </div>
            <div className="text-right">
              {candidate.completed ? (
                isQualified ? (
                  <span className="badge-pass text-sm">✓ PASS — Eligible for Interview</span>
                ) : (
                  <span className="badge-fail text-sm">✗ NOT SHORTLISTED</span>
                )
              ) : (
                <span className="badge-neutral">Pending Submission</span>
              )}
              {candidate.total_score != null && candidate.percentage != null && (
                <div className="mt-3">
                  <div className="font-display text-4xl font-extrabold text-brand">{candidate.percentage}%</div>
                  <div className="text-xs text-muted-foreground">
                    {candidate.total_score} / 30 marks · MCQ {candidate.mcq_score ?? 0}/20 · Scenario {candidate.descriptive_score ?? 0}/10
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-1 xl:grid-cols-1">
          {performanceCards.map((card) => (
            <div key={card.label} className="card-premium p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</div>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="font-display text-3xl font-bold text-brand">{card.value}</div>
                <div className="text-right text-xs text-muted-foreground">{card.percent}%</div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-gradient-to-r from-[color:var(--accent-green)] to-brand" style={{ width: `${Math.min(100, Math.max(0, card.percent))}%` }} />
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{getPerformanceLabel(card.percent)}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="card-premium p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="chip">AI Evaluation</div>
              <button
                type="button"
                onClick={onRerun}
                disabled={rerunning}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-brand hover:bg-muted disabled:opacity-50"
              >
                {rerunning ? "Re-evaluating…" : "Re-run AI Evaluation"}
              </button>
            </div>

            {hasAi ? (
              <>
                <div className="mt-5 rounded-xl bg-brand p-4 text-brand-foreground">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--accent-green)]">
                    Overall AI Score
                  </div>
                  <div className="mt-2 font-display text-3xl font-bold">{typeof ai?.overallScore === "number" ? ai.overallScore : candidate.total_score ?? 0}</div>
                </div>
                <div className="mt-5 space-y-3 text-sm text-brand">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recommendation</div>
                    <div className="mt-1 font-semibold">{String((ai?.recommendation as string) ?? candidate.status ?? "—")}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Summary</div>
                    <p className="mt-1 leading-relaxed">{String((ai?.summary as string) ?? candidate.ai_summary ?? "No summary available.")}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
                Assessment answers are stored successfully. AI evaluation is pending.
              </div>
            )}

            {rerunMsg && <p className="mt-3 text-xs text-muted-foreground">{rerunMsg}</p>}
          </div>

          <div className="card-premium p-6">
            <div className="chip">Admin Debug Panel</div>
            <div className="mt-4 space-y-2 text-sm text-brand">
              <div><span className="text-muted-foreground">Attempt ID:</span> {detail.attemptId ?? "—"}</div>
              <div><span className="text-muted-foreground">Assessment ID:</span> {detail.assessmentId ?? "—"}</div>
              <div><span className="text-muted-foreground">Candidate ID:</span> {candidate.id}</div>
              <div><span className="text-muted-foreground">Questions Expected:</span> {detail.questionsExpected}</div>
              <div><span className="text-muted-foreground">Answers Found:</span> {detail.answersFound}</div>
              <div><span className="text-muted-foreground">Question IDs Found:</span> {detail.questionIdsFound.join(", ") || "—"}</div>
              <div><span className="text-muted-foreground">Question IDs Missing:</span> {detail.questionIdsMissing.length ? detail.questionIdsMissing.join(", ") : "None"}</div>
              <div><span className="text-muted-foreground">AI Evaluation Status:</span> {detail.evaluationStatus}</div>
            </div>
          </div>
        </div>

        {hasAi && ai && (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="card-premium p-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--accent-green)]">Strengths</div>
              <ul className="mt-3 space-y-2 text-sm text-brand">
                {Array.isArray(ai.strengths) ? ai.strengths.map((s, i) => <li key={i}>✓ {String(s)}</li>) : <li>—</li>}
              </ul>
            </div>
            <div className="card-premium p-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-destructive">Weaknesses</div>
              <ul className="mt-3 space-y-2 text-sm text-brand">
                {Array.isArray(ai.weaknesses) ? ai.weaknesses.map((s, i) => <li key={i}>! {String(s)}</li>) : <li>—</li>}
              </ul>
            </div>
            <div className="card-premium p-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-brand">Hiring Recommendation</div>
              <div className="mt-3 text-sm text-brand">{String((ai?.recommendation as string) ?? "—")}</div>
            </div>
          </div>
        )}

        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold text-brand">Assessment Answers</h2>
          {detail.answers.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Question not found in database. No stored answers were available for this attempt.
            </div>
          ) : (
            <>
              {SECTION_ORDER.map((section) => renderAnswerTable(groupedAnswers[section] ?? [], section))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
