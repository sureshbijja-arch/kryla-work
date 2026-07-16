'use client'

import type { MainTab } from '../SpaceClient'

interface Props {
  activeTab: MainTab
  setTab:    (tab: MainTab) => void
  labels:    Record<MainTab, string>
}

const ICONS: Record<MainTab, React.ReactNode> = {
  chat: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  design: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="16" height="16" rx="2"/>
      <path d="M3 9h16M9 21V9"/>
    </svg>
  ),
  messages: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  schedule: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  plan: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 2a10 10 0 110 20 10 10 0 010-20z"/>
      <polyline points="12,6 12,12 16,14"/>
    </svg>
  ),
}

export default function MyChatTabBar({ activeTab, setTab, labels }: Props) {
  const tabs: MainTab[] = ['chat', 'design', 'messages', 'schedule', 'plan']

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E5E5E5] pb-safe"
      style={{ boxShadow: '0 -1px 0 #E5E5E5' }}>
      <div className="flex">
        {tabs.map(key => {
          const active = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 flex flex-col items-center gap-1 pt-2 pb-1 transition-colors"
              style={{ color: active ? '#F5A623' : '#999' }}
              aria-current={active ? 'page' : undefined}>
              {ICONS[key]}
              <span className="text-[10px] font-semibold leading-none">{labels[key]}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
