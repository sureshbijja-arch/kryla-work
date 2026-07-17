/**
 * Reusable list-of-cards used inside TileDetailShell bodies: white rounded
 * cards with a tinted icon tile, title, description, and optional badge /
 * chevron. Phase 2 will populate real items (ServicesTab, MessagesTab,
 * etc.) — Phase 1 only needs the presentational shell.
 */

export interface DetailCardItem {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  onClick?: () => void
}

interface DetailCardListProps {
  items: DetailCardItem[]
}

export default function DetailCardList({ items }: DetailCardListProps) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <DetailCard key={i} item={item} />
      ))}
    </div>
  )
}

function DetailCard({ item }: { item: DetailCardItem }) {
  const { icon, title, description, badge, onClick } = item
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-3.5 rounded-2xl bg-white border border-[#EFEFEF] px-4 py-3.5 text-left shadow-sm transition-colors ${
        onClick ? 'hover:border-[#E0E0E0] hover:shadow-md cursor-pointer w-full' : ''
      }`}
    >
      <div className="shrink-0 w-11 h-11 rounded-xl bg-[#FBF3E9] text-mc-accent flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm text-[#0D0D0D] truncate">{title}</p>
          {badge && (
            <span className="shrink-0 text-[10px] font-semibold text-mc-accent bg-[#FBF3E9] rounded-full px-2 py-0.5">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-[#888] mt-0.5 line-clamp-2">{description}</p>
      </div>
      {onClick && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[#ccc]">
          <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </Tag>
  )
}
