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
      .select("id, full_name, email, role, created_at, submitted_at, completed, total_score, percentage, status, ai_summary")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const GetInput = z.object({ token: z.string(), id: z.string().uuid() });
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
