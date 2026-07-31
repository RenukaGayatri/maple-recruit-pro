import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BrandHeader } from "@/components/BrandHeader";
import { getCandidate, reevaluateCandidate } from "@/lib/admin.functions";
import { getQuestionById, type MCQ, ROLES } from "@/lib/assessment-data";


export const Route = createFileRoute("/admin/candidate/$id")({
  head: () => ({
    meta: [
      { title: "Candidate Assessment — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CandidateDetail,
});

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  education_status: string | null;
  role: string | null;
  mcq_answers: Record<string, string> | null;
  descriptive_answer: string | null;
  mcq_score: number | null;
  descriptive_score: number | null;
  total_score: number | null;
  percentage: number | null;
  status: string | null;
  ai_evaluation: {
    strengths?: string[];
    weaknesses?: string[];
    suggestions?: string[];
    recommendation?: string;
    summary?: string;
    breakdown?: Record<string, number>;
    fallback?: boolean;
  } | null;

  ai_summary: string | null;
  completed: boolean;
  submitted_at: string | null;
};

function CandidateDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const getFn = useServerFn(getCandidate);
  const reevalFn = useServerFn(reevaluateCandidate);
  const [c, setC] = useState<Candidate | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const [rerunMsg, setRerunMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("mls_admin_token") : null;
    if (!token) {
      nav({ to: "/admin" });
      return;
    }
    getFn({ data: { token, id } })
      .then((r) => setC(r as Candidate))
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  }, [getFn, id, nav]);

  useEffect(() => {
    load();
  }, [load]);

  async function onRerun() {
    const token = typeof window !== "undefined" ? localStorage.getItem("mls_admin_token") : null;
    if (!token) return;
    setRerunning(true);
    setRerunMsg(null);
    try {
      const res = await reevalFn({ data: { token, id } });
      setRerunMsg(
        res.fallback
          ? "AI is still unavailable — please try again in a minute."
          : "AI evaluation refreshed.",
      );
      load();
    } catch (e) {
      setRerunMsg(e instanceof Error ? e.message : "Re-evaluation failed");
    } finally {
      setRerunning(false);
    }
  }


  if (err)
    return (
      <div className="mesh-bg min-h-screen">
        <BrandHeader />
        <div className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-destructive">{err}</div>
      </div>
    );
  if (!c)
    return (
      <div className="mesh-bg min-h-screen">
        <BrandHeader />
        <div className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-muted-foreground">Loading…</div>
      </div>
    );

  const roleDef = ROLES.find((r) => r.id === c.role);
  const ai = c.ai_evaluation ?? {};

  return (
    <div className="mesh-bg min-h-screen">
      <BrandHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/admin/dashboard" className="text-xs text-muted-foreground hover:text-brand">
          ← Back to Dashboard
        </Link>

        {/* Header */}
        <div className="card-premium mt-4 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-brand sm:text-3xl">{c.full_name}</h1>
              <p className="text-sm text-muted-foreground">{c.email}</p>
              <p className="text-sm text-muted-foreground">Phone: {c.phone ?? "—"}</p>
              <p className="text-sm text-muted-foreground">Education: {c.education_status ?? "—"}</p>
              {roleDef && (
                <div className="mt-3 chip">
                  {roleDef.shortTitle}
                </div>
              )}
            </div>
            <div className="text-right">
              {c.completed ? (
                c.status === "PASS" ? (
                  <span className="badge-pass text-sm">✓ PASS — Eligible for Interview</span>
                ) : (
                  <span className="badge-fail text-sm">✗ NOT SHORTLISTED</span>
                )
              ) : (
                <span className="badge-neutral">Pending Submission</span>
              )}
              {c.completed && (
                <div className="mt-3">
                  <div className="font-display text-4xl font-extrabold text-brand">
                    {c.percentage}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.total_score} / 30 marks · MCQ {c.mcq_score}/20 · Scenario {c.descriptive_score}/10
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {c.completed && (
          <>
            {ai.fallback && (
              <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                AI scoring was unavailable when this candidate submitted (likely a busy period). Their
                answers and aptitude score are saved — re-run the evaluation to get the AI review.
              </div>
            )}

            {/* AI Analysis */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="card-premium p-6 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="chip">AI Hiring Summary</div>
                  <button
                    type="button"
                    onClick={onRerun}
                    disabled={rerunning}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-muted disabled:opacity-50"
                  >
                    {rerunning ? "Re-evaluating…" : "Re-run AI evaluation"}
                  </button>
                </div>
                {rerunMsg && <p className="mt-2 text-xs text-muted-foreground">{rerunMsg}</p>}
                <p className="mt-3 text-sm leading-relaxed text-brand">{ai.summary ?? c.ai_summary}</p>

                {ai.recommendation && (
                  <div className="mt-4 rounded-xl bg-brand p-4 text-brand-foreground">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--accent-green)]">
                      Recommendation
                    </div>
                    <div className="mt-1 font-display text-lg font-bold">{ai.recommendation}</div>
                  </div>
                )}
              </div>
              <div className="card-premium p-6">
                <div className="chip">Score Breakdown</div>
                <div className="mt-3 space-y-2">
                  {ai.breakdown &&
                    Object.entries(ai.breakdown).map(([k, v]) => (
                      <div key={k}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</span>
                          <span className="font-semibold text-brand">{v}/10</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[color:var(--accent-green)] to-brand"
                            style={{ width: `${(Number(v) / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div className="card-premium p-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--accent-green)]">
                  Strengths
                </div>
                <ul className="mt-3 space-y-2 text-sm text-brand">
                  {(ai.strengths ?? []).map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[color:var(--accent-green)]">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-premium p-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-destructive">Weaknesses</div>
                <ul className="mt-3 space-y-2 text-sm text-brand">
                  {(ai.weaknesses ?? []).map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-destructive">!</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-premium p-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-brand">Suggestions</div>
                <ul className="mt-3 space-y-2 text-sm text-brand">
                  {(ai.suggestions ?? []).map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-brand">→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* MCQ answers */}
            <div className="mt-8">
              <h2 className="font-display text-xl font-bold text-brand mb-4">
                Section A — General Aptitude (MCQ)
              </h2>
              <p className="-mt-2 mb-4 text-xs text-muted-foreground">
                Each candidate receives a randomly drawn paper from a 50-question bank.
              </p>
              <div className="space-y-3">
                {(Object.keys(c.mcq_answers ?? {})
                  .map((qid) => getQuestionById(qid))
                  .filter(Boolean) as MCQ[]).map((q, qi) => {
                  const chosen = c.mcq_answers?.[String(q.id)];
                  const correct = q.correct;
                  const isCorrect = chosen === correct;
                  return (
                    <div key={q.id} className="card-premium p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Question {qi + 1} · 2 marks
                          </div>
                          <div className="mt-1 font-semibold text-brand">{q.question}</div>
                        </div>
                        {chosen ? (
                          isCorrect ? (
                            <span className="badge-pass">+2</span>
                          ) : (
                            <span className="badge-fail">0</span>
                          )
                        ) : (
                          <span className="badge-neutral">Skipped</span>
                        )}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {q.options.map((opt) => {
                          const isChosen = chosen === opt.key;
                          const isRight = opt.key === correct;
                          let cls = "border-border bg-white text-brand";
                          if (isRight) cls = "border-[color:var(--accent-green)] bg-[color:var(--accent-green)]/10 text-brand";
                          if (isChosen && !isRight)
                            cls = "border-destructive bg-destructive/10 text-destructive";
                          return (
                            <div
                              key={opt.key}
                              className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${cls}`}
                            >
                              <span className="font-bold uppercase">{opt.key})</span>
                              <span className="flex-1">{opt.text}</span>
                              {isChosen && <span className="text-[11px] font-bold uppercase">Chosen</span>}
                              {isRight && !isChosen && (
                                <span className="text-[11px] font-bold uppercase text-[color:var(--accent-green)]">
                                  Correct
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Descriptive */}
            <div className="mt-8">
              <h2 className="font-display text-xl font-bold text-brand mb-4">Section B — Scenario Response</h2>
              <div className="card-premium p-6">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--accent-green)]">
                  Prompt · {roleDef?.shortTitle}
                </div>
                <p className="mt-1 font-semibold text-brand">{roleDef?.prompt}</p>
                <div className="mt-5 rounded-xl bg-muted/60 p-4 text-sm leading-relaxed text-brand whitespace-pre-wrap">
                  {c.descriptive_answer}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">AI Descriptive Score</span>
                  <span className="font-bold text-brand">{c.descriptive_score}/10</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
