import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, FileText, Globe2, Mail, MapPin, Phone, ReceiptText, UserRound, XCircle } from 'lucide-react'
import { approveOrganization, fetchOrganization, rejectOrganization, type AdminOrganizationDetail } from '../../services/superAdmin'

const statusLabel: Record<AdminOrganizationDetail['approval_status'], string> = {
  pending: 'En attente',
  approved: 'Validée',
  rejected: 'Rejetée',
}

const statusClass: Record<AdminOrganizationDetail['approval_status'], string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date)
}

function formatAmount(value?: string | number, currency = 'XOF') {
  if (value === undefined || value === null || value === '') return '—'
  return `${Number(value).toLocaleString('fr-FR')} ${currency}`
}

function InfoItem({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon?: typeof Building2 }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800">{value || '—'}</p>
    </div>
  )
}

export default function SuperAdminOrganizationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [organization, setOrganization] = useState<AdminOrganizationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      setOrganization(await fetchOrganization(id))
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Impossible de charger le profil de cette organisation.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const primaryAdmin = useMemo(
    () => organization?.users?.find((user) => user.pivot?.is_primary) ?? organization?.users?.[0] ?? null,
    [organization],
  )

  async function handleApprove() {
    if (!id || !organization || organization.approval_status === 'approved') return
    if (!window.confirm(`Valider l'organisation « ${organization.name} » ?`)) return
    setBusy(true)
    setError(null)
    try {
      await approveOrganization(id)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Impossible de valider cette organisation.')
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!id || !organization) return
    const reason = window.prompt('Motif du rejet (visible par l’organisation) :')?.trim()
    if (!reason) return
    setBusy(true)
    setError(null)
    try {
      await rejectOrganization(id, reason)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Impossible de rejeter cette organisation.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Chargement du profil de l'organisation…</div></div>
  }

  if (!organization) {
    return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8"><p className="text-sm text-red-600">{error ?? 'Organisation introuvable.'}</p><button onClick={() => navigate('/super-admin')} className="mt-5 text-sm font-semibold text-slate-700 hover:underline">Retour aux organisations</button></div></div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-slate-950 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">Espace plateforme</p>
            <h1 className="mt-1 text-lg font-semibold text-white">Profil de l'organisation</h1>
          </div>
          <button onClick={() => navigate('/super-admin')} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4" /> Organisations
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6 sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                  {organization.logo_path ? <img src={organization.logo_path} alt={`Logo ${organization.name}`} className="h-full w-full object-contain" /> : <Building2 className="h-9 w-9 text-slate-400" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">{organization.name}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass[organization.approval_status]}`}>{statusLabel[organization.approval_status]}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{organization.acronym || 'Organisation'} · créée le {formatDate(organization.created_at)}</p>
                </div>
              </div>

              {organization.approval_status === 'pending' && (
                <div className="flex flex-wrap gap-3">
                  <button disabled={busy} onClick={handleReject} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                    <XCircle className="h-4 w-4" /> Rejeter
                  </button>
                  <button disabled={busy} onClick={handleApprove} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" /> {busy ? 'Traitement…' : 'Valider l’organisation'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-6">
              <section>
                <div className="mb-4 flex items-center gap-2"><Building2 className="h-5 w-5 text-slate-700" /><h3 className="font-semibold text-slate-900">Informations de l’organisation</h3></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoItem label="Nom" value={organization.name} icon={Building2} />
                  <InfoItem label="Acronyme" value={organization.acronym} />
                  <InfoItem label="Pays" value={organization.country} icon={Globe2} />
                  <InfoItem label="Ville" value={organization.city} icon={MapPin} />
                  <InfoItem label="Statut juridique" value={organization.legal_status} />
                  <InfoItem label="N° d’enregistrement" value={organization.registration_number} icon={FileText} />
                  <InfoItem label="Adresse" value={organization.address} icon={MapPin} />
                  <InfoItem label="Devise" value={organization.default_currency} />
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-2"><UserRound className="h-5 w-5 text-slate-700" /><h3 className="font-semibold text-slate-900">Administrateur principal</h3></div>
                <div className="rounded-2xl border border-slate-200 p-5">
                  {primaryAdmin ? <div className="grid gap-4 sm:grid-cols-2">
                    <InfoItem label="Nom complet" value={primaryAdmin.full_name} icon={UserRound} />
                    <InfoItem label="Rôle" value={primaryAdmin.role?.name || primaryAdmin.role?.code || 'Administrateur'} />
                    <InfoItem label="Email" value={primaryAdmin.email} icon={Mail} />
                    <InfoItem label="Téléphone" value={primaryAdmin.phone} icon={Phone} />
                  </div> : <p className="text-sm text-slate-500">Aucun administrateur principal n’est associé à cette organisation.</p>}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-slate-700" /><h3 className="font-semibold text-slate-900">Statut et accès</h3></div>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Statut</dt><dd className="font-semibold text-slate-800">{statusLabel[organization.approval_status]}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Accès</dt><dd className={organization.access_blocked_reason ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600'}>{organization.access_blocked_reason ? 'Bloqué' : 'Actif'}</dd></div>
                  {organization.access_blocked_reason && <div className="rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700">{organization.access_blocked_reason}</div>}
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Création</dt><dd className="font-medium text-slate-800">{formatDate(organization.created_at)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Validation</dt><dd className="font-medium text-slate-800">{formatDate(organization.approved_at)}</dd></div>
                </dl>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-center gap-2"><ReceiptText className="h-5 w-5 text-slate-700" /><h3 className="font-semibold text-slate-900">Abonnement</h3></div>
                {organization.subscription ? <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Statut</span><span className="font-semibold text-slate-800">{organization.subscription.status}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Mensuel</span><span className="font-semibold text-slate-800">{formatAmount(organization.subscription.monthly_amount, organization.subscription.currency || organization.default_currency)}</span></div>
                </div> : <p className="text-sm text-slate-500">Aucun abonnement créé.</p>}
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-slate-700" /><h3 className="font-semibold text-slate-900">Facturation</h3></div>
                {organization.invoices?.length ? <div className="space-y-3">{organization.invoices.slice(0, 5).map((invoice) => <div key={invoice.id} className="rounded-lg bg-slate-50 p-3 text-sm"><div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-800">{invoice.period_label || formatDate(invoice.due_date)}</span><span className="font-semibold text-slate-800">{formatAmount(invoice.amount, invoice.currency)}</span></div><p className="mt-1 text-xs text-slate-500">Échéance : {formatDate(invoice.due_date)} · {invoice.status}</p></div>)}</div> : <p className="text-sm text-slate-500">Aucune facture.</p>}
              </section>
            </aside>
          </div>
        </section>
      </main>
    </div>
  )
}
