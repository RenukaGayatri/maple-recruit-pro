import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BrandHeader, BrandFooter } from "@/components/BrandHeader";
import { adminLogin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Login — Maple Learning Solutions" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const nav = useNavigate();
  const login = useServerFn(adminLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("mls_admin_token")) {
      nav({ to: "/admin/dashboard" });
    }
  }, [nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token } = await login({ data: { email, password } });
      localStorage.setItem("mls_admin_token", token);
      nav({ to: "/admin/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="mesh-bg min-h-screen flex flex-col">
      <BrandHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md animate-float-up">
          <div className="mb-6 text-center">
            <div className="chip mx-auto">Restricted Access</div>
            <h1 className="mt-4 font-display text-3xl font-bold text-brand">Admin Portal</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to review candidate assessments.</p>
          </div>
          <form onSubmit={onSubmit} className="glass rounded-3xl p-8 space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-brand">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-brand outline-none focus:border-[color:var(--accent-green)] focus:ring-2 focus:ring-[color:var(--accent-green)]/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-brand">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-brand outline-none focus:border-[color:var(--accent-green)] focus:ring-2 focus:ring-[color:var(--accent-green)]/20"
              />
            </div>
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-brand w-full">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
