/** Reads and writes register items in the Supabase `items` table (rows scoped to the signed-in user by RLS). */
import type { Item } from '@/domain/types'
import { ITEM_COLUMNS, fromRow, toRow, type ItemRow } from './itemRow'
import { supabase } from './supabase'

const fail = (error: { message: string } | null, what: string) => {
  if (error) throw new Error(`${what}: ${error.message}`)
}

export async function fetchItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select(ITEM_COLUMNS)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
  fail(error, 'Impossibile caricare gli articoli')
  return (data as ItemRow[]).map(fromRow)
}

export async function saveItem(item: Item): Promise<void> {
  const { error } = await supabase.from('items').upsert(toRow(item))
  fail(error, 'Salvataggio non riuscito')
}

export async function removeItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id)
  fail(error, 'Eliminazione non riuscita')
}

/** Inserts or overwrites many items at once (same id = same item). */
export async function importItems(items: Item[]): Promise<void> {
  if (items.length === 0) return
  const { error } = await supabase.from('items').upsert(items.map(toRow), { onConflict: 'id' })
  fail(error, 'Importazione non riuscita')
}
