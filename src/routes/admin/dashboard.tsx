import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BrandHeader } from "@/components/BrandHeader";
import { exportCandidatesCsv, listCandidates } from "@/lib/admin.functions";
import { PASS_PERCENTAGE, ROLES } from "@/lib/assessment-data";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Maple Learning Solutions" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type Row = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  education_status: string | null;
  role: string | null;
  created_at: string;
  submitted_at: string | null;
  completed: boolean;
  total_score: number | null;
  percentage: number | null;
  status: string | null;
  ai_summary: string | null;
};

function Dashboard() {
  const nav = useNavigate();
  const listFn = useServerFn(listCandidates);
  const exportFn = useServerFn(exportCandidatesCsv);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pass" | "fail" | "pending">("all");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("mls_admin_token") : null;
    if (!token) {
      nav({ to: "/admin" });
      return;
    }
    listFn({ data: { token } })
      .then((r) => setRows(r as Row[]))
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  }, [listFn, nav]);

  const stats = useMemo(() => {
    const r = rows ?? [];
    const completed = r.filter((x) => x.completed);
    const passed = completed.filter((x) => Number(x.percentage ?? 0) >= PASS_PERCENTAGE).length;
    const failed = completed.filter((x) => Number(x.percentage ?? 0) < PASS_PERCENTAGE).length;
    const avg = completed.length
      ? Math.round(completed.reduce((s, x) => s + (x.percentage ?? 0), 0) / completed.length)
      : 0;
    return {
      total: r.length,
      completed: completed.length,
      pending: r.length - completed.length,
      passed,
      failed,
      avg,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const r = rows ?? [];
    return r.filter((x) => {
      const pct = Number(x.percentage ?? 0);
      const isPass = pct >= PASS_PERCENTAGE;
      if (filter === "pass" && !isPass) return false;
      if (filter === "fail" && isPass) return false;
      if (filter === "pending" && x.completed) return false;
      if (q) {
        const t = q.toLowerCase();
        return x.full_name.toLowerCase().includes(t) || x.email.toLowerCase().includes(t);
      }
      return true;
    });
  }, [rows, q, filter]);

  async function handleExport() {
    const token = typeof window !== "undefined" ? localStorage.getItem("mls_admin_token") : null;
    if (!token) return;
    try {
      const result = await exportFn({ data: { token } });
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "assessment-candidates.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Export failed");
    }
  }

  function logout() {
    localStorage.removeItem("mls_admin_token");
    nav({ to: "/admin" });
  }

  return (
    <div className="mesh-bg min-h-screen">
      <BrandHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="chip">Admin Dashboard</div>
            <h1 className="mt-3 font-display text-3xl font-bold text-brand sm:text-4xl">Candidate Overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review all assessment submissions, scores, and AI-generated recommendations.
            </p>
          </div>
          <button onClick={logout} className="btn-outline text-sm">Sign out</button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-8">
          {[
            { k: "Total Candidates", v: stats.total, tone: "brand" },
            { k: "Completed", v: stats.completed, tone: "brand" },
            { k: "Pending", v: stats.pending, tone: "muted" },
            { k: "Passed", v: stats.passed, tone: "green" },
            { k: "Not Shortlisted", v: stats.failed, tone: "red" },
            { k: "Average Score", v: `${stats.avg}%`, tone: "brand" },
          ].map((c) => (
            <div key={c.k} className="card-premium p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.k}</div>
              <div
                className={`mt-2 font-display text-2xl font-extrabold ${
                  c.tone === "green"
                    ? "text-[color:var(--accent-green)]"
                    : c.tone === "red"
                    ? "text-destructive"
                    : "text-brand"
                }`}
              >
                {c.v}
              </div>
            </div>
          ))}
        </div>

        <div className="card-premium p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex flex-wrap gap-2">
              {(["all", "pass", "fail", "pending"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                    filter === f
                      ? "bg-brand text-brand-foreground"
                      : "bg-muted text-muted-foreground hover:bg-brand/10"
                  }`}
                >
                  {f === "all" ? "All" : f === "pass" ? "Passed" : f === "fail" ? "Not Shortlisted" : "Pending"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or email…"
                className="min-w-[220px] rounded-full border border-border bg-white px-4 py-2 text-sm outline-none focus:border-[color:var(--accent-green)]"
              />
              <button type="button" onClick={handleExport} className="btn-outline text-xs">
                Export CSV
              </button>
            </div>
          </div>

          {err && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {err}
            </div>
          )}
          {rows === null && !err && (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading candidates…</div>
          )}
          {rows && filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">No candidates match your filters.</div>
          )}

          {rows && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">Candidate</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Score</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Recommendation</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const roleTitle = ROLES.find((x) => x.id === r.role)?.shortTitle;
                    return (
                      <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-brand/[0.02]">
                        <td className="py-4 pr-4">
                          <div className="font-semibold text-brand">{r.full_name}</div>
                          <div className="text-xs text-muted-foreground">{r.email}</div>
                          <div className="text-[11px] text-muted-foreground">{r.phone ?? "—"}</div>
                          <div className="text-[11px] text-muted-foreground">{r.education_status ?? "—"}</div>
                        </td>
                        <td className="py-4 pr-4 text-xs text-muted-foreground">{roleTitle ?? "—"}</td>
                        <td className="py-4 pr-4 text-xs text-muted-foreground">
                          {new Date(r.submitted_at ?? r.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-4 pr-4">
                          {r.completed ? (
                            <span className="font-semibold text-brand">
                              {r.total_score}/30 · {r.percentage}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-4 pr-4">
                          {!r.completed ? (
                            <span className="badge-neutral">Pending</span>
                          ) : Number(r.percentage ?? 0) >= PASS_PERCENTAGE ? (
                            <span className="badge-pass">✓ Pass</span>
                          ) : (
                            <span className="badge-fail">✗ Not Shortlisted</span>
                          )}
                        </td>
                        <td className="py-4 pr-4 max-w-xs">
                          <div className="line-clamp-2 text-xs text-muted-foreground">
                            {r.ai_summary ?? "—"}
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <Link
                            to="/admin/candidate/$id"
                            params={{ id: r.id }}
                            className="text-xs font-semibold text-[color:var(--accent-green)] hover:underline"
                          >
                            View Assessment →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
