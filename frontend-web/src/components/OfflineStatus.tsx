import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw, Trash2, Wifi } from 'lucide-react'
import { clearMutations, listMutations } from '../services/offlineStore'
import { syncOfflineMutations, type SyncResult } from '../services/offlineSync'

export default function OfflineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    const refresh = async () => setPending((await listMutations()).length)
    const onOnline = () => { setOnline(true); void refresh(); void syncOfflineMutations() }
    const onOffline = () => setOnline(false)
    const onSync = (event: Event) => {
      const detail = (event as CustomEvent<SyncResult | { syncing: boolean }>).detail
      if ('syncing' in detail) setSyncing(detail.syncing)
      else { setSyncing(false); setLastResult(detail); setPending(detail.pending) }
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('finance-pro-sync', onSync)
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 5000)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('finance-pro-sync', onSync)
      window.clearInterval(timer)
    }
  }, [])

  async function handleClear() {
    if (clearing) return
    const confirmed = window.confirm(
      `Vider la file supprimera définitivement ${pending} opération${pending > 1 ? 's' : ''} en attente de synchronisation (non enregistrée${pending > 1 ? 's' : ''} sur le serveur). Cette action est irréversible. Continuer ?`
    )
    if (!confirmed) return
    setClearing(true)
    try {
      await clearMutations()
      const remaining = (await listMutations()).length
      setPending(remaining)
      setLastResult(null)
      window.dispatchEvent(new CustomEvent('finance-pro-sync', { detail: { processed: 0, failed: 0, pending: remaining } }))
    } finally {
      setClearing(false)
    }
  }

  if (online && pending === 0 && !syncing && !lastResult?.failed) return null

  const title = !online ? 'Mode hors connexion' : syncing ? 'Synchronisation en cours' : pending > 0 ? 'Synchronisation en attente' : 'Synchronisation terminée avec erreurs'
  const message = !online
    ? 'Les données disponibles localement restent accessibles.'
    : syncing
      ? `${pending} opération${pending > 1 ? 's' : ''} restante${pending > 1 ? 's' : ''}`
      : lastResult?.failed
        ? `${lastResult.failed} opération${lastResult.failed > 1 ? 's' : ''} à réessayer`
        : 'Toutes les opérations sont synchronisées.'

  return <div className={`fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${online ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-700 bg-slate-900 text-white'}`}>
    {online ? <Wifi size={17} className={syncing ? 'animate-pulse' : ''} /> : <CloudOff size={17} />}
    <div><div className="font-semibold">{title}</div><div className="text-xs opacity-75">{message}</div></div>
    {online && (pending > 0 || lastResult?.failed) && (
      <button type="button" onClick={() => void syncOfflineMutations()} className="rounded-lg p-2 hover:bg-amber-100" title="Synchroniser">
        <RefreshCw size={16} />
      </button>
    )}
    {pending > 0 && (
      <button
        type="button"
        onClick={() => void handleClear()}
        disabled={clearing}
        className={`rounded-lg p-2 disabled:opacity-50 ${online ? 'hover:bg-amber-100 text-amber-900' : 'hover:bg-slate-800 text-white'}`}
        title="Vider la file (supprime les opérations en attente non synchronisées)"
      >
        <Trash2 size={16} />
      </button>
    )}
  </div>
}