// Server-only AI evaluation helper with retry/backoff so a burst of concurrent
// submissions (e.g. 80 candidates finishing at once) survives gateway rate limits.
import { ROLES, PASS_PERCENTAGE } from "./assessment-data";

export type AiEval = {
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
  fallback?: boolean;
};

const MAX_ATTEMPTS = 5;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffMs(attempt: number) {
  // 1s, 2s, 4s, 8s + jitter to spread simultaneous retries apart
  return 2 ** attempt * 1000 + Math.floor(Math.random() * 750);
}

export async function evaluateDescriptive(
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

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      let res: Response;
      try {
        res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
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
      } finally {
        clearTimeout(timeout);
      }

      if (res.status === 429 || res.status >= 500) {
        const body = await res.text();
        if (attempt < MAX_ATTEMPTS - 1) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new Error(`AI gateway ${res.status}: ${body}`);
      }
      if (!res.ok) {
        throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
      }

      const json = (await res.json()) as { choices: { message: { content: string } }[] };
      const parsed = JSON.parse(json.choices[0].message.content) as AiEval;
      parsed.descriptive_score = Math.max(0, Math.min(10, Math.round(parsed.descriptive_score)));
      parsed.fallback = false;
      return parsed;
    } catch (err) {
      const retryable =
        attempt < MAX_ATTEMPTS - 1 &&
        !(err instanceof Error && err.message === "Missing LOVABLE_API_KEY");
      if (retryable) {
        await sleep(backoffMs(attempt));
        continue;
      }
      console.error("AI evaluation failed after retries:", err);
      break;
    }
  }

  // Deterministic fallback so a submission is never lost.
  const wc = answer.trim().split(/\s+/).length;
  const base = Math.min(10, Math.max(3, Math.round(wc / 15)));
  return {
    descriptive_score: base,
    strengths: ["Provided a written response within the time limit."],
    weaknesses: ["Automated evaluation was unavailable — manual review recommended."],
    suggestions: ["Re-run the AI evaluation from the admin panel, or review manually."],
    recommendation: mcqPercent >= PASS_PERCENTAGE ? "Recommended for Interview" : "Not Recommended",
    summary:
      "Automated AI evaluation could not be completed. Re-run the evaluation from the admin panel or review this candidate manually.",
    breakdown: {
      communication: base,
      clarity: base,
      creativity: base,
      role_understanding: base,
      problem_solving: base,
      professionalism: base,
    },
    fallback: true,
  };
}
