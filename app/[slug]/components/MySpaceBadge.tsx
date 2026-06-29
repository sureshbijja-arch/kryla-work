'use client'

import { useState } from 'react'
import MySpacePanel from './MySpacePanel'

export default function MySpaceBadge({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        title="My Space"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-[#0D0D0D]/90 backdrop-blur-sm text-white rounded-full pl-2.5 pr-4 py-2 shadow-lg hover:bg-[#0D0D0D] transition-colors">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10">
          <svg width="12" height="12" viewBox="0 0 22 22" fill="none">
            <line x1="11" y1="2"  x2="11" y2="20" stroke="white"   strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="3"  y2="3"  stroke="white"   strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="19" y2="3"  stroke="white"   strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="19" y2="19" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-xs font-semibold tracking-wide">My Space</span>
      </button>

      {/* Slide-over panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm shadow-2xl flex flex-col">
            <MySpacePanel slug={slug} onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
