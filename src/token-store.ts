// Token store — Modo Supabase
// Lee el access_token de la tabla oauth_tokens en Supabase.
// El token es refresheado externamente (n8n cron cada 2h) y persistido en Supabase.
// Schema esperado:
//   tabla: oauth_tokens (en schema por defecto del client)
//   columnas relevantes: account_label (text), access_token (text), expires_at (timestamptz)
// Configurable vía env vars (acepta convenciones genéricas o de Next.js):
//   SUPABASE_URL  o  NEXT_PUBLIC_SUPABASE_URL     — URL del project
//   SUPABASE_SERVICE_KEY  o  SUPABASE_SERVICE_ROLE_KEY — service_role key (bypass RLS)
//   ML_ACCOUNT_LABEL          — valor a matchear contra account_label (default: 'miami')
//   ML_TOKEN_TABLE            — tabla (default: 'oauth_tokens')

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface CachedToken {
  accessToken: string
  expiresAt: number // ms epoch
}

let supabase: SupabaseClient | null = null
let cached: CachedToken | null = null

// Margen de seguridad: refrescar 60s antes del vencimiento real
const REFRESH_MARGIN_MS = 60 * 1000

function getUrl(): string | undefined {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
}

function getServiceKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
}

export function isSupabaseModeEnabled(): boolean {
  return Boolean(getUrl() && getServiceKey())
}

function getSupabaseClient(): SupabaseClient {
  if (supabase) return supabase
  const url = getUrl()
  const key = getServiceKey()
  if (!url || !key) {
    throw new Error(
      'Supabase mode requiere (SUPABASE_URL | NEXT_PUBLIC_SUPABASE_URL) y ' +
        '(SUPABASE_SERVICE_KEY | SUPABASE_SERVICE_ROLE_KEY) en el entorno.'
    )
  }
  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return supabase
}

export async function getAccessTokenFromSupabase(): Promise<string> {
  // Reusar token cacheado si todavía es válido
  if (cached && cached.expiresAt > Date.now() + REFRESH_MARGIN_MS) {
    return cached.accessToken
  }

  const client = getSupabaseClient()
  const table = process.env.ML_TOKEN_TABLE || 'oauth_tokens'
  const accountLabel = process.env.ML_ACCOUNT_LABEL || 'miami'

  const { data, error } = await client
    .from(table)
    .select('access_token, expires_at')
    .eq('account_label', accountLabel)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(
      `Error leyendo token de Supabase (${table} where account_label='${accountLabel}'): ${error.message}`
    )
  }

  if (!data || !data.access_token) {
    throw new Error(
      `No se encontró access_token en ${table} para account_label='${accountLabel}'. ` +
        'Asegurate de que n8n haya completado al menos un OAuth callback.'
    )
  }

  const expiresAt = data.expires_at
    ? new Date(data.expires_at).getTime()
    : Date.now() + 6 * 60 * 60 * 1000 // fallback 6h si no hay expires_at

  if (expiresAt < Date.now()) {
    console.error(
      `[ml-mcp] WARNING: token de Supabase ya expiró (${new Date(expiresAt).toISOString()}). ` +
        'n8n debería renovarlo cada 2h. Lo uso igual pero esperá errores 401.'
    )
  }

  cached = { accessToken: data.access_token, expiresAt }
  return cached.accessToken
}

export function clearSupabaseTokenCache(): void {
  cached = null
}
