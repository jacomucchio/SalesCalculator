import { useCallback, useEffect, useRef, useState } from 'react'
import type { Item, Registry } from '@/domain/types'
import {
  forgetHandle,
  getRememberedHandle,
  hasPermission,
  isFileApiSupported,
  pickExistingFile,
  pickNewFile,
  readRegistry,
  writeRegistry,
} from './fileStore'

export type Phase = 'loading' | 'unsupported' | 'no-file' | 'needs-permission' | 'ready'
export type SaveState = 'saved' | 'saving' | 'error'

export function useRegistry() {
  const [phase, setPhase] = useState<Phase>(() => (isFileApiSupported() ? 'loading' : 'unsupported'))
  const [items, setItems] = useState<Item[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [error, setError] = useState<string | null>(null)
  const handle = useRef<FileSystemFileHandle | null>(null)
  const writes = useRef<Promise<void>>(Promise.resolve())
  const itemsRef = useRef<Item[]>([])

  const load = (h: FileSystemFileHandle, reg: Registry) => {
    handle.current = h
    setFileName(h.name)
    itemsRef.current = reg.items
    setItems(reg.items)
    setError(null)
    setPhase('ready')
  }

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e))

  useEffect(() => {
    if (!isFileApiSupported()) return
    getRememberedHandle().then(async (h) => {
      if (!h) return setPhase('no-file')
      handle.current = h
      setFileName(h.name)
      if (await hasPermission(h, false)) {
        try {
          load(h, await readRegistry(h))
        } catch (e) {
          fail(e)
          setPhase('no-file')
        }
      } else setPhase('needs-permission')
    })
  }, [])

  /** Re-grants access to the remembered file (needs a user click). */
  const reopen = useCallback(async () => {
    const h = handle.current
    if (!h) return
    try {
      if (!(await hasPermission(h, true))) return
      load(h, await readRegistry(h))
    } catch (e) {
      fail(e)
    }
  }, [])

  const pickWith = useCallback(async (pick: typeof pickExistingFile) => {
    try {
      const res = await pick()
      if (res) load(res.handle, res.registry)
    } catch (e) {
      fail(e)
    }
  }, [])
  const openFile = useCallback(() => pickWith(pickExistingFile), [pickWith])
  const createFile = useCallback(() => pickWith(pickNewFile), [pickWith])

  const closeFile = useCallback(async () => {
    await forgetHandle()
    handle.current = null
    setFileName(null)
    itemsRef.current = []
    setItems([])
    setPhase('no-file')
  }, [])

  /** Applies a change and writes the whole register to disk, serialising writes. */
  const mutate = useCallback((fn: (items: Item[]) => Item[]) => {
    const next = fn(itemsRef.current)
    itemsRef.current = next
    setItems(next)
    const h = handle.current
    if (!h) return
    setSaveState('saving')
    writes.current = writes.current
      .then(() => writeRegistry(h, { version: 1, items: next }))
      .then(() => setSaveState('saved'))
      .catch((e) => {
        setSaveState('error')
        fail(e)
      })
  }, [])

  const upsertItem = useCallback(
    (item: Item) =>
      mutate((prev) => (prev.some((i) => i.id === item.id) ? prev.map((i) => (i.id === item.id ? item : i)) : [...prev, item])),
    [mutate],
  )
  const deleteItem = useCallback((id: string) => mutate((prev) => prev.filter((i) => i.id !== id)), [mutate])

  return { phase, items, fileName, saveState, error, openFile, createFile, reopen, closeFile, upsertItem, deleteItem }
}
