'use client'

import { useState } from 'react'

interface Props {
  token:            string
  alreadyWithdrawn: boolean
}

export default function ConsentWithdrawPanel({ token, alreadyWithdrawn }: Props) {
  const [withdrawn, setWithdrawn] = useState(alreadyWithdrawn)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  async function withdraw() {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/consent/withdraw', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok && !data.already_withdrawn) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setWithdrawn(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (withdrawn) {
    return (
      <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-4">
        <p className="text-sm font-semibold text-[#16A34A]">✓ Consent withdrawn</p>
        <p className="text-xs text-[#555] mt-1">
          You will no longer receive WhatsApp messages from this advocate&apos;s office.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3">
        <p className="text-xs text-[#78350F]">
          <strong>Currently active:</strong> You are receiving WhatsApp updates and hearing reminders.
          Withdrawing consent stops all future messages.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}

      <button
        onClick={withdraw}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold disabled:opacity-50 hover:opacity-80 transition-opacity">
        {loading ? 'Withdrawing…' : 'Withdraw WhatsApp consent'}
      </button>

      <p className="text-[10px] text-[#bbb] text-center leading-relaxed">
        DPDP Act 2023 — you have the right to withdraw consent at any time.
        This does not affect your legal matter or your relationship with the advocate.
      </p>
    </div>
  )
}
