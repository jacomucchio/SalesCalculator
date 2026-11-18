/** Maps register items to rows of the `public.items` table and back. */
import type { Item, Platform, Status } from '@/domain/types'

export interface ItemRow {
  id: string
  name: string
  purchase_price: number
  purchase_date: string | null
  status: Status
  list_price: number | null
  estimated_price: number | null
  sale_price: number | null
  sale_date: string | null
  platform: Platform | null
  imported: boolean
}

export const ITEM_COLUMNS =
  'id,name,purchase_price,purchase_date,status,list_price,estimated_price,sale_price,sale_date,platform,imported'

export function toRow(item: Item): ItemRow {
  return {
    id: item.id,
    name: item.name,
    purchase_price: item.purchasePrice,
    purchase_date: item.purchaseDate,
    status: item.status,
    list_price: item.listPrice,
    estimated_price: item.estimatedPrice,
    sale_price: item.salePrice,
    sale_date: item.saleDate,
    platform: item.platform,
    imported: item.imported ?? false,
  }
}

/** Postgres `numeric` may come back as a string; normalise to number. */
const num = (v: number | string | null) => (v === null ? null : Number(v))

export function fromRow(row: ItemRow): Item {
  const item: Item = {
    id: row.id,
    name: row.name,
    purchasePrice: Number(row.purchase_price),
    purchaseDate: row.purchase_date,
    status: row.status,
    listPrice: num(row.list_price),
    estimatedPrice: num(row.estimated_price),
    salePrice: num(row.sale_price),
    saleDate: row.sale_date,
    platform: row.platform,
  }
  if (row.imported) item.imported = true
  return item
}
