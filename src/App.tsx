import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileJson, FilePlus2, FolderOpen, Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

  if (reg.phase !== 'ready') return <Welcome reg={reg} />

  const save = (item: Item, message: string) => {
    reg.upsertItem(item)
    toast.success(message)
  }

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([itemsToCsv(reg.items)], { type: 'text/csv;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `registro-vinted-${todayIso()}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <h1 className="text-lg font-semibold">Registro compravendite</h1>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileJson className="size-4" />
            {reg.fileName}
            <SaveBadge state={reg.saveState} />
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download /> Esporta CSV
            </Button>
            <Button variant="ghost" onClick={reg.closeFile} title="Chiudi il file e scegline un altro">
              <X /> Chiudi file
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

function Welcome({ reg }: { reg: ReturnType<typeof useRegistry> }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Registro compravendite</CardTitle>
          <CardDescription>I dati restano sul tuo PC, in un file JSON che si salva da solo a ogni modifica.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {reg.phase === 'loading' && <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />}

          {reg.phase === 'unsupported' && (
            <p className="text-sm text-red-700">
              Questo browser non permette di salvare su file. Apri l’app con <b>Chrome</b> o <b>Edge</b> dal PC.
            </p>
          )}

          {reg.phase === 'needs-permission' && (
            <Button size="lg" onClick={reg.reopen}>
              <FolderOpen /> Riapri {reg.fileName}
            </Button>
          )}

          {(reg.phase === 'no-file' || reg.phase === 'needs-permission') && (
            <>
              <Button size="lg" variant={reg.phase === 'needs-permission' ? 'outline' : 'default'} onClick={reg.openFile}>
                <FolderOpen /> Apri un file esistente
              </Button>
              <Button size="lg" variant="outline" onClick={reg.createFile}>
                <FilePlus2 /> Crea un nuovo registro
              </Button>
            </>
          )}

          {reg.error && <p className="text-sm text-red-700">{reg.error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
