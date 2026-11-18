import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Set when the app was built without the Supabase settings (see `.env.example`). */
export const configError =
  url && key ? null : 'Configurazione mancante: imposta VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY in .env.local'

export const supabase = createClient(url || 'http://localhost', key || 'missing')
