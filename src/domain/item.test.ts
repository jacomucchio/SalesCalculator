import { describe, expect, it } from 'vitest'
import { itemsToCsv } from './csv'
import { normalizeItem, parseEuro, parseRegistry, validateItem } from './item'
import type { Item } from './types'

const base: Item = {
  id: '1',
  name: 'Sony a6000',
  purchasePrice: 319,
  purchaseDate: '2026-11-01',
  status: 'in_magazzino',
  listPrice: null,
  salePrice: null,
  saleDate: null,
  platform: null,
}

describe('parseEuro', () => {
  it.each([
    ['81,69', 81.69],
    ['81.69', 81.69],
    ['1.234,5', 1234.5],
    [' 12 € ', 12],
    ['0', 0],
  ])('parses %s', (s, n) => expect(parseEuro(s)).toBe(n))
  it.each(['', 'abc', '1,2,3'])('rejects %s', (s) => expect(parseEuro(s)).toBeNull())
})

describe('validateItem', () => {
  it('accepts a complete unsold item', () => {
    expect(validateItem(base)).toEqual({})
  })
  it('requires name and purchase date', () => {
    const e = validateItem({ ...base, name: '  ', purchaseDate: null })
    expect(Object.keys(e).sort()).toEqual(['name', 'purchaseDate'])
  })
  it('requires price, date and platform when sold', () => {
    const e = validateItem({ ...base, status: 'venduto' })
    expect(Object.keys(e).sort()).toEqual(['platform', 'saleDate', 'salePrice'])
  })
  it('accepts a sale at zero', () => {
    expect(validateItem({ ...base, status: 'venduto', salePrice: 0, saleDate: '2026-11-02', platform: 'Vinted' })).toEqual({})
  })
  it('rejects a sale before the purchase', () => {
    const e = validateItem({ ...base, status: 'venduto', salePrice: 5, saleDate: '2026-10-01', platform: 'Vinted' })
    expect(e.saleDate).toBeDefined()
  })
  it('does not require dates on imported items', () => {
    expect(
      validateItem({ ...base, imported: true, purchaseDate: null, status: 'venduto', salePrice: 5, platform: 'Vinted' }),
    ).toEqual({})
  })
})

describe('normalizeItem', () => {
  it('clears sale fields when moving back from sold', () => {
    const n = normalizeItem({ ...base, status: 'in_vendita', listPrice: 400, salePrice: 1, saleDate: '2026-11-02', platform: 'Vinted' })
    expect(n).toMatchObject({ listPrice: 400, salePrice: null, saleDate: null, platform: null })
  })
  it('clears the list price once sold', () => {
    expect(normalizeItem({ ...base, status: 'venduto', listPrice: 400 }).listPrice).toBeNull()
  })
})

describe('parseRegistry', () => {
  it('treats an empty file as an empty register', () => {
    expect(parseRegistry('')).toEqual({ version: 1, items: [] })
  })
  it('round-trips a valid register', () => {
    const reg = { version: 1, items: [base] }
    expect(parseRegistry(JSON.stringify(reg))).toEqual(reg)
  })
  it('rejects malformed content', () => {
    expect(() => parseRegistry('{')).toThrow('JSON')
    expect(() => parseRegistry('{"items":[]}')).toThrow('Formato')
    expect(() => parseRegistry(JSON.stringify({ version: 1, items: [{ ...base, status: 'boh' }] }))).toThrow('Articolo 1')
  })
})

describe('itemsToCsv', () => {
  it('writes Italian-Excel friendly CSV', () => {
    const csv = itemsToCsv([{ ...base, name: 'Lumix; "gh5"', status: 'venduto', salePrice: 400.5, saleDate: '2026-11-05', platform: 'Vinted' }])
    const [header, row] = csv.slice(1).split('\r\n')
    expect(csv.startsWith('﻿')).toBe(true)
    expect(header.split(';')).toHaveLength(9)
    expect(row).toBe('"Lumix; ""gh5""";Venduto;319,00;2026-11-01;;400,50;2026-11-05;Vinted;81,50')
  })
})
