import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Choice } from '@/components/Choice'
import { availableYears, computeSummary, monthlyProfit, staleItems, type MonthPoint } from '@/domain/stats'
import { STATUS_LABELS, type Item } from '@/domain/types'
import { eur, eurSigned, monthIt, pct, profitClass, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'

// Diverging pair from the reference palette: blue = gain, red = loss.
const GAIN = '#2a78d6'
const LOSS = '#e34948'
const AXIS = { fontSize: 12, fill: '#52514e' }

export function Dashboard({ items, onOpen }: { items: Item[]; onOpen: (item: Item) => void }) {
  const [yearSel, setYearSel] = useState('all')
  const year = yearSel === 'all' ? undefined : Number(yearSel)

  const years = useMemo(() => availableYears(items), [items])
  const s = useMemo(() => computeSummary(items, year), [items, year])
  const months = useMemo(() => monthlyProfit(items, year), [items, year])
  const stale = useMemo(() => staleItems(items, todayIso()), [items])
  const undatedSold = items.filter((i) => i.status === 'venduto' && !i.saleDate).length

  const yearOptions = [{ value: 'all', label: 'Tutti gli anni' }, ...years.map((y) => ({ value: String(y), label: String(y) }))]

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {year ? `Acquisti e vendite del ${year}. Inventario sempre aggiornato a oggi.` : 'Dall’inizio dell’attività.'}
        </p>
        <Choice value={yearSel} options={yearOptions} onChange={setYearSel} className="w-40" aria-label="Filtra per anno" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-2 lg:col-span-1 lg:row-span-2">
          <CardHeader>
            <CardDescription>Profitto realizzato</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className={cn('text-4xl font-semibold tabular-nums', profitClass(s.realizedProfit))}>{eurSigned(s.realizedProfit)}</p>
            <p className="text-sm text-muted-foreground">
              su {s.soldCount} articoli venduti · margine {pct(s.avgMarginPct)}
            </p>
          </CardContent>
        </Card>
        <Stat label="Saldo di cassa" value={eurSigned(s.cashBalance)} valueClass={profitClass(s.cashBalance)} hint={`Vendite ${eur(s.totalSales)} − acquisti ${eur(s.totalPurchases)}`} />
        <Stat label="Valore inventario" value={eur(s.inventoryValue)} hint={`Costo di ${s.stockCount} articoli · stimato ${eur(s.expectedValue)}`} />
        <Stat
          label="Profitto potenziale"
          value={eurSigned(s.potentialProfit)}
          valueClass={profitClass(s.potentialProfit)}
          hint={`Valore stimato − acquisto${s.unvaluedCount ? ` · ${s.unvaluedCount} articoli senza stima` : ''}`}
        />
        <Stat label="Totale vendite" value={eur(s.totalSales)} hint={`${s.soldCount} articoli`} />
        <Stat label="Totale acquisti" value={eur(s.totalPurchases)} hint="Tutti gli stati" />
        <Stat label="Giorni medi per vendere" value={s.avgDaysToSell === null ? '—' : String(s.avgDaysToSell)} hint="Dall’acquisto alla vendita" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Profitto per mese" empty={months.length === 0} undated={undatedSold}>
          <BarChart data={months} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="#e7e6e2" />
            <XAxis dataKey="month" tickFormatter={monthIt} tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={axisEur} tick={AXIS} tickLine={false} axisLine={false} width={56} />
            <ReferenceLine y={0} stroke="#a3a29c" />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={<MonthTip field="profit" label="Profitto" />} />
            <Bar dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {months.map((m) => (
                <Cell key={m.month} fill={m.profit >= 0 ? GAIN : LOSS} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Profitto cumulato" empty={months.length === 0} undated={undatedSold}>
          <LineChart data={months} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e7e6e2" />
            <XAxis dataKey="month" tickFormatter={monthIt} tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={axisEur} tick={AXIS} tickLine={false} axisLine={false} width={56} />
            <ReferenceLine y={0} stroke="#a3a29c" />
            <Tooltip cursor={{ stroke: '#a3a29c', strokeDasharray: '3 3' }} content={<MonthTip field="cumulative" label="Cumulato" />} />
            <Line type="monotone" dataKey="cumulative" stroke={GAIN} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fermi da più di 30 giorni</CardTitle>
          <CardDescription>Articoli non venduti, dal più vecchio. Quelli senza data di acquisto non compaiono.</CardDescription>
        </CardHeader>
        <CardContent>
          {stale.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun articolo fermo. Ottimo!</p>
          ) : (
            <ul className="divide-y">
              {stale.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => onOpen(i)} className="flex w-full items-center gap-3 py-2 text-left text-sm hover:bg-muted/50">
                    <span className="flex-1 truncate font-medium">{i.name}</span>
                    <span className="text-muted-foreground">{STATUS_LABELS[i.status]}</span>
                    <span className="w-24 text-right tabular-nums">{eur(i.purchasePrice)}</span>
                    <span className="w-20 text-right font-medium tabular-nums">{i.age} gg</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const axisEur = (n: number) => `${n.toLocaleString('it-IT', { maximumFractionDigits: 0 })} €`

function Stat({ label, value, hint, valueClass }: { label: string; value: string; hint: string; valueClass?: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-1">
        <p className={cn('text-2xl font-semibold tabular-nums', valueClass)}>{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, empty, undated, children }: { title: string; empty: boolean; undated: number; children: React.ReactElement }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {undated > 0 && <CardDescription>{undated} vendite senza data non sono incluse nel grafico.</CardDescription>}
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Nessuna vendita con data nel periodo.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TipProps {
  field: 'profit' | 'cumulative'
  label: string
  active?: boolean
  payload?: { payload: MonthPoint }[]
}

function MonthTip({ field, label, active, payload }: TipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground">{monthIt(p.month)}</p>
      <p className="font-semibold tabular-nums">
        {label}: {eurSigned(p[field])}
      </p>
    </div>
  )
}
