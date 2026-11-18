import { itemProfit } from './stats'
import { STATUS_LABELS, type Item } from './types'

const num = (n: number | null) => (n === null ? '' : n.toFixed(2).replace('.', ','))
const text = (s: string) => (/[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

/** CSV for Italian-locale Excel: `;` separator, comma decimals, UTF-8 BOM. */
export function itemsToCsv(items: Item[]): string {
  const header = [
    'Articolo',
    'Stato',
    'Prezzo acquisto',
    'Data acquisto',
    'Prezzo annuncio',
    'Valore stimato',
    'Prezzo vendita',
    'Data vendita',
    'Piattaforma',
    'Profitto',
  ]
  const rows = items.map((i) =>
    [
      text(i.name),
      STATUS_LABELS[i.status],
      num(i.purchasePrice),
      i.purchaseDate ?? '',
      num(i.listPrice),
      num(i.estimatedPrice),
      num(i.salePrice),
      i.saleDate ?? '',
      i.platform ?? '',
      num(itemProfit(i)),
    ].join(';'),
  )
  return '﻿' + [header.join(';'), ...rows].join('\r\n')
}
