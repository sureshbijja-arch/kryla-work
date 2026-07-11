interface Props {
  disclaimer: string
  verified:   boolean
}

export default function AdvocateComplianceFooter({ disclaimer }: Props) {
  return (
    <div className="w-full border-t border-[#E5E5E5] bg-[#FAFAFA] px-6 py-6 mt-8">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] text-[#888] leading-relaxed">
          <strong className="font-semibold text-[#555]">Disclaimer (BCI Rules):</strong>{' '}
          {disclaimer}
        </p>
      </div>
    </div>
  )
}
