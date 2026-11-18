import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Choice } from '@/components/Choice'
import { isValid, normalizeItem, parseEuro, validateItem, type ItemErrors } from '@/domain/item'
import { itemProfit } from '@/domain/stats'
import { PLATFORMS, STATUSES, STATUS_LABELS, UNSOLD_STATUSES, type Item, type Platform, type Status } from '@/domain/types'
import { amountText, eurSigned, profitClass, todayIso } from '@/lib/format'

const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))
const PLATFORM_OPTIONS = PLATFORMS.map((p) => ({ value: p, label: p }))

interface Draft {
  name: string
  purchasePrice: string
  purchaseDate: string
  status: Status
  listPrice: string
  estimatedPrice: string
  salePrice: string
  saleDate: string
  platform: Platform
}

const toDraft = (i: Item): Draft => ({
  name: i.name,
  purchasePrice: i.name === '' && i.purchasePrice === 0 ? '' : amountText(i.purchasePrice),
  purchaseDate: i.purchaseDate ?? '',
  status: i.status,
  listPrice: amountText(i.listPrice),
  estimatedPrice: amountText(i.estimatedPrice),
  salePrice: amountText(i.salePrice),
  saleDate: i.saleDate ?? '',
  platform: i.platform ?? 'Vinted',
})

/** Builds the item; unparseable amounts become NaN so validation flags them. */
function fromDraft(base: Item, d: Draft): Item {
  const amount = (s: string) => (s.trim() === '' ? null : (parseEuro(s) ?? NaN))
  const saleDate = d.saleDate || (d.status === 'venduto' && !base.imported ? todayIso() : '')
  return normalizeItem({
    ...base,
    name: d.name,
    purchasePrice: amount(d.purchasePrice) ?? NaN,
    purchaseDate: d.purchaseDate || null,
    status: d.status,
    listPrice: amount(d.listPrice),
    estimatedPrice: amount(d.estimatedPrice),
    salePrice: amount(d.salePrice),
    saleDate: saleDate || null,
    platform: d.platform,
  })
}

interface Props {
  item: Item | null
  isNew: boolean
  onClose: () => void
  onSave: (item: Item) => void
}

export function ItemSheet({ item, isNew, onClose, onSave }: Props) {
  return (
    <Sheet open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {item && <ItemForm key={item.id} item={item} isNew={isNew} onSave={onSave} />}
      </SheetContent>
    </Sheet>
  )
}

function ItemForm({ item, isNew, onSave }: { item: Item; isNew: boolean; onSave: (item: Item) => void }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(item))
  const [errors, setErrors] = useState<ItemErrors>({})
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const preview = fromDraft(item, draft)
  const profit = Number.isFinite(preview.purchasePrice) ? itemProfit(preview) : null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateItem(preview)
    setErrors(errs)
    if (isValid(errs)) onSave(preview)
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>{isNew ? 'Nuovo articolo' : 'Modifica articolo'}</SheetTitle>
        <SheetDescription>
          {item.imported ? 'Importato dal vecchio Excel: le date sono facoltative.' : 'Il salvataggio sul file è automatico.'}
        </SheetDescription>
      </SheetHeader>

      <div className="grid gap-4 px-4">
        <Field id="name" label="Articolo" error={errors.name}>
          <Input id="name" autoFocus value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="es. Epson EH-TW5300" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="purchasePrice" label="Prezzo acquisto (€)" error={errors.purchasePrice} hint="Totale pagato, tutto compreso">
            <Input id="purchasePrice" inputMode="decimal" value={draft.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} placeholder="0,00" />
          </Field>
          <Field id="purchaseDate" label="Data acquisto" error={errors.purchaseDate}>
            <Input id="purchaseDate" type="date" value={draft.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />
          </Field>
        </div>

        <Field id="status" label="Stato">
          <Choice id="status" value={draft.status} options={STATUS_OPTIONS} onChange={(v) => set('status', v)} />
        </Field>

        {UNSOLD_STATUSES.includes(draft.status) && (
          <div className="grid grid-cols-2 gap-3">
            <Field id="estimatedPrice" label="Valore stimato (€)" error={errors.estimatedPrice} hint="Quanto pensi di incassare">
              <Input id="estimatedPrice" inputMode="decimal" value={draft.estimatedPrice} onChange={(e) => set('estimatedPrice', e.target.value)} placeholder="0,00" />
            </Field>
            {draft.status === 'in_vendita' && (
              <Field id="listPrice" label="Prezzo annuncio (€)" error={errors.listPrice} hint="Facoltativo">
                <Input id="listPrice" inputMode="decimal" value={draft.listPrice} onChange={(e) => set('listPrice', e.target.value)} placeholder="0,00" />
              </Field>
            )}
          </div>
        )}

        {draft.status === 'venduto' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field id="salePrice" label="Prezzo vendita (€)" error={errors.salePrice} hint="Quanto hai incassato">
                <Input id="salePrice" inputMode="decimal" value={draft.salePrice} onChange={(e) => set('salePrice', e.target.value)} placeholder="0,00" />
              </Field>
              <Field id="saleDate" label="Data vendita" error={errors.saleDate}>
                <Input id="saleDate" type="date" value={draft.saleDate || (item.imported ? '' : todayIso())} onChange={(e) => set('saleDate', e.target.value)} />
              </Field>
            </div>
            <Field id="platform" label="Piattaforma" error={errors.platform}>
              <Choice id="platform" value={draft.platform} options={PLATFORM_OPTIONS} onChange={(v) => set('platform', v)} />
            </Field>
            <p className="text-sm">
              Profitto: <span className={`font-semibold tabular-nums ${profitClass(profit)}`}>{eurSigned(profit)}</span>
            </p>
          </>
        )}
      </div>

      <SheetFooter>
        <Button type="submit">{isNew ? 'Aggiungi' : 'Salva modifiche'}</Button>
      </SheetFooter>
    </form>
  )
}

export function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
