const VITE_PREFIX = 'VITE_';

function readEnvValue(keys: string[]) {
  if (typeof window !== 'undefined') {
    const fromWindow = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    for (const key of keys) {
      const value = fromWindow?.[key] ?? fromWindow?.[`${VITE_PREFIX}${key}`];
      if (value) return value;
    }
    return undefined;
  }

  for (const key of keys) {
    const value = process.env[key] ?? process.env[`${VITE_PREFIX}${key}`];
    if (value) return value;
  }
  return undefined;
}

export function getSupabaseEnvConfig() {
  const url = readEnvValue(['SUPABASE_URL', 'VITE_SUPABASE_URL']);
  const anonKey = readEnvValue(['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY']);
  const serviceRoleKey = readEnvValue(['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE']);

  const missing = [
    ...(!url ? ['SUPABASE_URL'] : []),
    ...(!anonKey ? ['SUPABASE_ANON_KEY'] : []),
    ...(!serviceRoleKey ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
  ];

  return {
    url,
    anonKey,
    serviceRoleKey,
    missing,
    isConfigured: Boolean(url && anonKey && serviceRoleKey),
    isAnonConfigured: Boolean(url && anonKey),
    isServiceConfigured: Boolean(url && serviceRoleKey),
  };
}

export function getSupabaseWarningMessage() {
  const { missing } = getSupabaseEnvConfig();
  if (missing.length === 0) return null;
  return `Supabase is not fully configured. Missing: ${missing.join(', ')}`;
}

export function assertSupabaseConfigured() {
  const { url, anonKey, serviceRoleKey, missing } = getSupabaseEnvConfig();
  if (!url || !anonKey || !serviceRoleKey) {
    const message = `Supabase is not configured. Add the missing variables: ${missing.join(', ')}.`;
    throw new Error(message);
  }
  return { url, anonKey, serviceRoleKey };
}

export function logSupabaseEnvStatus() {
  const message = getSupabaseWarningMessage();
  if (message) {
    console.warn(`[Supabase] ${message}`);
  }
}

export function getSupabaseErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

  if (/Invalid API key|JWT|401|403/i.test(message)) {
    return "Supabase rejected the API keys. Make sure the URL and keys belong to the same Supabase project and that you copied the actual project API keys from Supabase Dashboard → Project Settings → API.";
  }

  if (/fetch failed|Failed to fetch/i.test(message)) {
    return "Network or project configuration issue: check your Supabase project URL and whether the project is active.";
  }

  return message;
}
