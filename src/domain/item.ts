import { PLATFORMS, STATUSES, UNSOLD_STATUSES, type Item, type Platform, type Registry } from './types'

export type ItemErrors = Partial<Record<keyof Item, string>>

/** Parses a user-typed amount, accepting both "81,69" and "81.69". */
export function parseEuro(input: string): number | null {
  const s = input.trim().replace(/\s|€/g, '')
  if (s === '') return null
  // "1.234,56" -> "1234.56"; "81,69" -> "81.69"
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  return Math.round(Number(normalized) * 100) / 100
}

/** Drops fields that do not apply to the item's status. */
export function normalizeItem(item: Item): Item {
  const out: Item = { ...item, name: item.name.trim() }
  if (out.status !== 'in_vendita') out.listPrice = null
  if (!UNSOLD_STATUSES.includes(out.status)) out.estimatedPrice = null
  if (out.status !== 'venduto') {
    out.salePrice = null
    out.saleDate = null
    out.platform = null
  }
  return out
}

export function validateItem(item: Item): ItemErrors {
  const errors: ItemErrors = {}
  const datesRequired = !item.imported

  if (!item.name.trim()) errors.name = 'Inserisci il nome'
  if (!Number.isFinite(item.purchasePrice) || item.purchasePrice < 0)
    errors.purchasePrice = 'Prezzo non valido'
  if (datesRequired && !item.purchaseDate) errors.purchaseDate = 'Inserisci la data di acquisto'

  if (item.status === 'in_vendita' && item.listPrice !== null && item.listPrice < 0)
    errors.listPrice = 'Prezzo non valido'
  if (item.estimatedPrice !== null && !(item.estimatedPrice >= 0)) errors.estimatedPrice = 'Valore non valido'

  if (item.status === 'venduto') {
    if (item.salePrice === null || !Number.isFinite(item.salePrice) || item.salePrice < 0)
      errors.salePrice = 'Inserisci il prezzo di vendita'
    if (datesRequired && !item.saleDate) errors.saleDate = 'Inserisci la data di vendita'
    if (item.purchaseDate && item.saleDate && item.saleDate < item.purchaseDate)
      errors.saleDate = 'La vendita non può precedere l’acquisto'
    if (!item.platform) errors.platform = 'Scegli la piattaforma'
  }
  return errors
}

export function isValid(errors: ItemErrors): boolean {
  return Object.keys(errors).length === 0
}

const isDate = (v: unknown) => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))
const isNum = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v))

/** Parses and checks the JSON file content. Throws with an Italian message on bad data. */
export function parseRegistry(text: string): Registry {
  if (text.trim() === '') return { version: 1, items: [] }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Il file non è un JSON valido')
  }
  const reg = data as Partial<Registry>
  if (reg?.version !== 1 || !Array.isArray(reg.items)) throw new Error('Formato del file non riconosciuto')
  reg.items.forEach((it, i) => {
    // Files written before the estimated value existed lack the field.
    if (it && it.estimatedPrice === undefined) it.estimatedPrice = null
    const ok =
      typeof it?.id === 'string' &&
      typeof it.name === 'string' &&
      typeof it.purchasePrice === 'number' &&
      STATUSES.includes(it.status) &&
      isNum(it.listPrice) &&
      isNum(it.estimatedPrice) &&
      isNum(it.salePrice) &&
      isDate(it.purchaseDate) &&
      isDate(it.saleDate) &&
      (it.platform === null || PLATFORMS.includes(it.platform as Platform))
    if (!ok) throw new Error(`Articolo ${i + 1} non valido nel file`)
  })
  return reg as Registry
}

export function newItem(today: string): Item {
  return {
    id: crypto.randomUUID(),
    name: '',
    purchasePrice: 0,
    purchaseDate: today,
    status: 'in_magazzino',
    listPrice: null,
    estimatedPrice: null,
    salePrice: null,
    saleDate: null,
    platform: null,
  }
}
