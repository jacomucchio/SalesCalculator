import { useCallback, useEffect, useRef, useState } from 'react'
import { parseRegistry } from '@/domain/item'
import type { Item } from '@/domain/types'
import { fetchItems, importItems, removeItem, saveItem } from './remoteStore'
import { configError, supabase } from './supabase'

export type Phase = 'loading' | 'signed-out' | 'ready'
export type SaveState = 'saved' | 'saving' | 'error'

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function useRegistry() {
  const [phase, setPhase] = useState<Phase>(configError ? 'signed-out' : 'loading')
  const [items, setItems] = useState<Item[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [error, setError] = useState<string | null>(configError)
  const writes = useRef<Promise<void>>(Promise.resolve())
  const itemsRef = useRef<Item[]>([])

  const show = (next: Item[]) => {
    itemsRef.current = next
    setItems(next)
  }

  const reload = useCallback(async () => {
    try {
      show(await fetchItems())
      setError(null)
    } catch (e) {
      setError(message(e))
    }
  }, [])

  useEffect(() => {
    if (configError) return
    let userId: string | null = null
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null
      setUserEmail(session?.user.email ?? null)
      if (id === userId) return // token refresh etc.: nothing to reload
      userId = id
      if (!id) {
        show([])
        setPhase('signed-out')
        return
      }
      // Supabase advises against awaiting other Supabase calls inside this callback.
      setTimeout(() => {
        setPhase('loading')
        reload().then(() => setPhase('ready'))
      }, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [reload])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message === 'Invalid login credentials' ? 'Email o password errati' : error.message)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  /** Applies a change locally right away, then runs the remote write (serialised). On failure reloads from the server. */
  const mutate = useCallback(
    (fn: (items: Item[]) => Item[], write: () => Promise<void>) => {
      show(fn(itemsRef.current))
      setSaveState('saving')
      writes.current = writes.current
        .then(write)
        .then(() => setSaveState('saved'))
        .catch(async (e) => {
          setSaveState('error')
          setError(message(e))
          show(await fetchItems().catch(() => itemsRef.current))
        })
    },
    [],
  )

  const upsertItem = useCallback(
    (item: Item) =>
      mutate(
        (prev) => (prev.some((i) => i.id === item.id) ? prev.map((i) => (i.id === item.id ? item : i)) : [...prev, item]),
        () => saveItem(item),
      ),
    [mutate],
  )
  const deleteItem = useCallback(
    (id: string) => mutate((prev) => prev.filter((i) => i.id !== id), () => removeItem(id)),
    [mutate],
  )

  /** Imports the items of a register JSON file (the old local format). Returns how many were imported. */
  const importJson = useCallback(
    async (file: File): Promise<number> => {
      const { items: imported } = parseRegistry(await file.text())
      setSaveState('saving')
      try {
        await importItems(imported)
        setSaveState('saved')
      } catch (e) {
        setSaveState('error')
        throw e
      }
      await reload()
      return imported.length
    },
    [reload],
  )

  return { phase, items, userEmail, saveState, error, signIn, signOut, upsertItem, deleteItem, importJson }
}
