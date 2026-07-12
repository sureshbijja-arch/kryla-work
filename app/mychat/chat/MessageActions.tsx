'use client'

/**
 * MessageActions — hover action bar for assistant messages.
 *
 * Shows copy, retry, and edit-and-resend actions. Mounted on each
 * assistant bubble in both My Chat and Research. Visible on hover.
 */

import { useState } from 'react'

interface Props {
  content: string
  /** Called when user wants to retry — parent re-sends the preceding user message */
  onRetry?: () => void
  /** Called when user wants to edit — parent repopulates the input with this text */
  onEdit?: (text: string) => void
  /** Whether to show the retry button (requires a prior user message) */
  showRetry?: boolean
  /** Whether to show the edit button */
  showEdit?: boolean
}

export default function MessageActions({
  content,
  onRetry,
  onEdit,
  showRetry = true,
  showEdit = false,
}: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard not available — silent fail
    }
  }

  return (
    <div className="flex items-center gap-1 mt-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Copy */}
      <button
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy reply'}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-[#999] hover:text-[#0D0D0D] hover:bg-[#F5F5F5] transition-colors"
      >
        {copied ? (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 2.5" stroke="#22C55E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="3.5" y="3.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.1"/>
              <path d="M2 6.5V2A.5.5 0 012.5 1.5H7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
            </svg>
            Copy
          </>
        )}
      </button>

      {/* Retry */}
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          title="Regenerate reply"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-[#999] hover:text-[#0D0D0D] hover:bg-[#F5F5F5] transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5a3.5 3.5 0 106.5-1.8M8 1.5L8 3.5H6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Retry
        </button>
      )}

      {/* Edit prior user message */}
      {showEdit && onEdit && (
        <button
          onClick={() => onEdit(content)}
          title="Edit and resend"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-[#999] hover:text-[#0D0D0D] hover:bg-[#F5F5F5] transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6 1.5l2.5 2.5-5 5H1V6.5l5-5z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Edit
        </button>
      )}
    </div>
  )
}
