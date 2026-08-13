import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BrandHeader } from "@/components/BrandHeader";
import {
  ROLES,
  ASSESSMENT_DURATION_MIN,
  QUESTIONS_PER_ASSESSMENT,
  drawQuestionIds,
  getQuestionById,
  type MCQ,
  type RoleId,
} from "@/lib/assessment-data";
import { saveDraft, submitAssessment } from "@/lib/candidate.functions";

export const Route = createFileRoute("/assessment")({
  head: () => ({
    meta: [
      { title: "Assessment in Progress — Maple Learning Solutions" },
      { name: "description", content: "Timed internship assessment in progress." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const navigate = useNavigate();
  const draftFn = useServerFn(saveDraft);
  const submitFn = useServerFn(submitAssessment);

  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIds, setQuestionIds] = useState<number[]>([]);
  const [role, setRole] = useState<RoleId | "">("");
  const [descriptive, setDescriptive] = useState("");
  const [descriptiveByRole, setDescriptiveByRole] = useState<Record<RoleId, string>>({
    "finance-intern": "",
    "social-media-marketing": "",
    "business-development": "",
  });
  const [section, setSection] = useState<"a" | "b">("a");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remaining, setRemaining] = useState(ASSESSMENT_DURATION_MIN * 60);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [fullScreenAlert, setFullScreenAlert] = useState<string | null>(null);
  const submittedRef = useRef(false);

  // hydrate
  useEffect(() => {
    const id = sessionStorage.getItem("mls_candidate_id");
    const name = sessionStorage.getItem("mls_candidate_name") ?? "";
    if (!id) {
      navigate({ to: "/start" });
      return;
    }
    setCandidateId(id);
    setCandidateName(name);

    const savedStart = sessionStorage.getItem(`mls_start_${id}`);
    const now = Date.now();
    if (savedStart) {
      const elapsed = Math.floor((now - Number(savedStart)) / 1000);
      setRemaining(Math.max(0, ASSESSMENT_DURATION_MIN * 60 - elapsed));
    } else {
      sessionStorage.setItem(`mls_start_${id}`, String(now));
    }

    // Randomised paper: draw once per candidate, then keep it stable on refresh.
    const savedPaper = sessionStorage.getItem(`mls_paper_${id}`);
    let ids: number[] = [];
    if (savedPaper) {
      try {
        const parsed = JSON.parse(savedPaper) as number[];
        if (Array.isArray(parsed) && parsed.length === QUESTIONS_PER_ASSESSMENT) ids = parsed;
      } catch {}
    }
    if (ids.length === 0) {
      ids = drawQuestionIds();
      sessionStorage.setItem(`mls_paper_${id}`, JSON.stringify(ids));
    }
    setQuestionIds(ids);

    const savedAns = sessionStorage.getItem(`mls_ans_${id}`);
    if (savedAns) {
      try {
        const parsed = JSON.parse(savedAns);
        setAnswers(parsed.answers ?? {});
        setRole(parsed.role ?? "");
        setDescriptive(parsed.descriptive ?? "");
        setDescriptiveByRole({
          "finance-intern": parsed.descriptive_by_role?.["finance-intern"] ?? "",
          "social-media-marketing": parsed.descriptive_by_role?.["social-media-marketing"] ?? "",
          "business-development": parsed.descriptive_by_role?.["business-development"] ?? "",
        });
      } catch {}
    }
  }, [navigate]);

  // Timer
  useEffect(() => {
    if (!candidateId) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [candidateId]);

  // Auto-submit at 0
  useEffect(() => {
    if (remaining === 0 && candidateId && !submittedRef.current) {
      void handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, candidateId]);

  const combinedDescriptive = useMemo(
    () =>
      ROLES.map((r) => `${r.shortTitle}\n${descriptiveByRole[r.id].trim()}`)
        .join("\n\n---\n\n")
        .trim(),
    [descriptiveByRole],
  );

  // Autosave every 5s
  useEffect(() => {
    if (!candidateId) return;
    sessionStorage.setItem(
      `mls_ans_${candidateId}`,
      JSON.stringify({
        answers,
        role,
        descriptive,
        descriptive_by_role: descriptiveByRole,
      }),
    );
    setSaved("saving");
    const t = setTimeout(async () => {
      try {
        await draftFn({
          data: {
            id: candidateId,
            role: role || null,
            mcq_answers: answers,
            descriptive_answer: combinedDescriptive || descriptive,
          },
        });
        setSaved("saved");
      } catch {
        setSaved("idle");
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [answers, role, descriptive, descriptiveByRole, candidateId, draftFn, combinedDescriptive]);

  const questions = useMemo(
    () => questionIds.map((qid) => getQuestionById(qid)).filter(Boolean) as MCQ[],
    [questionIds],
  );

  const answeredCount = useMemo(
    () => Object.keys(answers).filter((k) => answers[k]?.trim().length).length,
    [answers],
  );
  const totalSteps = (questions.length || QUESTIONS_PER_ASSESSMENT) + 1;
  const doneSteps = answeredCount + (role && descriptive.trim().length > 5 ? 1 : 0);
  const progress = Math.round((doneSteps / totalSteps) * 100);
  const allQuestionsAnswered = questions.every((question) => {
    const value = answers[question.id];
    return typeof value === "string" && value.trim().length > 0;
  });
  const allRoleResponsesComplete = role ? descriptiveByRole[role].trim().length >= 20 : false;

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const timerCritical = remaining <= 60;

  async function requestAssessmentFullscreen() {
    try {
      if (document.fullscreenElement) {
        setFullScreenAlert(null);
        return;
      }

      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setFullScreenAlert(null);
      }
    } catch {
      setFullScreenAlert("Please return to full-screen mode to continue the assessment.");
    }
  }

  useEffect(() => {
    if (!candidateId) return;

    void requestAssessmentFullscreen();

    const handleFullScreenChange = () => {
      if (!document.fullscreenElement) {
        setFullScreenAlert("You left full-screen mode. Please return to the assessment immediately.");
      } else {
        setFullScreenAlert(null);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setFullScreenAlert("Please return to this assessment tab. Leaving the page may affect your submission.");
      }
    };

    const handleWindowBlur = () => {
      setFullScreenAlert("Please stay on this assessment page and return to full-screen mode.");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const blockedKeys = ["c", "v", "x", "p", "s", "a", "u", "i", "j"];
      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && blockedKeys.includes(key)) {
        event.preventDefault();
      }

      if (event.key === "Escape" || event.key === "F11" || event.key === "PrintScreen") {
        event.preventDefault();
      }
    };

    const preventDefaultBehavior = (event: Event) => event.preventDefault();

    document.addEventListener("fullscreenchange", handleFullScreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("copy", preventDefaultBehavior);
    document.addEventListener("cut", preventDefaultBehavior);
    document.addEventListener("paste", preventDefaultBehavior);
    document.addEventListener("contextmenu", preventDefaultBehavior);
    window.addEventListener("beforeunload", preventDefaultBehavior);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("copy", preventDefaultBehavior);
      document.removeEventListener("cut", preventDefaultBehavior);
      document.removeEventListener("paste", preventDefaultBehavior);
      document.removeEventListener("contextmenu", preventDefaultBehavior);
      window.removeEventListener("beforeunload", preventDefaultBehavior);
    };
  }, [candidateId]);

  async function handleSubmit(auto = false) {
    if (submittedRef.current || !candidateId) return;
    if (!auto) {
      const firstUnanswered = questions.findIndex((question) => {
        const value = answers[question.id];
        return !value || value.trim().length === 0;
      });

      if (firstUnanswered >= 0) {
        setSection("a");
        setCurrentIdx(firstUnanswered);
        setSubmitError("Please answer all questions before submitting the assessment.");
        return;
      }

      if (!role) {
        setSection("b");
        setSubmitError("Please choose your primary role in Section B.");
        return;
      }
      if (!allRoleResponsesComplete) {
        setSection("b");
        setSubmitError("Please answer the required role prompts before submitting the assessment.");
        return;
      }
      if (descriptive.trim().length < 20) {
        setSection("b");
        setSubmitError("Please write a more detailed answer for your selected role.");
        return;
      }
    }
    submittedRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitFn({
        data: {
          id: candidateId,
          role: (role || "finance-intern") as RoleId,
          mcq_answers: answers,
          descriptive_answer: combinedDescriptive || descriptive || "(No answer provided)",
        },
      });
      sessionStorage.removeItem(`mls_ans_${candidateId}`);
      sessionStorage.removeItem(`mls_start_${candidateId}`);
      sessionStorage.removeItem(`mls_paper_${candidateId}`);
      sessionStorage.removeItem("mls_candidate_id");
      navigate({ to: "/thank-you" });
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    }
  }

  if (!candidateId || questions.length === 0) return null;

  const currentQ = questions[currentIdx];
  const isTextQuestion = currentQ.type === "text";

  return (
    <div className="mesh-bg min-h-screen flex flex-col">
      <BrandHeader />

      {fullScreenAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-destructive/40 bg-white p-6 shadow-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-destructive">
              Assessment Notice
            </div>
            <h3 className="mt-3 font-display text-2xl font-bold text-brand">Please stay in the assessment screen</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{fullScreenAlert}</p>
            <button
              type="button"
              onClick={() => {
                void requestAssessmentFullscreen();
                setFullScreenAlert(null);
              }}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
            >
              Return to Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Sticky status bar */}
      <div className="sticky top-0 z-20 border-b border-border/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="chip">
                Section {section === "a" ? "A · Aptitude" : "B · Scenario"}
              </span>
              <span className="hidden sm:inline text-xs text-muted-foreground truncate">
                {candidateName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground">
                {saved === "saving" ? "Saving…" : saved === "saved" ? "Auto-saved" : ""}
              </span>
              <div
                className={`rounded-full px-4 py-1.5 font-mono text-sm font-bold tabular-nums ${
                  timerCritical ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-brand text-brand-foreground"
                }`}
              >
                {mm}:{ss}
              </div>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[color:var(--accent-green)] to-[color:var(--brand)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {doneSteps} of {totalSteps} answered
          </div>
        </div>
      </div>

      <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-10 pb-28">
        {section === "a" && (
          <>
            <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span>All questions are required</span>
            </div>

            <div className="card-premium p-8 animate-float-up" key={currentQ.id}>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--accent-green)]">
                Question {currentIdx + 1}
              </div>
              <h2 className="mt-2 font-display text-xl font-bold text-brand sm:text-2xl">{currentQ.question}</h2>

              {isTextQuestion ? (
                <div className="mt-6">
                  <textarea
                    value={answers[currentQ.id] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [currentQ.id]: e.target.value.slice(0, currentQ.maxLength ?? 500) }))}
                    rows={7}
                    placeholder={currentQ.placeholder ?? "Write your answer here…"}
                    className="w-full rounded-2xl border border-border bg-white p-4 text-sm text-brand outline-none transition focus:border-[color:var(--accent-green)] focus:ring-2 focus:ring-[color:var(--accent-green)]/20"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{(answers[currentQ.id] ?? "").trim().split(/\s+/).filter(Boolean).length} words</span>
                    <span>{(answers[currentQ.id] ?? "").length} / {currentQ.maxLength ?? 500}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {currentQ.options.map((opt) => {
                    const selected = answers[currentQ.id] === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [currentQ.id]: opt.key }))}
                        className={`group flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition ${
                          selected
                            ? "border-[color:var(--accent-green)] bg-[color:var(--accent-green)]/10"
                            : "border-border bg-white hover:border-brand/40"
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold uppercase ${
                            selected
                              ? "bg-[color:var(--accent-green)] text-brand"
                              : "bg-muted text-muted-foreground group-hover:bg-brand/10"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="text-sm font-medium text-brand sm:text-[15px]">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="btn-outline"
              >
                ← Previous
              </button>

              <div className="hidden sm:flex flex-wrap items-center gap-1.5">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(i)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${
                      i === currentIdx
                        ? "bg-brand text-brand-foreground"
                        : answers[q.id]
                        ? "bg-[color:var(--accent-green)]/25 text-brand"
                        : "bg-muted text-muted-foreground hover:bg-brand/10"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {currentIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="btn-brand sticky bottom-4 z-10"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!allQuestionsAnswered) {
                      const firstUnanswered = questions.findIndex((question) => {
                        const value = answers[question.id];
                        return !value || value.trim().length === 0;
                      });
                      if (firstUnanswered >= 0) {
                        setCurrentIdx(firstUnanswered);
                        setSubmitError("Please answer all questions before continuing to Section B.");
                        return;
                      }
                    }
                    setSubmitError(null);
                    setSection("b");
                  }}
                  className="btn-green sticky bottom-4 z-10"
                  disabled={!allQuestionsAnswered}
                >
                  Go to Section B →
                </button>
              )}
            </div>
          </>
        )}

        {section === "b" && (
          <div className="animate-float-up">
            <div className="mb-6">
              <div className="chip">Section B · Role Scenario</div>
              <h2 className="mt-3 font-display text-2xl font-bold text-brand sm:text-3xl">
                Choose your role and respond to the scenario
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Select ONE role that matches your internship interest. Your answer will be evaluated by AI on
                communication, clarity, creativity, role understanding, problem solving, and professionalism.
              </p>
            </div>

            <div className="mb-6 rounded-2xl border border-border bg-white/80 p-5">
              <p className="text-sm font-medium text-brand">Choose your primary role and answer all 3 required role prompts below.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {ROLES.map((r) => {
                  const selected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`rounded-2xl border-2 p-4 text-left transition ${
                        selected
                          ? "border-[color:var(--accent-green)] bg-[color:var(--accent-green)]/10"
                          : "border-border bg-white hover:border-brand/40"
                      }`}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--accent-green)]">
                        {selected ? "Primary Role" : "Role Option"}
                      </div>
                      <div className="mt-1 font-display text-sm font-bold text-brand">{r.shortTitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5">
              {ROLES.map((r) => {
                const value = descriptiveByRole[r.id];
                return (
                  <div key={r.id} className="card-premium p-8">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--accent-green)]">
                        Required Prompt · {r.shortTitle}
                      </div>
                      <span className="rounded-full bg-[color:var(--accent-green)]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                        Required
                      </span>
                    </div>
                    <p className="mt-2 font-display text-lg font-semibold text-brand sm:text-xl">{r.prompt}</p>
                    <textarea
                      value={value}
                      onChange={(e) => {
                        const nextValue = e.target.value.slice(0, 5000);
                        setDescriptiveByRole((prev) => ({ ...prev, [r.id]: nextValue }));
                        setDescriptive(nextValue);
                      }}
                      rows={7}
                      placeholder="Write your response here…"
                      className="mt-5 w-full rounded-xl border border-border bg-white p-4 text-sm text-brand outline-none transition focus:border-[color:var(--accent-green)] focus:ring-2 focus:ring-[color:var(--accent-green)]/20"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{value.trim().split(/\s+/).filter(Boolean).length} words</span>
                      <span>{value.length} / 5000</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {submitError && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => setSection("a")} className="btn-outline">
                ← Back to Section A
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitting || !allRoleResponsesComplete}
                className="btn-green"
              >
                {submitting ? "Submitting & evaluating…" : "Submit Assessment"}
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Once submitted, you cannot return to this assessment.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
