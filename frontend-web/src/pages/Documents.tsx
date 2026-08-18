import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Upload, Download, Trash2, Search, RefreshCw } from 'lucide-react'
import { useOrganization } from '../context/OrganizationContext'
import { deleteDocument, documentDownloadUrl, type DocumentItem, fetchDocuments, uploadDocument } from '../services/documents'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

export default function Documents() {
  const { currentOrganization } = useOrganization()
  const [items, setItems] = useState<DocumentItem[]>([])
  const [query, setQuery] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const organizationId = currentOrganization?.id

  const load = async () => {
    if (!organizationId) return
    setLoading(true); setError('')
    try { setItems(await fetchDocuments(organizationId)) }
    catch (e: any) { setError(e?.response?.data?.message || 'Impossible de charger les pièces justificatives.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [organizationId])

  const filtered = useMemo(() => items.filter(item => item.original_name.toLowerCase().includes(query.toLowerCase())), [items, query])

  const handleUpload = async (file?: File) => {
    if (!file || !organizationId) return
    setUploading(true); setError('')
    try {
      const created = await uploadDocument(organizationId, file, description)
      setItems(prev => [created, ...prev]); setDescription('')
    } catch (e: any) { setError(e?.response?.data?.message || 'Le fichier n’a pas pu être enregistré.') }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' }
  }

  const remove = async (item: DocumentItem) => {
    if (!organizationId || !window.confirm(`Supprimer « ${item.original_name} » ?`)) return
    try { await deleteDocument(organizationId, item.id); setItems(prev => prev.filter(x => x.id !== item.id)) }
    catch (e: any) { setError(e?.response?.data?.message || 'Suppression impossible.') }
  }

  if (!organizationId) return <div className="p-6 text-slate-600">Aucune organisation active.</div>

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">DOCUMENTS</p>
            <h1 className="text-2xl font-bold text-slate-900">Pièces justificatives</h1>
            <p className="mt-1 text-sm text-slate-500">Centralisez les factures, reçus, contrats et autres justificatifs de l’organisation.</p>
          </div>
          <button onClick={() => inputRef.current?.click()} disabled={uploading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            <Upload size={17} /> {uploading ? 'Import...' : 'Ajouter une pièce'}
          </button>
          <input ref={inputRef} type="file" className="hidden" onChange={e => handleUpload(e.target.files?.[0])} />
        </header>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Documents</p><p className="mt-2 text-2xl font-bold text-slate-900">{items.length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Taille totale</p><p className="mt-2 text-2xl font-bold text-slate-900">{formatSize(items.reduce((sum, x) => sum + x.size, 0))}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Formats pris en charge</p><p className="mt-2 text-sm font-semibold text-slate-900">PDF · Images · Word · Excel · CSV</p></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un document..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400" /></div>
            <button onClick={load} className="inline-flex items-center gap-2 self-end rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"><RefreshCw size={15} /> Actualiser</button>
          </div>
          <div className="overflow-x-auto">
            {loading ? <div className="p-10 text-center text-sm text-slate-500">Chargement...</div> : filtered.length === 0 ? <div className="p-12 text-center"><FileText className="mx-auto text-slate-300" size={42} /><p className="mt-3 font-semibold text-slate-700">Aucune pièce justificative</p><p className="mt-1 text-sm text-slate-500">Ajoutez votre premier document pour commencer.</p></div> : (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Document</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Taille</th><th className="px-5 py-3">Ajouté le</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{filtered.map(item => <tr key={item.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-slate-100 p-2"><FileText size={18} className="text-slate-600" /></div><div><p className="font-semibold text-slate-800">{item.original_name}</p><p className="text-xs text-slate-500">{item.description || 'Sans description'}</p></div></div></td><td className="px-5 py-4 text-slate-600">{item.mime_type || '—'}</td><td className="px-5 py-4 text-slate-600">{formatSize(item.size)}</td><td className="px-5 py-4 text-slate-600">{new Date(item.created_at).toLocaleDateString('fr-FR')}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><a href={documentDownloadUrl(organizationId, item.id)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Télécharger"><Download size={16} /></a><button onClick={() => remove(item)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" title="Supprimer"><Trash2 size={16} /></button></div></td></tr>)}</tbody>
              </table>
            )}
          </div>
        </section>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5"><label className="text-sm font-semibold text-slate-700">Description du prochain document</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex. Facture fournisseur janvier 2026" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" /></div>
      </div>
    </main>
  )
}
