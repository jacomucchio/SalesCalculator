import { describe, expect, it } from 'vitest'
import { availableYears, computeSummary, daysBetween, itemProfit, monthlyProfit, staleItems } from './stats'
import type { Item } from './types'

let n = 0
const item = (over: Partial<Item>): Item => ({
  id: String(++n),
  name: 'x',
  purchasePrice: 0,
  purchaseDate: '2026-01-01',
  status: 'in_magazzino',
  listPrice: null,
  salePrice: null,
  saleDate: null,
  platform: null,
  ...over,
})
const sold = (buy: number, sell: number, buyDate: string | null, sellDate: string | null) =>
  item({ purchasePrice: buy, salePrice: sell, purchaseDate: buyDate, saleDate: sellDate, status: 'venduto', platform: 'Vinted' })

describe('itemProfit', () => {
  it('is sale minus purchase for sold items', () => {
    expect(itemProfit(sold(81.69, 276.25, null, null))).toBe(194.56)
  })
  it('is null for unsold items, unlike the old Excel which counted them as a loss', () => {
    expect(itemProfit(item({ purchasePrice: 319 }))).toBeNull()
  })
  it('allows a sale at zero', () => {
    expect(itemProfit(sold(10, 0, null, null))).toBe(-10)
  })
})

describe('computeSummary', () => {
  const items = [
    sold(100, 150, '2025-12-01', '2026-01-11'), // +50, 41 days
    sold(50, 40, '2026-02-01', '2026-02-11'), // -10, 10 days
    item({ purchasePrice: 30, status: 'in_magazzino', purchaseDate: '2026-03-01' }),
    item({ purchasePrice: 20, status: 'in_vendita', listPrice: 45, purchaseDate: '2026-03-01' }),
    item({ purchasePrice: 5, status: 'in_vendita', purchaseDate: '2026-03-01' }), // no list price
    item({ purchasePrice: 70, status: 'tenuto', purchaseDate: '2026-03-01' }),
  ]

  it('separates realized profit, cash balance and inventory', () => {
    const s = computeSummary(items)
    expect(s.realizedProfit).toBe(40)
    expect(s.totalPurchases).toBe(275)
    expect(s.totalSales).toBe(190)
    expect(s.cashBalance).toBe(-85)
    expect(s.inventoryValue).toBe(55)
    expect(s.potentialProfit).toBe(25)
    expect(s.soldCount).toBe(2)
    expect(s.stockCount).toBe(3)
  })

  it('computes weighted margin and average days to sell', () => {
    const s = computeSummary(items)
    expect(s.avgMarginPct).toBe(21.05) // 40 / 190
    expect(s.avgDaysToSell).toBe(26) // (41 + 10) / 2 rounded
  })

  it('filters purchases by purchase date and sales by sale date', () => {
    const s = computeSummary(items, 2025)
    expect(s.totalPurchases).toBe(100)
    expect(s.totalSales).toBe(0)
    expect(s.realizedProfit).toBe(0)
    expect(s.inventoryValue).toBe(55) // always current
    expect(computeSummary(items, 2026).realizedProfit).toBe(40)
  })

  it('excludes undated items from year filters but not from the all-time view', () => {
    const undated = [sold(10, 20, null, null)]
    expect(computeSummary(undated).realizedProfit).toBe(10)
    expect(computeSummary(undated, 2026).realizedProfit).toBe(0)
    expect(computeSummary(undated).avgDaysToSell).toBeNull()
  })

  it('returns null margin when nothing was sold', () => {
    expect(computeSummary([]).avgMarginPct).toBeNull()
  })
})

describe('monthlyProfit', () => {
  it('groups by sale month, fills gaps and accumulates', () => {
    const pts = monthlyProfit([
      sold(10, 30, null, '2025-11-05'),
      sold(10, 15, null, '2025-11-20'),
      sold(10, 5, null, '2026-01-02'),
      sold(10, 99, null, null),
    ])
    expect(pts).toEqual([
      { month: '2025-11', profit: 25, cumulative: 25 },
      { month: '2025-12', profit: 0, cumulative: 25 },
      { month: '2026-01', profit: -5, cumulative: 20 },
    ])
  })
  it('honours the year filter', () => {
    expect(monthlyProfit([sold(1, 2, null, '2025-11-05')], 2026)).toEqual([])
  })
})

describe('staleItems', () => {
  it('lists unsold items older than the threshold, oldest first', () => {
    const res = staleItems(
      [
        item({ name: 'a', purchaseDate: '2026-10-01' }),
        item({ name: 'b', purchaseDate: '2026-09-01', status: 'in_vendita' }),
        item({ name: 'c', purchaseDate: '2026-11-10' }),
        item({ name: 'd', purchaseDate: null }),
        sold(1, 2, '2026-01-01', '2026-02-01'),
      ],
      '2026-11-17',
    )
    expect(res.map((i) => [i.name, i.age])).toEqual([
      ['b', 77],
      ['a', 47],
    ])
  })
})

describe('helpers', () => {
  it('counts days across DST and years', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  })
  it('lists years from both dates, newest first', () => {
    expect(availableYears([sold(1, 2, '2025-12-01', '2026-01-01'), item({ purchaseDate: null })])).toEqual([2026, 2025])
  })
})
