'use client'

/**
 * StatusBar — Word-style footer bar for LegalEditor.
 * Shows live word count, character count, estimated page count, and zoom stepper.
 */

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface Props {
  editor:   Editor | null
  zoom:     number
  onZoom:   (zoom: number) => void
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const PAGE_HEIGHT_PX = 1056  // A4 @ 96dpi

export default function StatusBar({ editor, zoom, onZoom }: Props) {
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [pageCount, setPageCount] = useState(1)

  useEffect(() => {
    if (!editor) return

    function update() {
      const text  = editor!.getText()
      const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
      const chars = text.length
      setWordCount(words)
      setCharCount(chars)

      // Rough page estimate: count paragraphs / content height
      const dom = editor!.view.dom as HTMLElement
      const scrollH = dom.scrollHeight
      setPageCount(Math.max(1, Math.ceil(scrollH / PAGE_HEIGHT_PX)))
    }

    update()
    editor.on('update', update)
    return () => { editor.off('update', update) }
  }, [editor])

  function stepZoom(dir: 1 | -1) {
    const idx = ZOOM_STEPS.findIndex(z => Math.abs(z - zoom) < 0.01)
    const next = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx + dir))]
    if (next !== undefined) onZoom(next)
  }

  return (
    <div className="shrink-0 bg-[#F7F7F7] border-t border-[#E5E5E5] px-4 h-7 flex items-center gap-4 select-none">
      {/* Word / char / page */}
      <span className="text-[10px] text-[#999]">
        {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
      </span>
      <div className="w-px h-3 bg-[#E5E5E5]" />
      <span className="text-[10px] text-[#999]">
        {charCount.toLocaleString()} characters
      </span>
      <div className="w-px h-3 bg-[#E5E5E5]" />
      <span className="text-[10px] text-[#999]">
        {pageCount} {pageCount === 1 ? 'page' : 'pages'}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom stepper */}
      <div className="flex items-center gap-1">
        <button
          onMouseDown={e => { e.preventDefault(); stepZoom(-1) }}
          disabled={zoom <= ZOOM_STEPS[0]}
          className="w-5 h-5 rounded flex items-center justify-center text-[#666] hover:bg-[#E5E5E5] disabled:opacity-30 transition-colors text-[13px] font-medium"
          title="Zoom out"
        >
          −
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); onZoom(1) }}
          className="text-[10px] font-semibold text-[#666] hover:text-[#0D0D0D] w-9 text-center transition-colors"
          title="Reset to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); stepZoom(1) }}
          disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
          className="w-5 h-5 rounded flex items-center justify-center text-[#666] hover:bg-[#E5E5E5] disabled:opacity-30 transition-colors text-[13px] font-medium"
          title="Zoom in"
        >
          ＋
        </button>
      </div>
    </div>
  )
}
