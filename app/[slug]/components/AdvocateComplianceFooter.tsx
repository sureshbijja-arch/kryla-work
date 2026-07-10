interface Props {
  disclaimer: string
  verified:   boolean
}

export default function AdvocateComplianceFooter({ disclaimer, verified }: Props) {
  return (
    <div className="w-full border-t border-[#E5E5E5] bg-[#FAFAFA] px-6 py-6 mt-8">
      <div className="max-w-3xl mx-auto">
        {verified && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1 rounded-full">
              ✓ Verified advocate
            </span>
          </div>
        )}
        <p className="text-[11px] text-[#888] leading-relaxed">
          <strong className="font-semibold text-[#555]">Disclaimer (BCI Rules):</strong>{' '}
          {disclaimer}
        </p>
      </div>
    </div>
  )
}
