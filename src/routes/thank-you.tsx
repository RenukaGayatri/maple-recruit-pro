import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader, BrandFooter } from "@/components/BrandHeader";

export const Route = createFileRoute("/thank-you")({
  head: () => ({
    meta: [
      { title: "Thank You — Maple Learning Solutions" },
      { name: "description", content: "Your assessment has been submitted successfully." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThankYou,
});

function ThankYou() {
  return (
    <div className="mesh-bg min-h-screen flex flex-col">
      <BrandHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-xl text-center animate-float-up">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-[color:var(--accent-green)]/20">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="3">
              <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-brand sm:text-4xl">
            Thank You for Completing the Assessment
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Thank you for taking the time to complete the Maple Learning Solutions Recruitment Assessment. Your
            responses have been successfully submitted.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Our recruitment team will review your assessment and shortlisted candidates will be contacted regarding
            the next stage of the recruitment process.
          </p>
          <p className="mt-3 text-sm font-medium text-brand">
            We appreciate your interest in joining Maple Learning Solutions and wish you all the best.
          </p>
          <Link to="/" className="btn-outline mt-8 inline-flex items-center gap-2">
            Return to Home
          </Link>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
