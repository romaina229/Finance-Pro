import { useEffect, useState, type FormEvent } from 'react'
import { NavBar } from '../components/NavBar'
import { useOrganization } from '../context/OrganizationContext'
import {
  fetchInvoices,
  payInvoice,
  confirmKkiapayPayment,
  type Invoice,
  type PaymentProvider,
  type KkiapayWidgetConfig,
} from '../services/billing'

const PROVIDERS: { value: PaymentProvider; label: string; recommended?: boolean }[] = [
  { value: 'fedapay', label: 'FedaPay (Mobile Money & carte)', recommended: true },
  { value: 'kkiapay', label: 'Kkiapay (Mobile Money & carte)' },
]

let kkiapayScriptPromise: Promise<void> | null = null

function loadKkiapayScript(): Promise<void> {
  if (window.openKkiapayWidget) return Promise.resolve()
  if (!kkiapayScriptPromise) {
    kkiapayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.kkiapay.me/k.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Impossible de charger le widget Kkiapay.'))
      document.body.appendChild(script)
    })
  }
  return kkiapayScriptPromise
}

declare global {
  interface Window {
    openKkiapayWidget?: (options: Record<string, unknown>) => void
    addSuccessListener?: (cb: (response: { transactionId: string }) => void) => void
    addFailedListener?: (cb: (error: unknown) => void) => void
  }
}

export default function Billing() {
  const { currentOrganization } = useOrganization()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null)
  const [provider, setProvider] = useState<PaymentProvider>('fedapay')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)

  async function load() {
    if (!currentOrganization) return
    setLoading(true)
    setError(null)
    try {
      setInvoices(await fetchInvoices(currentOrganization.id))
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Impossible de charger les factures.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id])

  async function openKkiapayWidgetAndConfirm(
    organizationId: string,
    invoiceId: string,
    paymentId: string,
    widget: KkiapayWidgetConfig
  ) {
    await loadKkiapayScript()

    window.addSuccessListener?.(async (response) => {
      try {
        const result = await confirmKkiapayPayment(
          organizationId,
          invoiceId,
          paymentId,
          response.transactionId
        )
        setPaymentMessage(result.message)
        setPayingInvoice(null)
        await load()
      } catch (err: any) {
        setError(err.response?.data?.message ?? 'La vérification du paiement Kkiapay a échoué.')
      } finally {
        setSubmitting(false)
      }
    })

    window.addFailedListener?.(() => {
      setError('Le paiement Kkiapay a échoué ou a été annulé.')
      setSubmitting(false)
    })

    if (!window.openKkiapayWidget) {
      throw new Error('Le widget Kkiapay est indisponible.')
    }

    window.openKkiapayWidget({
      amount: widget.amount,
      key: widget.public_key,
      sandbox: widget.sandbox,
      phone: phoneNumber,
      position: 'center',
      paymentmethod: ['momo', 'card'],
    })
  }

  async function handlePay(e: FormEvent) {
    e.preventDefault()
    if (!currentOrganization || !payingInvoice) return

    setSubmitting(true)
    setError(null)
    setPaymentMessage(null)

    try {
      const result = await payInvoice(currentOrganization.id, payingInvoice.id, provider, phoneNumber)

      if (result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }

      if (result.widget) {
        await openKkiapayWidgetAndConfirm(
          currentOrganization.id,
          payingInvoice.id,
          result.data.id,
          result.widget
        )
        return
      }

      setPaymentMessage(result.message)
      setPayingInvoice(null)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Le paiement a échoué.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Facturation</h1>
        <p className="mb-6 text-sm text-slate-500">
          Forfait mensuel Finance Pro — échéance le 5 de chaque mois.<br />
          <strong>Note :</strong> actuellement nous sommes en prix promotionnel. À partir du{' '}
          <strong>1er janvier 2027</strong>, l’abonnement mensuel passera à{' '}
          <strong>12 500 FCFA</strong>.
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {paymentMessage && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {paymentMessage}
          </div>
        )}

        {payingInvoice && (
          <form onSubmit={handlePay} className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 font-medium text-slate-900">Payer la facture {payingInvoice.period_label}</h2>
            <p className="mb-4 text-sm text-slate-500">
              Montant : {Number(payingInvoice.amount).toLocaleString('fr-FR')} {payingInvoice.currency}
            </p>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Moyen de paiement</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as PaymentProvider)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} {p.recommended ? '— recommandé' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Numéro de téléphone</label>
              <input
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+229 ..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? 'Envoi...' : 'Payer maintenant'}
              </button>
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Chargement...</p>
          ) : invoices.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Aucune facture pour l’instant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Période</th>
                  <th className="px-4 py-3">Échéance</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{inv.period_label}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.due_date}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {Number(inv.amount).toLocaleString('fr-FR')} {inv.currency}
                    </td>
                    <td className="px-4 py-3">
                      {inv.status === 'paid' ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Payée</span>
                      ) : inv.is_overdue ? (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">En retard</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">En attente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.status === 'pending' && (
                        <button
                          onClick={() => { setPayingInvoice(inv); setPaymentMessage(null); setError(null) }}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          Payer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
