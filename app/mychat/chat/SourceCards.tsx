'use client'

/**
 * SourceCards — richer source rendering for Research and My Chat.
 *
 * Shows favicon, title, and domain for each source returned by the
 * Anthropic web_search tool. Shared between ResearchChat and SpaceClient
 * so both surfaces render sources identically.
 */

export interface Source {
  title: string
  url: string
}

interface Props {
  sources: Source[]
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export default function SourceCards({ sources }: Props) {
  if (!sources.length) return null

  return (
    <div className="mt-3 pt-2.5 border-t border-[#F0F0F0]">
      <p className="text-[10px] font-semibold text-[#bbb] uppercase tracking-wide mb-2">
        Sources
      </p>
      <div className="flex flex-col gap-1.5">
        {sources.map((s, i) => {
          const domain = extractDomain(s.url)
          return (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-[#F0F0F0] hover:border-[#E0E0E0] hover:bg-[#FAFAFA] transition-all"
            >
              {/* Favicon */}
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                alt=""
                width={14}
                height={14}
                className="rounded shrink-0 opacity-80"
                onError={e => {
                  e.currentTarget.style.display = 'none'
                }}
              />

              {/* Title + domain */}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[#0D0D0D] truncate group-hover:underline underline-offset-2 leading-snug">
                  {s.title || domain}
                </p>
                <p className="text-[10px] text-[#999] truncate mt-0.5 leading-none">
                  {domain}
                </p>
              </div>

              {/* External link arrow */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                className="shrink-0 text-[#ccc] group-hover:text-[#999] transition-colors"
              >
                <path
                  d="M4 1.5H2A.5.5 0 001.5 2v6a.5.5 0 00.5.5h6A.5.5 0 008.5 8V6M6 1.5h2.5V4M5 5l3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          )
        })}
      </div>
    </div>
  )
}
