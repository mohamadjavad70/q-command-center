import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Typed helpers for existing tables ────────────────────────────────────────

export interface QmetaramRow {
  id: number
  created_at: string
}

export interface SamirRow {
  id: number
  samir: number[] | null  // float4 array — AI embeddings
  created_at: string
}

/** Read all rows from QMETARAM */
export async function fetchQmetaram() {
  const { data, error } = await supabase
    .from('QMETARAM')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as QmetaramRow[]
}

/** Read all rows from SAMIR (AI embeddings table) */
export async function fetchSamir() {
  const { data, error } = await supabase
    .from('SAMIR')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as SamirRow[]
}

/** Insert a new SAMIR embedding vector */
export async function insertSamirEmbedding(embedding: number[]) {
  const { data, error } = await supabase
    .from('SAMIR')
    .insert({ samir: embedding })
    .select()
    .single()
  if (error) throw error
  return data as SamirRow
}
