import { UNSOLD_STATUSES, type IsoDate, type Item } from './types'

const round2 = (n: number) => Math.round(n * 100) / 100
const sum = (ns: number[]) => round2(ns.reduce((a, b) => a + b, 0))

const yearOf = (d: IsoDate | null) => (d ? Number(d.slice(0, 4)) : null)

export function daysBetween(from: IsoDate, to: IsoDate): number {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

/** Profit of a sold item; null for anything not sold. */
export function itemProfit(item: Item): number | null {
  if (item.status !== 'venduto' || item.salePrice === null) return null
  return round2(item.salePrice - item.purchasePrice)
}

export function isUnsold(item: Item): boolean {
  return UNSOLD_STATUSES.includes(item.status)
}

/**
 * What an unsold item is expected to fetch: the estimated value if set, otherwise the asking
 * price of an item on sale. Null for sold/kept items or when neither is known.
 */
export function expectedSalePrice(item: Item): number | null {
  if (!isUnsold(item)) return null
  return item.estimatedPrice ?? (item.status === 'in_vendita' ? item.listPrice : null)
}

export interface Summary {
  /** Sum of (sale − purchase) over sold items */
  realizedProfit: number
  totalPurchases: number
  totalSales: number
  /** totalSales − totalPurchases (all items, including kept and unsold) */
  cashBalance: number
  /** Purchase cost of unsold items (always current, never filtered by year) */
  inventoryValue: number
  /** Sum of expected sale prices over unsold items that have one */
  expectedValue: number
  /** Sum of (expected − purchase) over unsold items with an expected sale price */
  potentialProfit: number
  /** Unsold items with neither an estimated value nor a list price */
  unvaluedCount: number
  soldCount: number
  stockCount: number
  /** realizedProfit / sales of sold items, in %; null when nothing sold */
  avgMarginPct: number | null
  /** Average days from purchase to sale, over sold items with both dates */
  avgDaysToSell: number | null
}

/**
 * When `year` is given, purchases are counted by purchase date and sales/profit by sale date;
 * items lacking the relevant date are excluded. Inventory figures are always current.
 */
export function computeSummary(items: Item[], year?: number): Summary {
  const inYear = (d: IsoDate | null) => year === undefined || yearOf(d) === year
  const sold = items.filter((i) => i.status === 'venduto' && inYear(i.saleDate))
  const bought = items.filter((i) => inYear(i.purchaseDate))
  const unsold = items.filter(isUnsold)
  const valued = unsold.filter((i) => expectedSalePrice(i) !== null)

  const realizedProfit = sum(sold.map((i) => itemProfit(i) ?? 0))
  const soldSales = sum(sold.map((i) => i.salePrice ?? 0))
  const totalPurchases = sum(bought.map((i) => i.purchasePrice))
  const timed = sold.filter((i) => i.purchaseDate && i.saleDate)

  return {
    realizedProfit,
    totalPurchases,
    totalSales: soldSales,
    cashBalance: round2(soldSales - totalPurchases),
    inventoryValue: sum(unsold.map((i) => i.purchasePrice)),
    expectedValue: sum(valued.map((i) => expectedSalePrice(i)!)),
    potentialProfit: sum(valued.map((i) => expectedSalePrice(i)! - i.purchasePrice)),
    unvaluedCount: unsold.length - valued.length,
    soldCount: sold.length,
    stockCount: unsold.length,
    avgMarginPct: soldSales > 0 ? round2((realizedProfit / soldSales) * 100) : null,
    avgDaysToSell: timed.length
      ? Math.round(timed.reduce((a, i) => a + daysBetween(i.purchaseDate!, i.saleDate!), 0) / timed.length)
      : null,
  }
}

export interface MonthPoint {
  /** YYYY-MM */
  month: string
  profit: number
  cumulative: number
}

/** Realized profit per month (by sale date), with every month in the span filled in. */
export function monthlyProfit(items: Item[], year?: number): MonthPoint[] {
  const byMonth = new Map<string, number>()
  for (const i of items) {
    const p = itemProfit(i)
    if (p === null || !i.saleDate) continue
    if (year !== undefined && yearOf(i.saleDate) !== year) continue
    const m = i.saleDate.slice(0, 7)
    byMonth.set(m, (byMonth.get(m) ?? 0) + p)
  }
  if (byMonth.size === 0) return []

  const keys = [...byMonth.keys()].sort()
  const months: string[] = []
  let [y, m] = keys[0].split('-').map(Number)
  const last = keys[keys.length - 1]
  for (;;) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    months.push(key)
    if (key === last) break
    if (m === 12) {
      m = 1
      y++
    } else {
      m++
    }
  }

  let cumulative = 0
  return months.map((month) => {
    const profit = round2(byMonth.get(month) ?? 0)
    cumulative = round2(cumulative + profit)
    return { month, profit, cumulative }
  })
}

/** Unsold items bought more than `days` days before `today`, oldest first. */
export function staleItems(items: Item[], today: IsoDate, days = 30): (Item & { age: number })[] {
  return items
    .filter((i) => isUnsold(i) && i.purchaseDate)
    .map((i) => ({ ...i, age: daysBetween(i.purchaseDate!, today) }))
    .filter((i) => i.age > days)
    .sort((a, b) => b.age - a.age)
}

/** Years present in the data (purchase or sale), newest first. */
export function availableYears(items: Item[]): number[] {
  const ys = new Set<number>()
  for (const i of items) {
    const a = yearOf(i.purchaseDate)
    const b = yearOf(i.saleDate)
    if (a) ys.add(a)
    if (b) ys.add(b)
  }
  return [...ys].sort((a, b) => b - a)
}
