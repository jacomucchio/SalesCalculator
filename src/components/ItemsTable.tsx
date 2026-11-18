import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CircleCheck, Pencil, Search, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Choice } from '@/components/Choice'
import { isUnsold, itemProfit } from '@/domain/stats'
import { PLATFORMS, STATUSES, STATUS_LABELS, type Item, type Status } from '@/domain/types'
import { dateIt, eur, eurSigned, profitClass } from '@/lib/format'
import { cn } from '@/lib/utils'

type SortKey = 'name' | 'status' | 'purchasePrice' | 'purchaseDate' | 'salePrice' | 'saleDate' | 'platform' | 'profit'

const STATUS_FILTER = [{ value: 'all', label: 'Tutti gli stati' }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]
const PLATFORM_FILTER = [{ value: 'all', label: 'Tutte le piattaforme' }, ...PLATFORMS.map((p) => ({ value: p, label: p }))]

const STATUS_STYLE: Record<Status, string> = {
  in_magazzino: 'bg-amber-100 text-amber-800',
  in_vendita: 'bg-sky-100 text-sky-800',
  venduto: 'bg-emerald-100 text-emerald-800',
  tenuto: 'bg-zinc-100 text-zinc-700',
}

const sortValue = (i: Item, k: SortKey): string | number | null =>
  k === 'profit' ? itemProfit(i) : k === 'status' ? STATUSES.indexOf(i.status) : i[k]

interface Props {
  items: Item[]
  onEdit: (item: Item) => void
  onSell: (item: Item) => void
  onDelete: (id: string) => void
}

export function ItemsTable({ items, onEdit, onSell, onDelete }: Props) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [platform, setPlatform] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'purchaseDate', dir: -1 })
  const [toDelete, setToDelete] = useState<Item | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = items.filter(
      (i) =>
        (!q || i.name.toLowerCase().includes(q)) &&
        (status === 'all' || i.status === status) &&
        (platform === 'all' || i.platform === platform),
    )
    return filtered.sort((a, b) => {
      const va = sortValue(a, sort.key)
      const vb = sortValue(b, sort.key)
      if (va === vb) return 0
      if (va === null) return 1 // empty values always last
      if (vb === null) return -1
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string, 'it') : va - (vb as number)
      return cmp * sort.dir
    })
  }, [items, query, status, platform, sort])

  const totals = useMemo(
    () => ({
      purchase: rows.reduce((a, i) => a + i.purchasePrice, 0),
      sale: rows.reduce((a, i) => a + (i.salePrice ?? 0), 0),
      profit: rows.reduce((a, i) => a + (itemProfit(i) ?? 0), 0),
    }),
    [rows],
  )

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'name' || key === 'platform' ? 1 : -1 }))

  const th = (k: SortKey, children: string, right?: boolean) => (
    <TableHead key={k} className={cn(right && 'text-right')}>
      <button type="button" onClick={() => toggleSort(k)} className={cn('inline-flex items-center gap-1 hover:text-foreground', right && 'flex-row-reverse')}>
        {children}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </TableHead>
  )

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca articolo…" className="pl-8" aria-label="Cerca articolo" />
        </div>
        <Choice value={status} options={STATUS_FILTER} onChange={setStatus} className="w-44" aria-label="Filtra per stato" />
        <Choice value={platform} options={PLATFORM_FILTER} onChange={setPlatform} className="w-52" aria-label="Filtra per piattaforma" />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {th('name', 'Articolo')}
              {th('status', 'Stato')}
              {th('purchaseDate', 'Acquisto')}
              {th('purchasePrice', 'Pagato', true)}
              {th('saleDate', 'Vendita')}
              {th('salePrice', 'Incassato', true)}
              {th('platform', 'Piattaforma')}
              {th('profit', 'Profitto', true)}
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  {items.length === 0 ? 'Nessun articolo. Aggiungi il primo acquisto!' : 'Nessun articolo corrisponde ai filtri.'}
                </TableCell>
              </TableRow>
            )}
            {rows.map((i) => {
              const p = itemProfit(i)
              return (
                <TableRow key={i.id} className="cursor-pointer" onClick={() => onEdit(i)}>
                  <TableCell className="max-w-64 truncate font-medium" title={i.name}>
                    {i.name}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLE[i.status]}>{STATUS_LABELS[i.status]}</Badge>
                    {i.status === 'in_vendita' && i.listPrice !== null && (
                      <span className="ml-2 text-xs text-muted-foreground tabular-nums" title="Prezzo annuncio">{eur(i.listPrice)}</span>
                    )}
                    {i.estimatedPrice !== null && (
                      <span className="ml-2 text-xs text-muted-foreground tabular-nums" title="Valore stimato">≈ {eur(i.estimatedPrice)}</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{dateIt(i.purchaseDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{eur(i.purchasePrice)}</TableCell>
                  <TableCell className="tabular-nums">{i.status === 'venduto' ? dateIt(i.saleDate) : ''}</TableCell>
                  <TableCell className="text-right tabular-nums">{i.salePrice === null ? '' : eur(i.salePrice)}</TableCell>
                  <TableCell>{i.platform ?? ''}</TableCell>
                  <TableCell className={cn('text-right font-medium tabular-nums', profitClass(p))}>{p === null ? '' : eurSigned(p)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-0.5">
                      {isUnsold(i) && (
                        <Button variant="ghost" size="icon-sm" title="Segna come venduto" onClick={() => onSell(i)}>
                          <CircleCheck className="text-emerald-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" title="Modifica" onClick={() => onEdit(i)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" title="Elimina" onClick={() => setToDelete(i)}>
                        <Trash2 className="text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>{rows.length} articoli</TableCell>
                <TableCell className="text-right tabular-nums">{eur(totals.purchase)}</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">{eur(totals.sale)}</TableCell>
                <TableCell />
                <TableCell className={cn('text-right tabular-nums', profitClass(totals.profit))}>{eurSigned(Math.round(totals.profit * 100) / 100)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l’articolo?</AlertDialogTitle>
            <AlertDialogDescription>
              «{toDelete?.name}» verrà rimosso dal registro. L’operazione non si può annullare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (toDelete) onDelete(toDelete.id)
                setToDelete(null)
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
