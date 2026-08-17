import axios from 'axios'
import { api } from './api'
import { listMutations, removeMutation, updateMutation } from './offlineStore'

let syncing = false

export async function syncOfflineMutations() {
  if (syncing || !navigator.onLine) return
  syncing = true
  try {
    const queue = (await listMutations()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    for (const mutation of queue) {
      try {
        await api.request({
          method: mutation.method,
          url: mutation.url,
          data: mutation.data,
          headers: { ...(mutation.headers ?? {}), 'X-Offline-Mutation-Id': mutation.id, 'X-Offline-Replay': 'true' },
        })
        await removeMutation(mutation.id)
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined
        await updateMutation({ ...mutation, attempts: mutation.attempts + 1 })
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) continue
      }
    }
  } finally {
    syncing = false
  }
}

export function startOfflineSync() {
  const sync = () => { void syncOfflineMutations() }
  window.addEventListener('online', sync)
  sync()
  return () => window.removeEventListener('online', sync)
}
