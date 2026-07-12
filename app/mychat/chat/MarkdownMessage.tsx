'use client'

/**
 * MarkdownMessage — renders AI reply text as formatted markdown.
 *
 * Used by both the My Chat panel and the Research overlay so both surfaces
 * share the same prose styling. Matches Kryla's monochrome palette.
 */

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  /** The markdown string to render */
  content: string
  /** Extra Tailwind classes applied to the wrapper div */
  className?: string
}

export default function MarkdownMessage({ content, className = '' }: Props) {
  return (
    <div className={`markdown-prose ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Links: open externally, styled to match palette
          a: ({ node: _node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0D0D0D] underline underline-offset-2 hover:opacity-60 transition-opacity"
            />
          ),
          // Code blocks: monospace, subtle bg
          code: ({ node: _node, className: cn, children, ...props }) => {
            const isBlock = cn?.includes('language-')
            return isBlock ? (
              <code
                className="block bg-[#F5F5F5] rounded-xl px-4 py-3 text-[12px] font-mono text-[#0D0D0D] overflow-x-auto whitespace-pre"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="bg-[#F0F0F0] rounded px-1.5 py-0.5 text-[11px] font-mono text-[#0D0D0D]"
                {...props}
              >
                {children}
              </code>
            )
          },
          pre: ({ node: _node, ...props }) => (
            <pre className="my-2 overflow-x-auto" {...props} />
          ),
          // Headings: sized down to fit panel widths
          h1: ({ node: _node, ...props }) => (
            <h1 className="text-base font-bold text-[#0D0D0D] mt-3 mb-1 first:mt-0" {...props} />
          ),
          h2: ({ node: _node, ...props }) => (
            <h2 className="text-sm font-bold text-[#0D0D0D] mt-3 mb-1 first:mt-0" {...props} />
          ),
          h3: ({ node: _node, ...props }) => (
            <h3 className="text-sm font-semibold text-[#0D0D0D] mt-2 mb-0.5 first:mt-0" {...props} />
          ),
          // Paragraphs
          p: ({ node: _node, ...props }) => (
            <p className="text-sm leading-relaxed text-[#0D0D0D] mb-2 last:mb-0" {...props} />
          ),
          // Lists
          ul: ({ node: _node, ...props }) => (
            <ul className="text-sm text-[#0D0D0D] list-disc list-outside pl-4 mb-2 space-y-0.5" {...props} />
          ),
          ol: ({ node: _node, ...props }) => (
            <ol className="text-sm text-[#0D0D0D] list-decimal list-outside pl-4 mb-2 space-y-0.5" {...props} />
          ),
          li: ({ node: _node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          // Bold / italic
          strong: ({ node: _node, ...props }) => (
            <strong className="font-semibold text-[#0D0D0D]" {...props} />
          ),
          em: ({ node: _node, ...props }) => (
            <em className="italic" {...props} />
          ),
          // Blockquote
          blockquote: ({ node: _node, ...props }) => (
            <blockquote
              className="border-l-2 border-[#E5E5E5] pl-3 text-[#666] italic my-2"
              {...props}
            />
          ),
          // Horizontal rule
          hr: ({ node: _node, ...props }) => (
            <hr className="border-none border-t border-[#F0F0F0] my-3" {...props} />
          ),
          // Tables (from remark-gfm)
          table: ({ node: _node, ...props }) => (
            <div className="overflow-x-auto my-2">
              <table className="text-xs w-full border-collapse" {...props} />
            </div>
          ),
          th: ({ node: _node, ...props }) => (
            <th className="px-2 py-1.5 text-left font-semibold text-[#0D0D0D] border-b border-[#E5E5E5]" {...props} />
          ),
          td: ({ node: _node, ...props }) => (
            <td className="px-2 py-1.5 text-[#333] border-b border-[#F5F5F5]" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
