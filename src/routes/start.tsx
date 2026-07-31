import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BrandHeader, BrandFooter } from "@/components/BrandHeader";
import { createCandidate } from "@/lib/candidate.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Begin Assessment — Maple Learning Solutions" },
      {
        name: "description",
        content: "Enter your details to begin the Maple Learning Solutions internship assessment.",
      },
      { property: "og:title", content: "Begin Assessment — Maple Learning Solutions" },
      { property: "og:description", content: "Register your details to begin the internship assessment." },
    ],
  }),
  component: StartPage,
});

function StartPage() {
  const navigate = useNavigate();
  const createFn = useServerFn(createCandidate);
  const [fullName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [educationStatus, setEducationStatus] = useState<"Still Pursuing" | "Completed">("Still Pursuing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !email.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      const { id } = await createFn({
        data: {
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          education_status: educationStatus,
        },
      });
      sessionStorage.setItem("mls_candidate_id", id);
      sessionStorage.setItem("mls_candidate_name", fullName.trim());
      sessionStorage.setItem("mls_candidate_phone", phone.trim());
      sessionStorage.setItem("mls_candidate_education_status", educationStatus);
      navigate({ to: "/assessment" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="mesh-bg min-h-screen flex flex-col">
      <BrandHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg animate-float-up">
          <div className="mb-8 text-center">
            <div className="chip mx-auto">Step 1 of 2</div>
            <h1 className="mt-4 font-display text-3xl font-bold text-brand sm:text-4xl">Before you begin</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We'll use these details to identify your submission. This information is stored securely.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="glass rounded-3xl p-8 space-y-5 shadow-[var(--shadow-premium)]"
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-brand">Full Name</label>
              <input
                type="text"
                required
                maxLength={120}
                value={fullName}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name as per college records"
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-brand outline-none transition focus:border-[color:var(--accent-green)] focus:ring-2 focus:ring-[color:var(--accent-green)]/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-brand">Email Address</label>
              <input
                type="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-brand outline-none transition focus:border-[color:var(--accent-green)] focus:ring-2 focus:ring-[color:var(--accent-green)]/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-brand">Phone Number</label>
              <input
                type="tel"
                required
                maxLength={30}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-brand outline-none transition focus:border-[color:var(--accent-green)] focus:ring-2 focus:ring-[color:var(--accent-green)]/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-brand">Education Status</label>
              <select
                required
                value={educationStatus}
                onChange={(e) => setEducationStatus(e.target.value as "Still Pursuing" | "Completed")}
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-brand outline-none transition focus:border-[color:var(--accent-green)] focus:ring-2 focus:ring-[color:var(--accent-green)]/20"
              >
                <option value="Still Pursuing">Still Pursuing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-green w-full">
              {loading ? "Preparing your assessment…" : "Begin Assessment →"}
            </button>

            <p className="text-center text-[11px] text-muted-foreground">
              By continuing you agree that your responses will be evaluated by our recruitment team.
            </p>
          </form>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
