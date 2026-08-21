import { AlertTriangle } from 'lucide-react'

export interface BudgetOverageDetails {
  budget_line: string
  planned: number
  already_consumed: number
  this_amount: number
  would_be_total: number
  overage: number
  currency: string
}

interface BudgetOverageModalProps {
  details: BudgetOverageDetails
  onConfirm: () => void
  onCancel: () => void
  confirming?: boolean
}

function money(value: number, currency: string) {
  return `${value.toLocaleString('fr-FR')} ${currency}`
}

/**
 * Remplace le confirm() natif du navigateur (générique, hors-charte) pour
 * le contrôle budgétaire — une fenêtre visuelle cohérente avec le design
 * de l'application, qui met en évidence les chiffres exacts du dépassement
 * plutôt qu'un simple bloc de texte brut.
 */
export function BudgetOverageModal({ details, onConfirm, onCancel, confirming }: BudgetOverageModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="text-amber-600" size={22} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Dépassement budgétaire</h2>
            <p className="text-xs text-slate-500">Ligne « {details.budget_line} »</p>
          </div>
        </div>

        <div className="mb-5 space-y-2 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm">
          <Row label="Budget prévu" value={money(details.planned, details.currency)} />
          <Row label="Déjà consommé" value={money(details.already_consumed, details.currency)} />
          <Row label="Cette dépense" value={money(details.this_amount, details.currency)} />
          <div className="my-1 border-t border-amber-200" />
          <Row label="Total après approbation" value={money(details.would_be_total, details.currency)} bold />
          <Row label="Dépassement" value={`+ ${money(details.overage, details.currency)}`} bold accent="text-red-600" />
        </div>

        <p className="mb-5 text-sm text-slate-600">
          Vous pouvez approuver quand même en toute connaissance de cause, ou annuler pour
          ajuster la ligne budgétaire avant de continuer.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {confirming ? 'Approbation...' : 'Approuver quand même'}
          </button>
          <button
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${accent ?? 'text-slate-900'}`}>{value}</span>
    </div>
  )
}
