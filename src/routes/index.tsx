import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader, BrandFooter } from "@/components/BrandHeader";
import { ROLES } from "@/lib/assessment-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maple Learning Solutions — Internship Assessment Portal" },
      {
        name: "description",
        content:
          "Welcome to the Maple Learning Solutions Recruitment Assessment. Shortlisted internship candidates begin their written assessment here.",
      },
      { property: "og:title", content: "Maple Learning Solutions — Internship Assessment Portal" },
      {
        property: "og:description",
        content: "Welcome to the Maple Learning Solutions Recruitment Assessment. Shortlisted internship candidates begin their written assessment here.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="mesh-bg min-h-screen">
      <BrandHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div className="animate-float-up">
            <div className="chip mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent-green)]" />
              Campus Recruitment Drive · 2026
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] text-brand sm:text-5xl lg:text-6xl">
              Internship <span className="text-[color:var(--accent-green)]">Assessment</span> Portal
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Welcome to the Maple Learning Solutions Recruitment Assessment. Candidates shortlisted after applying
              through our careers portal are invited to complete this written assessment.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              This assessment helps us evaluate your aptitude, communication skills, and role suitability before
              proceeding to the interview rounds.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/start" className="btn-green inline-flex items-center gap-2">
                Start Assessment
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand/5 text-brand">⏱</span>
                20 min · 30 marks · No negative marking
              </div>
            </div>
          </div>

          {/* Hero card */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-[color:var(--accent-green)]/20 blur-3xl" />
            <div className="glass relative rounded-[1.75rem] p-8 shadow-[var(--shadow-premium)]">
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { k: "11", v: "Questions" },
                  { k: "30", v: "Total Marks" },
                  { k: "70%", v: "To Qualify" },
                ].map((s) => (
                  <div key={s.v} className="rounded-2xl bg-white/70 p-4">
                    <div className="font-display text-3xl font-extrabold text-brand">{s.k}</div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {s.v}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-3">
                {[
                  "Aptitude · Reasoning · Language",
                  "Role-based scenario response",
                  "Instant AI-powered evaluation",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-3 rounded-xl bg-white/60 p-3">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--accent-green)]/20 text-[color:var(--accent-green)]">
                      ✓
                    </div>
                    <span className="text-sm font-medium text-brand">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hiring process */}
      <section className="relative border-t border-border/40 bg-white/60 py-20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <div className="chip mx-auto">Our Hiring Process</div>
            <h2 className="mt-4 font-display text-3xl font-bold text-brand sm:text-4xl">
              A clear path from assessment to offer
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Candidates scoring 70% or above will qualify for the interview process.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  n: "01",
                  t: "Online Assessment",
                  d: "A randomly generated paper covering aptitude, reasoning, language, and a role-specific scenario.",
                  meta: "Minimum qualifying score: 70%",
                },
                {
                  n: "02",
                  t: "Shortlisting",
                  d: "Candidates are shortlisted based on their assessment scores and AI-evaluated responses.",
                  meta: "Based on assessment scores",
                },
                {
                  n: "03",
                  t: "Role-Based Interview",
                  d: "A focused discussion on the role you applied for, testing depth, fit, and practical thinking.",
                  meta: "Shortlisted candidates only",
                },
                {
                  n: "04",
                  t: "Manager Interview",
                  d: "Final round with the hiring manager covering expectations, working style, and offer roll-out.",
                  meta: "Culminates in the offer",
                },
              ].map((s) => (
                <div key={s.n} className="card-premium card-premium-hover relative p-7">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-lg">
                    <span className="font-display text-xl font-bold text-[color:var(--accent-green)]">{s.n}</span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-brand">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                  <div className="mt-4 border-t border-border/60 pt-4 text-xs font-semibold uppercase tracking-wider text-[color:var(--accent-green)]">
                    {s.meta}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <div className="chip mx-auto">Available Internships</div>
            <h2 className="mt-4 font-display text-3xl font-bold text-brand sm:text-4xl">Open internship roles</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {ROLES.map((r, i) => (
              <div
                key={r.id}
                className="card-premium card-premium-hover p-7 animate-float-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[color:var(--accent-green)]/20 to-brand/10">
                  <span className="font-display text-lg font-bold text-brand">{i + 1}</span>
                </div>
                <h3 className="font-display text-lg font-bold leading-snug text-brand">{r.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* College partner */}
      <section className="border-t border-border/40 bg-brand py-14 text-brand-foreground">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[color:var(--accent-green)]">
            Campus Recruitment Partner
          </div>
          <h3 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Siva Shivani Degree College</h3>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/70">
            Proudly conducting our internship recruitment drive on campus this season.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-2xl font-bold text-brand sm:text-3xl">Ready when you are.</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The assessment takes about 20 minutes. Make sure you have a stable connection.
          </p>
          <Link to="/start" className="btn-green mt-6 inline-flex items-center gap-2">
            Start Assessment →
          </Link>
        </div>
      </section>

      <BrandFooter />
    </div>
  );
}
