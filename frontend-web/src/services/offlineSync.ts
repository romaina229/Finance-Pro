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
          headers: { ...(mutation.headers ?? {}), 'X-Offline-Mutation-Id': mutation.id },
        })
        await removeMutation(mutation.id)
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined
        const attempts = mutation.attempts + 1
        // Validation/permission/conflict errors must remain queued for an explicit retry,
        // while transient transport/server errors are retried with the next online event.
        await updateMutation({ ...mutation, attempts })
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
