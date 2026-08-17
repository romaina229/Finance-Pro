import { useEffect, useState } from 'react'
import { Activity, CalendarDays, RefreshCw, ShieldCheck } from 'lucide-react'
import { useOrganization } from '../context/OrganizationContext'
import { fetchAuditLogs, AuditLog } from '../services/auditLogs'

export default function AuditLogs() {
  const { currentOrganization } = useOrganization()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState('')

  async function load() {
    if (!currentOrganization) return
    setLoading(true); setError('')
    try {
      const result = await fetchAuditLogs(currentOrganization.id, action ? { action } : {})
      setLogs(result.data); setTotal(result.meta.total)
    } catch (e) { setError('Impossible de charger la traçabilité.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [currentOrganization?.id, action])

  return <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"><ShieldCheck size={14}/> Contrôle & traçabilité</div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Journal d'audit</h1><p className="mt-1 text-sm text-slate-500">Historique des opérations sensibles effectuées dans l'organisation.</p></div>
      <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><RefreshCw size={16}/> Actualiser</button>
    </div>
    <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2.5"><Activity size={19}/></div><div><div className="text-xs font-medium text-slate-400">Événements enregistrés</div><div className="mt-1 text-2xl font-bold text-slate-900">{total}</div></div></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2.5"><CalendarDays size={19}/></div><div><div className="text-xs font-medium text-slate-400">Filtre d'action</div><select value={action} onChange={e => setAction(e.target.value)} className="mt-1 rounded-lg border-0 bg-slate-50 px-2 py-1 text-sm font-semibold text-slate-800 outline-none"><option value="">Toutes les actions</option><option value="post">Créations</option><option value="patch">Modifications</option><option value="delete">Suppressions</option></select></div></div></div></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Chargement du journal…</div> : error ? <div className="p-10 text-center text-sm text-red-600">{error}</div> : logs.length === 0 ? <div className="p-12 text-center"><ShieldCheck className="mx-auto mb-3 text-slate-300" size={34}/><p className="font-semibold text-slate-700">Aucun événement</p><p className="mt-1 text-sm text-slate-400">Les créations, modifications et suppressions apparaîtront ici.</p></div> : <div className="divide-y divide-slate-100">{logs.map(log => <div key={log.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50"><div className="min-w-0"><div className="flex items-center gap-2"><span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{log.action}</span>{log.entity_type && <span className="text-sm font-medium text-slate-800">{log.entity_type}</span>}</div><div className="mt-1 text-xs text-slate-400">{log.user?.full_name ?? 'Utilisateur inconnu'} {log.ip_address ? `• ${log.ip_address}` : ''}</div></div><time className="shrink-0 text-xs text-slate-400">{new Date(log.created_at).toLocaleString('fr-FR')}</time></div>)}</div>}
    </section>
  </main>
}
