'use client'

/**
 * OutlinePanel — derives a heading-based table of contents from the TipTap
 * editor and lets the user click to scroll to each section.
 */

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface Heading {
  level:  number
  text:   string
  id:     string
}

interface Props {
  editor: Editor | null
}

export default function OutlinePanel({ editor }: Props) {
  const [headings, setHeadings] = useState<Heading[]>([])

  useEffect(() => {
    if (!editor) return

    function update() {
      const hs: Heading[] = []
      editor!.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          hs.push({
            level: node.attrs.level as number,
            text:  node.textContent,
            id:    `heading-${pos}`,
          })
        }
      })
      setHeadings(hs)
    }

    update()
    editor.on('update', update)
    return () => { editor.off('update', update) }
  }, [editor])

  function scrollTo(text: string) {
    if (!editor) return
    // Find the heading in the doc and set the selection there, then scroll
    let found: number | null = null
    editor.state.doc.descendants((node, pos) => {
      if (found !== null) return false
      if (node.type.name === 'heading' && node.textContent === text) {
        found = pos
      }
    })
    if (found !== null) {
      editor.chain().focus().setTextSelection(found + 1).run()
      // Scroll the DOM into view
      const editorEl = editor.view.dom
      const allHeadings = editorEl.querySelectorAll('h1,h2,h3,h4,h5,h6')
      for (const el of allHeadings) {
        if (el.textContent === text) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          break
        }
      }
    }
  }

  if (headings.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-[11px] text-[#bbb] text-center leading-relaxed">
          No headings yet.<br />Use H1–H3 to build an outline.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {headings.map((h, i) => (
        <button
          key={i}
          onClick={() => scrollTo(h.text)}
          className="w-full text-left px-3 py-1.5 hover:bg-[#F5F5F5] transition-colors group"
          style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
        >
          <span className="text-[10px] font-bold text-[#bbb] mr-1.5">H{h.level}</span>
          <span className="text-[11px] text-[#0D0D0D] group-hover:text-[#333] truncate">{h.text || '(empty)'}</span>
        </button>
      ))}
    </div>
  )
}
