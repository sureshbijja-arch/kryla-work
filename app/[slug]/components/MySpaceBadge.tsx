const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kryla.work'

export default function MySpaceBadge() {
  return (
    <a
      href={`${APP_URL}/my-space`}
      title="Manage your Kryla page"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#0D0D0D]/90 backdrop-blur-sm text-white rounded-full pl-2.5 pr-4 py-2 shadow-lg hover:bg-[#0D0D0D] transition-colors group">
      {/* Kryla K mark */}
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10">
        <svg width="12" height="12" viewBox="0 0 22 22" fill="none">
          <line x1="11" y1="2"  x2="11" y2="20" stroke="white"   strokeWidth="3" strokeLinecap="round" />
          <line x1="11" y1="11" x2="3"  y2="3"  stroke="white"   strokeWidth="3" strokeLinecap="round" />
          <line x1="11" y1="11" x2="19" y2="3"  stroke="white"   strokeWidth="3" strokeLinecap="round" />
          <line x1="11" y1="11" x2="19" y2="19" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-xs font-semibold tracking-wide">My Space</span>
    </a>
  )
}
