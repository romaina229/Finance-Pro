import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'

export default function AccessBlockedOverlay() {
  const [reason, setReason] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handler(e: Event) {
      setReason((e as CustomEvent<string>).detail)
    }
    window.addEventListener('ong-finance-pro:access-blocked', handler)
    return () => window.removeEventListener('ong-finance-pro:access-blocked', handler)
  }, [])

  if (!reason) return null

  const isBillingIssue = reason.toLowerCase().includes('forfait') || reason.toLowerCase().includes('facture')

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <Lock className="text-red-600" size={26} />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Accès bloqué</h2>
        <p className="mb-6 text-sm text-slate-600">{reason}</p>
        <div className="flex flex-col gap-2">
          {isBillingIssue && (
            <button
              onClick={() => {
                setReason(null)
                navigate('/billing')
              }}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Régler ma facture
            </button>
          )}
          <button
            onClick={() => setReason(null)}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
