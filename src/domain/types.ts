export const STATUSES = ['in_magazzino', 'in_vendita', 'venduto', 'tenuto'] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<Status, string> = {
  in_magazzino: 'In magazzino',
  in_vendita: 'In vendita',
  venduto: 'Venduto',
  tenuto: 'Tenuto/Altro',
}

export const PLATFORMS = ['Vinted', 'Subito', 'eBay', 'Facebook Marketplace', 'Altro'] as const
export type Platform = (typeof PLATFORMS)[number]

/** ISO date string, YYYY-MM-DD */
export type IsoDate = string

export interface Item {
  id: string
  name: string
  /** Total paid, all-inclusive (buyer protection, shipping, ...) */
  purchasePrice: number
  purchaseDate: IsoDate | null
  status: Status
  /** Asking price, only meaningful while status is `in_vendita` */
  listPrice: number | null
  /** Amount actually received */
  salePrice: number | null
  saleDate: IsoDate | null
  platform: Platform | null
  /** Imported from the old Excel register: dates may be missing */
  imported?: boolean
}

export interface Registry {
  version: 1
  items: Item[]
}

export const UNSOLD_STATUSES: readonly Status[] = ['in_magazzino', 'in_vendita']
