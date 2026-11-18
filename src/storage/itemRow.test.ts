import { describe, expect, it } from 'vitest'
import type { Item } from '@/domain/types'
import { fromRow, toRow, type ItemRow } from './itemRow'

const sold: Item = {
  id: 'a1',
  name: 'Sony a6000',
  purchasePrice: 319,
  purchaseDate: '2026-11-01',
  status: 'venduto',
  listPrice: null,
  estimatedPrice: null,
  salePrice: 420.5,
  saleDate: '2026-11-10',
  platform: 'Vinted',
}

describe('itemRow', () => {
  it('round-trips an item', () => {
    expect(fromRow(toRow(sold))).toEqual(sold)
  })

  it('keeps the imported flag only when set', () => {
    expect(toRow(sold).imported).toBe(false)
    const imported = { ...sold, imported: true, purchaseDate: null, saleDate: null }
    expect(fromRow(toRow(imported))).toEqual(imported)
  })

  it('accepts numeric columns returned as strings', () => {
    const row = { ...toRow(sold), purchase_price: '319.00', sale_price: '420.50' } as unknown as ItemRow
    expect(fromRow(row)).toEqual(sold)
  })
})
