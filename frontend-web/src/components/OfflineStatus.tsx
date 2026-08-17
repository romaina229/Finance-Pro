import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw, Wifi } from 'lucide-react'
import { listMutations } from '../services/offlineStore'
import { syncOfflineMutations } from '../services/offlineSync'

export default function OfflineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const refresh = async () => setPending((await listMutations()).length)
    const onOnline = () => { setOnline(true); void refresh(); void syncOfflineMutations() }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 5000)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); window.clearInterval(timer) }
  }, [])

  if (online && pending === 0) return null

  return <div className={`fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${online ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-700 bg-slate-900 text-white'}`}>
    {online ? <Wifi size={17} /> : <CloudOff size={17} />}
    <div><div className="font-semibold">{online ? 'Synchronisation en attente' : 'Mode hors connexion'}</div><div className="text-xs opacity-75">{online ? `${pending} opération${pending > 1 ? 's' : ''} à synchroniser` : 'Les données disponibles localement restent accessibles.'}</div></div>
    {online && pending > 0 && <button type="button" onClick={() => void syncOfflineMutations()} className="rounded-lg p-2 hover:bg-amber-100" title="Synchroniser"><RefreshCw size={16} /></button>}
  </div>
}
