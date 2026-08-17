import axios from 'axios'
import { api } from './api'
import { listMutations, removeMutation, updateMutation, type OfflineMutation } from './offlineStore'

let syncing = false
let stopTimer: (() => void) | null = null

export type SyncResult = { processed: number; failed: number; pending: number }

const emitSyncEvent = (detail: SyncResult | { syncing: boolean }) => {
  window.dispatchEvent(new CustomEvent('finance-pro-sync', { detail }))
}

const retryDelay = (attempts: number) => Math.min(30_000, 1_000 * 2 ** Math.min(attempts, 5))

async function replayMutation(mutation: OfflineMutation) {
  try {
    await api.request({
      method: mutation.method,
      url: mutation.url,
      data: mutation.data,
      headers: { ...(mutation.headers ?? {}), 'X-Offline-Mutation-Id': mutation.id, 'X-Offline-Replay': 'true' },
    })
    await removeMutation(mutation.id)
    return true
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    await updateMutation({ ...mutation, attempts: mutation.attempts + 1 })
    if (status && status >= 400 && status < 500 && status !== 408 && status !== 409 && status !== 429) return false
    return false
  }
}

export async function syncOfflineMutations(): Promise<SyncResult> {
  if (syncing || !navigator.onLine) return { processed: 0, failed: 0, pending: (await listMutations()).length }
  syncing = true
  emitSyncEvent({ syncing: true })
  let processed = 0
  let failed = 0
  try {
    const queue = (await listMutations()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    for (const mutation of queue) {
      if (!navigator.onLine) break
      const success = await replayMutation(mutation)
      if (success) processed += 1
      else {
        failed += 1
        if (mutation.attempts > 0) await new Promise(resolve => setTimeout(resolve, retryDelay(mutation.attempts)))
      }
    }
  } finally {
    syncing = false
  }
  const pending = (await listMutations()).length
  const result = { processed, failed, pending }
  emitSyncEvent(result)
  return result
}

export function startOfflineSync() {
  if (stopTimer) return stopTimer
  const sync = () => { void syncOfflineMutations() }
  window.addEventListener('online', sync)
  sync()
  const timer = window.setInterval(sync, 30_000)
  stopTimer = () => {
    window.removeEventListener('online', sync)
    window.clearInterval(timer)
    stopTimer = null
  }
  return stopTimer
}
