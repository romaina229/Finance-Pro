import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, RefreshCw } from 'lucide-react'
import { fetchConflicts, resolveConflict, type SyncConflict } from '../services/conflicts'
import { useOrganization } from '../context/OrganizationContext'

export default function Conflicts() {
  const { currentOrganization } = useOrganization()
  const [items, setItems] = useState<SyncConflict[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!currentOrganization?.id) return
    setLoading(true)
    try { setItems(await fetchConflicts(currentOrganization.id)) } finally { setLoading(false) }
  }, [currentOrganization?.id])

  useEffect(() => { void load() }, [load])

  const resolve = async (id: string, resolution: 'keep_local' | 'keep_server' | 'manual') => {
    if (!currentOrganization?.id) return
    setBusy(id)
    try { await resolveConflict(currentOrganization.id, id, resolution); await load() } finally { setBusy(null) }
  }

  return <div className="space-y-6 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-medium text-slate-500">Synchronisation</p><h1 className="text-2xl font-bold text-slate-900">Conflits à résoudre</h1><p className="mt-1 text-sm text-slate-500">Comparez les modifications locales et serveur avant validation.</p></div>
      <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm"><RefreshCw size={16} /> Actualiser</button>
    </div>
    {loading ? <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">Chargement…</div> : items.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center"><Check className="mx-auto mb-3" /><h2 className="font-semibold">Aucun conflit</h2><p className="mt-1 text-sm text-slate-500">Toutes les opérations synchronisées sont cohérentes.</p></div> : <div className="space-y-4">{items.map(item => <article key={item.id} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><AlertTriangle className="mt-1 text-amber-600" size={20} /><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-semibold text-slate-900">Conflit de synchronisation</h2><p className="text-xs text-slate-500">{item.method} · {item.url}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{item.status}</span></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><p className="mb-2 text-xs font-semibold uppercase text-slate-500">Version locale</p><pre className="max-h-40 overflow-auto text-xs">{JSON.stringify(item.local_payload, null, 2)}</pre></div><div className="rounded-xl bg-slate-50 p-3"><p className="mb-2 text-xs font-semibold uppercase text-slate-500">Version serveur</p><pre className="max-h-40 overflow-auto text-xs">{JSON.stringify(item.server_payload, null, 2)}</pre></div></div><div className="mt-4 flex flex-wrap gap-2"><button disabled={busy === item.id} onClick={() => void resolve(item.id, 'keep_local')} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Garder local</button><button disabled={busy === item.id} onClick={() => void resolve(item.id, 'keep_server')} className="rounded-lg border px-3 py-2 text-xs font-semibold">Garder serveur</button><button disabled={busy === item.id} onClick={() => void resolve(item.id, 'manual')} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800">Résolution manuelle</button></div></div></div></article>)}</div>}
  </div>
}
