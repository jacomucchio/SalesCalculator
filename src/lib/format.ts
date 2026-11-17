const eurFmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

export const eur = (n: number | null | undefined) => (n === null || n === undefined ? '—' : eurFmt.format(n))

/** Signed amount, e.g. "+12,50 €" */
export const eurSigned = (n: number | null) => (n === null ? '—' : (n > 0 ? '+' : '') + eurFmt.format(n))

export const pct = (n: number | null) => (n === null ? '—' : `${n.toLocaleString('it-IT', { maximumFractionDigits: 1 })}%`)

/** "2026-11-17" -> "17/11/2026" */
export const dateIt = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—')

const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
/** "2026-03" -> "mar 26" */
export const monthIt = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Number -> text for an amount input, Italian style ("81,69"). */
export const amountText = (n: number | null) => (n === null ? '' : String(n).replace('.', ','))

export const profitClass = (n: number | null) =>
  n === null ? 'text-muted-foreground' : n > 0 ? 'text-emerald-600' : n < 0 ? 'text-red-600' : ''
