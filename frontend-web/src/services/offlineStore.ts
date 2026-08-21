const DB_NAME = 'ong-finance-pro-offline'
const DB_VERSION = 1
const CACHE_STORE = 'responses'
const QUEUE_STORE = 'mutations'

export type OfflineMutation = {
  id: string
  method: string
  url: string
  data?: unknown
  headers?: Record<string, string>
  createdAt: string
  attempts: number
}

type CachedResponse = { key: string; data: unknown; cachedAt: string }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'))
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE, { keyPath: 'key' })
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const request = action(tx.objectStore(storeName))
    request.onsuccess = () => resolve(request.result as T)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
    tx.onerror = () => reject(tx.error)
  })
}

export async function cacheResponse(key: string, data: unknown) {
  try { await withStore(CACHE_STORE, 'readwrite', store => store.put({ key, data, cachedAt: new Date().toISOString() } as CachedResponse)) } catch { /* cache must never break the application */ }
}

export async function readCachedResponse<T>(key: string): Promise<T | undefined> {
  try { return await withStore<CachedResponse | undefined>(CACHE_STORE, 'readonly', store => store.get(key)).then(item => item?.data as T | undefined) } catch { return undefined }
}

export async function enqueueMutation(mutation: OfflineMutation) {
  await withStore(QUEUE_STORE, 'readwrite', store => store.put(mutation))
}

export async function listMutations(): Promise<OfflineMutation[]> {
  try { return (await withStore<OfflineMutation[]>(QUEUE_STORE, 'readonly', store => store.getAll())) ?? [] } catch { return [] }
}

export async function removeMutation(id: string) {
  await withStore(QUEUE_STORE, 'readwrite', store => store.delete(id))
}

export async function updateMutation(mutation: OfflineMutation) {
  await withStore(QUEUE_STORE, 'readwrite', store => store.put(mutation))
}

/**
 * Vide entièrement la file de mutations en attente, sans les rejouer.
 * Utile quand des mutations restent bloquées (ex. jeton devenu invalide
 * après une réinitialisation côté serveur) et boucleraient sinon
 * indéfiniment en échec. Les écritures correspondantes sont perdues :
 * l'utilisateur doit être prévenu avant confirmation côté UI.
 */
export async function clearMutations(): Promise<void> {
  await withStore(QUEUE_STORE, 'readwrite', store => store.clear())
}

export function mutationId() { return crypto.randomUUID() }

export function isOffline() { return typeof navigator !== 'undefined' && !navigator.onLine }