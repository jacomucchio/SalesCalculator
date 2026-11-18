import { useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileDown, Loader2, LogIn, LogOut, Plus, Upload, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dashboard } from '@/components/Dashboard'
import { ItemSheet } from '@/components/ItemSheet'
import { newItem } from '@/domain/item'
import { ItemsTable } from '@/components/ItemsTable'
import { SellDialog } from '@/components/SellDialog'
import { itemsToCsv } from '@/domain/csv'
import type { Item } from '@/domain/types'
import { todayIso } from '@/lib/format'
import { useRegistry, type SaveState } from '@/storage/useRegistry'

export default function App() {
  const reg = useRegistry()
  const [tab, setTab] = useState('dashboard')
  const [editing, setEditing] = useState<{ item: Item; isNew: boolean } | null>(null)
  const [selling, setSelling] = useState<Item | null>(null)
  const importInput = useRef<HTMLInputElement>(null)

  if (reg.phase !== 'ready') return <Welcome reg={reg} />

  const save = (item: Item, message: string) => {
    reg.upsertItem(item)
    toast.success(message)
  }

  const exportCsv = () => download(itemsToCsv(reg.items), 'text/csv;charset=utf-8', `registro-vinted-${todayIso()}.csv`)
  const exportJson = () =>
    download(JSON.stringify({ version: 1, items: reg.items }, null, 2), 'application/json', `registro-vinted-${todayIso()}.json`)

  const importJson = async (file: File | undefined) => {
    if (!file) return
    try {
      const n = await reg.importJson(file)
      toast.success(`${n} articoli importati`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <h1 className="text-lg font-semibold">Registro compravendite</h1>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserRound className="size-4" />
            {reg.userEmail}
            <SaveBadge state={reg.saveState} />
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <input
              ref={importInput}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                importJson(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <Button variant="outline" onClick={() => importInput.current?.click()} title="Importa un registro JSON (vecchio file locale o backup)">
              <Upload /> Importa JSON
            </Button>
            <Button variant="outline" onClick={exportJson} title="Scarica una copia di tutti i dati">
              <FileDown /> Backup JSON
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download /> Esporta CSV
            </Button>
            <Button variant="ghost" onClick={reg.signOut}>
              <LogOut /> Esci
            </Button>
            <Button onClick={() => setEditing({ item: newItem(todayIso()), isNew: true })}>
              <Plus /> Nuovo articolo
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {reg.error && (
          <p className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="size-4" /> {reg.error}
          </p>
        )}
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="articoli">Articoli ({reg.items.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <Dashboard items={reg.items} onOpen={(item) => setEditing({ item, isNew: false })} />
          </TabsContent>
          <TabsContent value="articoli">
            <ItemsTable
              items={reg.items}
              onEdit={(item) => setEditing({ item, isNew: false })}
              onSell={setSelling}
              onDelete={(id) => {
                reg.deleteItem(id)
                toast.success('Articolo eliminato')
              }}
            />
          </TabsContent>
        </Tabs>
      </main>

      <ItemSheet
        item={editing?.item ?? null}
        isNew={editing?.isNew ?? false}
        onClose={() => setEditing(null)}
        onSave={(item) => {
          save(item, editing?.isNew ? 'Articolo aggiunto' : 'Modifiche salvate')
          setEditing(null)
        }}
      />
      <SellDialog
        item={selling}
        onClose={() => setSelling(null)}
        onSave={(item) => {
          save(item, 'Vendita registrata')
          setSelling(null)
        }}
      />
      <Toaster position="bottom-right" />
    </div>
  )
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === 'saving') return <Loader2 className="size-3.5 animate-spin" aria-label="Salvataggio…" />
  if (state === 'error') return <AlertTriangle className="size-3.5 text-red-600" aria-label="Errore di salvataggio" />
  return <CheckCircle2 className="size-3.5 text-emerald-600" aria-label="Salvato" />
}

function download(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  Object.assign(document.createElement('a'), { href: url, download: filename }).click()
  URL.revokeObjectURL(url)
}

function Welcome({ reg }: { reg: ReturnType<typeof useRegistry> }) {
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    await reg.signIn(String(form.get('email')), String(form.get('password')))
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Registro compravendite</CardTitle>
          <CardDescription>Accedi per vedere e aggiornare il tuo registro da qualsiasi dispositivo.</CardDescription>
        </CardHeader>
        <CardContent>
          {reg.phase === 'loading' ? (
            <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
          ) : (
            <form className="grid gap-3" onSubmit={submit}>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <Button size="lg" type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <LogIn />} Accedi
              </Button>
            </form>
          )}
          {reg.error && <p className="mt-3 text-sm text-red-700">{reg.error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
