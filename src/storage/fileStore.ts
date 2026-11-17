/**
 * Persists the register to a JSON file on disk via the File System Access API (Chrome/Edge desktop).
 * The last file handle is remembered in IndexedDB so the app can reopen it at the next visit;
 * the browser still asks the user to re-grant permission once per session.
 */
import { parseRegistry } from '@/domain/item'
import type { Registry } from '@/domain/types'

type PermissionMode = { mode: 'readwrite' }
interface PermissionedHandle extends FileSystemFileHandle {
  queryPermission(opts: PermissionMode): Promise<PermissionState>
  requestPermission(opts: PermissionMode): Promise<PermissionState>
}
interface PickerOptions {
  types?: { description: string; accept: Record<string, string[]> }[]
  suggestedName?: string
}
declare global {
  interface Window {
    showOpenFilePicker(opts?: PickerOptions): Promise<FileSystemFileHandle[]>
    showSaveFilePicker(opts?: PickerOptions): Promise<FileSystemFileHandle>
  }
}

const PICKER_TYPES = [{ description: 'Registro Vinted (JSON)', accept: { 'application/json': ['.json'] } }]

export const isFileApiSupported = () => typeof window !== 'undefined' && 'showOpenFilePicker' in window

// --- remembered handle (IndexedDB) ---------------------------------------------------------

const DB = 'jm-sales-calculator'
const STORE = 'handles'
const KEY = 'registry'

function idb<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(STORE)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const req = op(open.result.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result as T)
      req.onerror = () => reject(req.error)
    }
  })
}

export const getRememberedHandle = () =>
  idb<FileSystemFileHandle | undefined>('readonly', (s) => s.get(KEY)).catch(() => undefined)
const rememberHandle = (h: FileSystemFileHandle) => idb('readwrite', (s) => s.put(h, KEY))
export const forgetHandle = () => idb('readwrite', (s) => s.delete(KEY))

// --- file operations -----------------------------------------------------------------------

export async function hasPermission(handle: FileSystemFileHandle, request: boolean): Promise<boolean> {
  const h = handle as PermissionedHandle
  const opts: PermissionMode = { mode: 'readwrite' }
  if ((await h.queryPermission(opts)) === 'granted') return true
  return request && (await h.requestPermission(opts)) === 'granted'
}

export async function readRegistry(handle: FileSystemFileHandle): Promise<Registry> {
  const file = await handle.getFile()
  return parseRegistry(await file.text())
}

export async function writeRegistry(handle: FileSystemFileHandle, reg: Registry): Promise<void> {
  const w = await handle.createWritable()
  await w.write(JSON.stringify(reg, null, 2))
  await w.close()
}

/** Lets the user pick an existing file. Returns null if they cancel. */
export async function pickExistingFile(): Promise<{ handle: FileSystemFileHandle; registry: Registry } | null> {
  try {
    const [handle] = await window.showOpenFilePicker({ types: PICKER_TYPES })
    const registry = await readRegistry(handle)
    await rememberHandle(handle)
    return { handle, registry }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null
    throw e
  }
}

/** Lets the user create a new, empty file. Returns null if they cancel. */
export async function pickNewFile(): Promise<{ handle: FileSystemFileHandle; registry: Registry } | null> {
  try {
    const handle = await window.showSaveFilePicker({ types: PICKER_TYPES, suggestedName: 'vinted.json' })
    const registry: Registry = { version: 1, items: [] }
    await writeRegistry(handle, registry)
    await rememberHandle(handle)
    return { handle, registry }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null
    throw e
  }
}
