import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Banknote,
  Calculator,
  CheckCircle2,
  ChevronDown,
  CircleArrowDown,
  CircleArrowUp,
  ClipboardCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import { NavBar } from '../components/NavBar'
import { useOrganization } from '../context/OrganizationContext'
import { fetchMembers, type Member } from '../services/members'
import { fetchProjects, type Project } from '../services/projects'
import {
  createCashRegister,
  createCashTransaction,
  fetchCashReconciliations,
  fetchCashRegisters,
  fetchCashTransactions,
  reconcileCash,
  type CashReconciliation,
  type CashRegister,
  type CashTransaction,
} from '../services/cash'
import { formatDate } from '../utils/date'

const today = new Date().toISOString().slice(0, 10)

function formatMoney(value: string | number, currency: string) {
  return `${Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function errorMessage(error: any, fallback: string) {
  const messages = error?.response?.data?.errors
  if (messages) return Object.values(messages).flat().join(' ')
  return error?.response?.data?.message ?? fallback
}

export default function Cash() {
  const { currentOrganization } = useOrganization()
  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [reconciliations, setReconciliations] = useState<CashReconciliation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registerForm, setRegisterForm] = useState(false)
  const [transactionForm, setTransactionForm] = useState(false)
  const [reconciliationForm, setReconciliationForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [newRegister, setNewRegister] = useState({
    code: '', name: '', currency: currentOrganization?.default_currency ?? 'XOF', custodian_id: '', location: '', opening_balance: 0,
  })
  const [transaction, setTransaction] = useState({
    type: 'in' as 'in' | 'out', amount: 0, transaction_date: today, reference: '', description: '', project_id: '',
  })
  const [reconciliation, setReconciliation] = useState({
    reconciliation_date: today, physical_balance: 0, notes: '',
  })

  const selected = registers.find((register) => register.id === selectedId) ?? null

  const summary = useMemo(() => {
    const current = selected ? Number(selected.current_balance) : 0
    const entries = transactions.filter((item) => item.type === 'in').reduce((sum, item) => sum + Number(item.amount), 0)
    const exits = transactions.filter((item) => item.type === 'out').reduce((sum, item) => sum + Number(item.amount), 0)
    const lastDifference = reconciliations[0] ? Number(reconciliations[0].difference) : null
    return { current, entries, exits, lastDifference }
  }, [selected, transactions, reconciliations])

  async function loadRegisters(selectFirst = true) {
    if (!currentOrganization) return
    const data = await fetchCashRegisters(currentOrganization.id)
    setRegisters(data)
    if (selectFirst && data.length && !data.some((item) => item.id === selectedId)) setSelectedId(data[0].id)
  }

  async function loadDetails(registerId: string) {
    if (!currentOrganization || !registerId) return
    const [transactionData, reconciliationData] = await Promise.all([
      fetchCashTransactions(currentOrganization.id, registerId),
      fetchCashReconciliations(currentOrganization.id, registerId),
    ])
    setTransactions(transactionData)
    setReconciliations(reconciliationData)
  }

  async function load() {
    if (!currentOrganization) return
    setLoading(true)
    setError(null)
    try {
      const [cashRegisters, membersData, projectsData] = await Promise.all([
        fetchCashRegisters(currentOrganization.id),
        fetchMembers(currentOrganization.id),
        fetchProjects(currentOrganization.id),
      ])
      setRegisters(cashRegisters)
      setMembers(membersData.filter((member) => member.status === 'active'))
      setProjects(projectsData)
      const nextId = cashRegisters.some((item) => item.id === selectedId) ? selectedId : cashRegisters[0]?.id ?? ''
      setSelectedId(nextId)
      if (nextId) {
        const [transactionData, reconciliationData] = await Promise.all([
          fetchCashTransactions(currentOrganization.id, nextId),
          fetchCashReconciliations(currentOrganization.id, nextId),
        ])
        setTransactions(transactionData)
        setReconciliations(reconciliationData)
      } else {
        setTransactions([])
        setReconciliations([])
      }
    } catch (err) {
      setError(errorMessage(err, 'Impossible de charger les données de caisse.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id])

  useEffect(() => {
    if (!loading && selectedId) loadDetails(selectedId).catch((err) => setError(errorMessage(err, 'Impossible de charger les opérations.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  async function refresh() {
    setRefreshing(true)
    try { await load() } finally { setRefreshing(false) }
  }

  async function handleRegisterSubmit(event: FormEvent) {
    event.preventDefault()
    if (!currentOrganization) return
    setSaving(true); setError(null)
    try {
      const created = await createCashRegister(currentOrganization.id, {
        ...newRegister,
        custodian_id: newRegister.custodian_id || null,
      })
      setRegisterForm(false)
      setNewRegister({ code: '', name: '', currency: currentOrganization.default_currency ?? 'XOF', custodian_id: '', location: '', opening_balance: 0 })
      await loadRegisters(false)
      setSelectedId(created.id)
    } catch (err) {
      setError(errorMessage(err, 'Impossible de créer la caisse.'))
    } finally { setSaving(false) }
  }

  async function handleTransactionSubmit(event: FormEvent) {
    event.preventDefault()
    if (!currentOrganization || !selected) return
    setSaving(true); setError(null)
    try {
      await createCashTransaction(currentOrganization.id, selected.id, {
        ...transaction,
        project_id: transaction.project_id || null,
      })
      setTransactionForm(false)
      setTransaction({ type: 'in', amount: 0, transaction_date: today, reference: '', description: '', project_id: '' })
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Impossible d’enregistrer le mouvement.'))
    } finally { setSaving(false) }
  }

  async function handleReconciliationSubmit(event: FormEvent) {
    event.preventDefault()
    if (!currentOrganization || !selected) return
    setSaving(true); setError(null)
    try {
      await reconcileCash(currentOrganization.id, selected.id, reconciliation)
      setReconciliationForm(false)
      setReconciliation({ reconciliation_date: today, physical_balance: Number(selected.current_balance), notes: '' })
      await loadDetails(selected.id)
    } catch (err) {
      setError(errorMessage(err, 'Impossible d’enregistrer le rapprochement.'))
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">FINANCES</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Caisse</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">Suivez les espèces physiques, les entrées et sorties, puis rapprochez le solde théorique avec le comptage réel.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Actualiser
            </button>
            <button onClick={() => setRegisterForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
              <Plus size={16} /> Nouvelle caisse
            </button>
          </div>
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Chargement de la caisse…</div>
        ) : registers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Banknote size={24} /></div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Aucune caisse configurée</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Créez une caisse pour commencer à enregistrer les entrées, sorties et rapprochements physiques.</p>
            <button onClick={() => setRegisterForm(true)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"><Plus size={16} /> Créer la première caisse</button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><WalletCards size={20} /></div>
                <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Caisse sélectionnée</p><p className="font-semibold text-slate-900">{selected?.name}</p></div>
              </div>
              <div className="relative min-w-64">
                <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-slate-400">
                  {registers.map((register) => <option key={register.id} value={register.id}>{register.code} — {register.name}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-2.5 text-slate-400" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard icon={<WalletCards size={19} />} label="Solde théorique" value={formatMoney(summary.current, selected?.currency ?? 'XOF')} />
              <SummaryCard icon={<CircleArrowUp size={19} />} label="Entrées affichées" value={formatMoney(summary.entries, selected?.currency ?? 'XOF')} tone="positive" />
              <SummaryCard icon={<CircleArrowDown size={19} />} label="Sorties affichées" value={formatMoney(summary.exits, selected?.currency ?? 'XOF')} tone="negative" />
              <SummaryCard icon={<ClipboardCheck size={19} />} label="Dernier écart" value={summary.lastDifference === null ? '—' : formatMoney(summary.lastDifference, selected?.currency ?? 'XOF')} tone={summary.lastDifference === null ? 'neutral' : summary.lastDifference === 0 ? 'positive' : 'warning'} />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><h2 className="font-semibold text-slate-900">Opérations de caisse</h2><p className="mt-1 text-xs text-slate-500">Les mouvements validés alimentent le solde théorique.</p></div>
                  <button disabled={selected?.status !== 'open'} onClick={() => setTransactionForm(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={16} /> Entrée / sortie</button>
                </div>
                {transactions.length === 0 ? <div className="p-8 text-center text-sm text-slate-400">Aucune opération enregistrée.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Nature</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Projet</th><th className="px-5 py-3 text-right">Montant</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-5 py-3 text-slate-500">{formatDate(item.transaction_date)}</td><td className="px-5 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${item.type === 'in' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{item.type === 'in' ? <CircleArrowUp size={13} /> : <CircleArrowDown size={13} />}{item.type === 'in' ? 'Entrée' : 'Sortie'}</span></td><td className="max-w-xs truncate px-5 py-3 text-slate-700">{item.description || item.reference || '—'}</td><td className="px-5 py-3 text-slate-500">{item.project?.name ?? '—'}</td><td className={`px-5 py-3 text-right font-semibold ${item.type === 'in' ? 'text-emerald-700' : 'text-red-700'}`}>{item.type === 'in' ? '+' : '−'}{formatMoney(item.amount, selected?.currency ?? 'XOF')}</td></tr>)}</tbody></table></div>}
              </section>

              <aside className="space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Rapprochement</h2><p className="mt-1 text-xs text-slate-500">Comptage physique vs solde théorique.</p></div><Calculator size={20} className="text-slate-400" /></div>
                  <div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Théorique</span><strong className="text-slate-900">{formatMoney(selected?.current_balance ?? 0, selected?.currency ?? 'XOF')}</strong></div><div className="flex justify-between"><span className="text-slate-500">Dernier physique</span><strong className="text-slate-900">{reconciliations[0] ? formatMoney(reconciliations[0].physical_balance, selected?.currency ?? 'XOF') : '—'}</strong></div><div className="border-t border-slate-100 pt-3"><div className="flex items-center justify-between"><span className="text-slate-500">Dernier écart</span><strong className={summary.lastDifference === null ? 'text-slate-400' : summary.lastDifference === 0 ? 'text-emerald-600' : 'text-amber-600'}>{summary.lastDifference === null ? '—' : formatMoney(summary.lastDifference, selected?.currency ?? 'XOF')}</strong></div></div></div>
                  <button onClick={() => { setReconciliation({ reconciliation_date: today, physical_balance: Number(selected?.current_balance ?? 0), notes: '' }); setReconciliationForm(true) }} disabled={!selected || selected.status !== 'open'} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ClipboardCheck size={16} /> Faire un rapprochement</button>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-slate-500" /><h2 className="font-semibold text-slate-900">Caisse</h2></div><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Code</dt><dd className="font-medium text-slate-800">{selected?.code}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Responsable</dt><dd className="font-medium text-slate-800">{selected?.custodian?.full_name ?? 'Non affecté'}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Localisation</dt><dd className="font-medium text-slate-800">{selected?.location ?? '—'}</dd></div><div className="flex justify-between"><dt className="text-slate-500">État</dt><dd><span className={`rounded-full px-2 py-1 text-xs font-semibold ${selected?.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{selected?.status === 'open' ? 'Ouverte' : 'Fermée'}</span></dd></div></dl></section>
              </aside>
            </div>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-900">Historique des rapprochements</h2><p className="mt-1 text-xs text-slate-500">Les écarts sont conservés pour assurer la traçabilité.</p></div>{reconciliations.length === 0 ? <div className="p-6 text-sm text-slate-400">Aucun rapprochement réalisé.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Théorique</th><th className="px-5 py-3">Physique</th><th className="px-5 py-3">Écart</th><th className="px-5 py-3">Contrôlé par</th></tr></thead><tbody>{reconciliations.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-5 py-3 text-slate-500">{new Date(item.reconciliation_date).toLocaleDateString('fr-FR')}</td><td className="px-5 py-3">{formatMoney(item.theoretical_balance, selected?.currency ?? 'XOF')}</td><td className="px-5 py-3">{formatMoney(item.physical_balance, selected?.currency ?? 'XOF')}</td><td className={`px-5 py-3 font-semibold ${Number(item.difference) === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{formatMoney(item.difference, selected?.currency ?? 'XOF')}</td><td className="px-5 py-3 text-slate-500">{item.reconciler?.full_name ?? '—'}</td></tr>)}</tbody></table></div>}</section>
          </>
        )}
      </main>

      {registerForm && <Modal title="Nouvelle caisse" onClose={() => setRegisterForm(false)}><form onSubmit={handleRegisterSubmit} className="space-y-4"><Field label="Code"><input required value={newRegister.code} onChange={(e) => setNewRegister({ ...newRegister, code: e.target.value })} placeholder="CAISSE-COTONOU" className="input" /></Field><Field label="Nom"><input required value={newRegister.name} onChange={(e) => setNewRegister({ ...newRegister, name: e.target.value })} placeholder="Caisse principale" className="input" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Devise"><select value={newRegister.currency} onChange={(e) => setNewRegister({ ...newRegister, currency: e.target.value })} className="input"><option>XOF</option><option>EUR</option><option>USD</option></select></Field><Field label="Solde d'ouverture"><input required type="number" min="0" step="0.01" value={newRegister.opening_balance} onChange={(e) => setNewRegister({ ...newRegister, opening_balance: Number(e.target.value) })} className="input" /></Field></div><Field label="Responsable"><select value={newRegister.custodian_id} onChange={(e) => setNewRegister({ ...newRegister, custodian_id: e.target.value })} className="input"><option value="">Non affecté</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}</select></Field><Field label="Localisation"><input value={newRegister.location} onChange={(e) => setNewRegister({ ...newRegister, location: e.target.value })} placeholder="Bureau / antenne" className="input" /></Field><ModalActions saving={saving} label="Créer la caisse" /></form></Modal>}

      {transactionForm && selected && <Modal title="Nouvelle opération" onClose={() => setTransactionForm(false)}><form onSubmit={handleTransactionSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => setTransaction({ ...transaction, type: 'in' })} className={`rounded-md py-2 text-sm font-semibold ${transaction.type === 'in' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Entrée</button><button type="button" onClick={() => setTransaction({ ...transaction, type: 'out' })} className={`rounded-md py-2 text-sm font-semibold ${transaction.type === 'out' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500'}`}>Sortie</button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Montant"><input required type="number" min="0.01" step="0.01" value={transaction.amount} onChange={(e) => setTransaction({ ...transaction, amount: Number(e.target.value) })} className="input" /></Field><Field label="Date"><input required type="date" value={transaction.transaction_date} onChange={(e) => setTransaction({ ...transaction, transaction_date: e.target.value })} className="input" /></Field></div><Field label="Projet"><select value={transaction.project_id} onChange={(e) => setTransaction({ ...transaction, project_id: e.target.value })} className="input"><option value="">Aucun projet</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.code} — {project.name}</option>)}</select></Field><Field label="Référence"><input value={transaction.reference} onChange={(e) => setTransaction({ ...transaction, reference: e.target.value })} className="input" placeholder="Pièce, reçu, numéro…" /></Field><Field label="Description"><textarea rows={3} value={transaction.description} onChange={(e) => setTransaction({ ...transaction, description: e.target.value })} className="input" /></Field><ModalActions saving={saving} label="Enregistrer l'opération" /></form></Modal>}

      {reconciliationForm && selected && <Modal title="Rapprochement de caisse" onClose={() => setReconciliationForm(false)}><form onSubmit={handleReconciliationSubmit} className="space-y-4"><div className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between text-sm"><span className="text-slate-500">Solde théorique</span><strong>{formatMoney(selected.current_balance, selected.currency)}</strong></div></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Date"><input required type="date" value={reconciliation.reconciliation_date} onChange={(e) => setReconciliation({ ...reconciliation, reconciliation_date: e.target.value })} className="input" /></Field><Field label="Comptage physique"><input required type="number" min="0" step="0.01" value={reconciliation.physical_balance} onChange={(e) => setReconciliation({ ...reconciliation, physical_balance: Number(e.target.value) })} className="input" /></Field></div><div className="rounded-xl border border-slate-200 p-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">Écart calculé</span><strong className={reconciliation.physical_balance - Number(selected.current_balance) === 0 ? 'text-emerald-600' : 'text-amber-600'}>{formatMoney(reconciliation.physical_balance - Number(selected.current_balance), selected.currency)}</strong></div></div><Field label="Observations"><textarea rows={3} value={reconciliation.notes} onChange={(e) => setReconciliation({ ...reconciliation, notes: e.target.value })} className="input" placeholder="Explication éventuelle de l'écart…" /></Field><ModalActions saving={saving} label="Valider le rapprochement" /></form></Modal>}
    </div>
  )
}

function SummaryCard({ icon, label, value, tone = 'neutral' }: { icon: React.ReactNode; label: string; value: string; tone?: 'neutral' | 'positive' | 'negative' | 'warning' }) {
  const tones = { neutral: 'bg-slate-100 text-slate-600', positive: 'bg-emerald-50 text-emerald-700', negative: 'bg-red-50 text-red-700', warning: 'bg-amber-50 text-amber-700' }
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span></div><p className="mt-4 text-xl font-bold tracking-tight text-slate-950">{value}</p></div>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4"><div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-950">{title}</h2><button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-700">Fermer</button></div>{children}</div></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>{children}</label>
}

function ModalActions({ saving, label }: { saving: boolean; label: string }) {
  return <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}{saving ? 'Enregistrement…' : label}</button></div>
}
