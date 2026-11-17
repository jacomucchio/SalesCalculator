import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Choice } from '@/components/Choice'
import { Field } from '@/components/ItemSheet'
import { isValid, normalizeItem, parseEuro, validateItem, type ItemErrors } from '@/domain/item'
import { itemProfit } from '@/domain/stats'
import { PLATFORMS, type Item, type Platform } from '@/domain/types'
import { amountText, eurSigned, profitClass, todayIso } from '@/lib/format'

const PLATFORM_OPTIONS = PLATFORMS.map((p) => ({ value: p, label: p }))

interface Props {
  item: Item | null
  onClose: () => void
  onSave: (item: Item) => void
}

/** Quick action: mark an item as sold asking only price, date and platform. */
export function SellDialog({ item, onClose, onSave }: Props) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">{item && <SellForm key={item.id} item={item} onSave={onSave} />}</DialogContent>
    </Dialog>
  )
}

function SellForm({ item, onSave }: { item: Item; onSave: (item: Item) => void }) {
  const [price, setPrice] = useState(amountText(item.listPrice))
  const [date, setDate] = useState(todayIso())
  const [platform, setPlatform] = useState<Platform>('Vinted')
  const [errors, setErrors] = useState<ItemErrors>({})

  const sold = normalizeItem({
    ...item,
    status: 'venduto',
    salePrice: price.trim() === '' ? null : (parseEuro(price) ?? NaN),
    saleDate: date || null,
    platform,
  })
  const profit = Number.isFinite(sold.salePrice) ? itemProfit(sold) : null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateItem(sold)
    if (!date) errs.saleDate = 'Inserisci la data di vendita'
    setErrors(errs)
    if (isValid(errs)) onSave(sold)
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Segna come venduto</DialogTitle>
        <DialogDescription className="truncate">{item.name}</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <Field id="sell-price" label="Incassato (€)" error={errors.salePrice}>
          <Input id="sell-price" autoFocus inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
        </Field>
        <Field id="sell-date" label="Data vendita" error={errors.saleDate}>
          <Input id="sell-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field id="sell-platform" label="Piattaforma">
        <Choice id="sell-platform" value={platform} options={PLATFORM_OPTIONS} onChange={setPlatform} />
      </Field>
      <p className="text-sm">
        Profitto: <span className={`font-semibold tabular-nums ${profitClass(profit)}`}>{eurSigned(profit)}</span>
      </p>
      <DialogFooter>
        <Button type="submit">Conferma vendita</Button>
      </DialogFooter>
    </form>
  )
}
