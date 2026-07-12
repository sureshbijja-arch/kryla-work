'use client'

/**
 * LegalEditor — TipTap rich text editor for the Drafting Studio.
 *
 * Capabilities:
 * - Headings h1-h4, bold, italic, lists, blockquote
 * - Inline highlight marks for proofreading (colored underlines via CSS)
 * - Inline citation marks (green/amber/red badges via CSS)
 * - Inline ins/del marks for AI redline (track-changes-style)
 * - Bubble menu on text selection: AI writing actions + Save as clause
 * - Slash command palette for: Continue, Insert clause, Suggest clauses, Brainstorm
 * - Heading outline extraction for the OutlinePanel
 *
 * All ProseMirror and TipTap code runs client-only — import via next/dynamic
 * with ssr:false from DraftingStudio.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import { TextStyle, Color, FontSize, LineHeight } from '@tiptap/extension-text-style'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import { Extension, Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { ProofreadFinding, Citation } from './types'

// ── Text position finder (plain-text offset → ProseMirror pos) ───────────────

function findTextRangesInDoc(
  doc: PMNode,
  searchText: string,
): Array<{ from: number; to: number }> {
  const results: Array<{ from: number; to: number }> = []
  if (!searchText || searchText.trim().length === 0) return results

  // Accumulate text content with position mapping
  const positions: Array<{ char: string; pos: number }> = []
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        positions.push({ char: node.text[i], pos: pos + i })
      }
    }
  })

  const docText = positions.map(p => p.char).join('')
  let searchFrom = 0
  while (searchFrom <= docText.length - searchText.length) {
    const idx = docText.indexOf(searchText, searchFrom)
    if (idx === -1) break
    const from = positions[idx]?.pos
    const to   = positions[idx + searchText.length - 1]?.pos
    if (from !== undefined && to !== undefined) {
      results.push({ from, to: to + 1 })
    }
    searchFrom = idx + 1
  }
  return results
}

// ── Proofread decoration extension ───────────────────────────────────────────

const ProofreadKey = new PluginKey<DecorationSet>('proofreadDecorations')

function buildProofreadDecorations(doc: PMNode, findings: ProofreadFinding[]): DecorationSet {
  if (findings.length === 0) return DecorationSet.empty
  const decos: Decoration[] = []

  for (const finding of findings) {
    const ranges = findTextRangesInDoc(doc, finding.excerpt)
    for (const { from, to } of ranges) {
      decos.push(
        Decoration.inline(from, to, {
          class:             `proofread-mark proofread-${finding.severity}`,
          'data-finding-id': finding.id,
          'data-tip':        finding.message,
        }),
      )
    }
  }

  return DecorationSet.create(doc, decos)
}

function createProofreadExtension(findingsRef: React.MutableRefObject<ProofreadFinding[]>) {
  return Extension.create({
    name: 'proofreadDecorations',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: ProofreadKey,
          state: {
            init: (_, state) =>
              buildProofreadDecorations(state.doc, findingsRef.current),
            apply: (tr, oldSet, _, newState) => {
              if (tr.docChanged || tr.getMeta(ProofreadKey)) {
                return buildProofreadDecorations(newState.doc, findingsRef.current)
              }
              return oldSet.map(tr.mapping, tr.doc)
            },
          },
          props: {
            decorations: (state: import('@tiptap/pm/state').EditorState) => ProofreadKey.getState(state),
          },
        }),
      ]
    },
  })
}

// ── Citation decoration extension ─────────────────────────────────────────────

const CitationKey = new PluginKey<DecorationSet>('citationDecorations')

const STATUS_CLASS: Record<string, string> = {
  verified:     'citation-verified',
  unverifiable: 'citation-warn',
  incorrect:    'citation-error',
  fabricated:   'citation-error',
}

function buildCitationDecorations(doc: PMNode, citations: Citation[]): DecorationSet {
  if (citations.length === 0) return DecorationSet.empty
  const decos: Decoration[] = []

  for (const cit of citations) {
    const ranges = findTextRangesInDoc(doc, cit.excerpt)
    for (const { from, to } of ranges) {
      decos.push(
        Decoration.inline(from, to, {
          class:              `citation-mark ${STATUS_CLASS[cit.status] ?? 'citation-warn'}`,
          'data-citation-id': cit.id,
          'data-status':      cit.status,
          'data-tip':         cit.source,
        }),
      )
    }
  }

  return DecorationSet.create(doc, decos)
}

function createCitationExtension(citationsRef: React.MutableRefObject<Citation[]>) {
  return Extension.create({
    name: 'citationDecorations',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: CitationKey,
          state: {
            init: (_, state) =>
              buildCitationDecorations(state.doc, citationsRef.current),
            apply: (tr, oldSet, _, newState) => {
              if (tr.docChanged || tr.getMeta(CitationKey)) {
                return buildCitationDecorations(newState.doc, citationsRef.current)
              }
              return oldSet.map(tr.mapping, tr.doc)
            },
          },
          props: {
            decorations: state => CitationKey.getState(state),
          },
        }),
      ]
    },
  })
}

// ── InsertionMark and DeletionMark for redline ────────────────────────────────

const InsertionMark = Mark.create({
  name: 'insertion',
  inclusive: true,
  parseHTML() {
    return [{ tag: 'ins.redline-ins' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['ins', mergeAttributes(HTMLAttributes, { class: 'redline-ins' }), 0]
  },
})

const DeletionMark = Mark.create({
  name: 'deletion',
  inclusive: false,
  parseHTML() {
    return [{ tag: 'del.redline-del' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['del', mergeAttributes(HTMLAttributes, { class: 'redline-del' }), 0]
  },
})

// ── Props ─────────────────────────────────────────────────────────────────────

export type MarginPreset = 'normal' | 'narrow' | 'wide'

const MARGIN_PADDING: Record<MarginPreset, string> = {
  normal: '72px 96px',
  narrow: '36px 48px',
  wide:   '96px 144px',
}

export interface LegalEditorProps {
  /** Initial HTML content */
  initialHtml:     string
  /** Fired on every content change with the latest HTML */
  onChange:        (html: string) => void
  /** Fires once the editor is ready — gives the parent access to the editor instance */
  onEditorReady:   (editor: Editor) => void
  /** Proofread findings to overlay as inline highlights */
  findings:        ProofreadFinding[]
  /** Citation check results to overlay as inline flags */
  citations:       Citation[]
  /** Placeholder text shown when editor is empty */
  placeholder?:    string
  /** Whether the editor is read-only */
  readOnly?:       boolean
  /**
   * Bubble menu AI action callback.
   * `from`/`to` are the ProseMirror selection positions so the parent can
   * replace the selection with the AI response using editorInstance.
   */
  onBubbleAction:  (action: string, selectedText: string, from: number, to: number) => Promise<void>
  /** Clause insert callback — asks the parent to open the clause panel */
  onOpenClausePanel: () => void
  /** Zoom level: 1 = 100%. Default 1. */
  zoom?:    number
  /** Page margin preset. Default 'normal'. */
  margin?:  MarginPreset
}

// ── Slash menu state ──────────────────────────────────────────────────────────

interface SlashCmd {
  label:  string
  desc:   string
  action: string | (() => void)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LegalEditor({
  initialHtml,
  onChange,
  onEditorReady,
  findings,
  citations,
  placeholder = 'Start drafting or generate a document above…',
  readOnly = false,
  onBubbleAction,
  onOpenClausePanel,
  zoom   = 1,
  margin = 'normal',
}: LegalEditorProps) {

  // Refs so decoration plugins always see latest values without re-creating
  const findingsRef  = useRef<ProofreadFinding[]>(findings)
  const citationsRef = useRef<Citation[]>(citations)

  // Slash menu state
  const [slashOpen,    setSlashOpen]    = useState(false)
  const [slashPos,     setSlashPos]     = useState({ top: 0, left: 0 })
  const [slashFilter,  setSlashFilter]  = useState('')
  const slashTriggerPos = useRef<number | null>(null)

  // Bubble action loading state
  const [bubbleLoading, setBubbleLoading] = useState<string | null>(null)

  // Manual bubble menu position (shown on text selection)
  const [bubbleMenu, setBubbleMenu] = useState<{ top: number; left: number } | null>(null)

  // Popover for proofread/citation click (simple tooltip approach)
  const [popover, setPopover] = useState<{ x: number; y: number; content: string; findingId?: string } | null>(null)

  // Update refs when props change so plugin picks up new state
  useEffect(() => {
    findingsRef.current = findings
    citationsRef.current = citations
    // Dispatch a no-op transaction to trigger decoration rebuild
    if (editor) {
      editor.view.dispatch(
        editor.state.tr.setMeta(ProofreadKey, true).setMeta(CitationKey, true)
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findings, citations])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading:       { levels: [1, 2, 3, 4] },
        bulletList:    { keepMarks: true },
        orderedList:   { keepMarks: true },
      }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      LineHeight.configure({ types: ['heading', 'paragraph'] }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ inline: false, allowBase64: false }),
      InsertionMark,
      DeletionMark,
      createProofreadExtension(findingsRef),
      createCitationExtension(citationsRef),
    ],
    content:  initialHtml || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    // Detect '/' for slash menu; update bubble menu on selection change
    onTransaction: ({ editor, transaction }) => {
      // Update bubble menu position on any selection or doc change
      const { from, to } = editor.state.selection
      if (from !== to) {
        const coords = editor.view.coordsAtPos(from)
        const editorRect = editor.view.dom.getBoundingClientRect()
        setBubbleMenu({ top: coords.top - editorRect.top - 44, left: Math.max(0, coords.left - editorRect.left) })
      } else {
        setBubbleMenu(null)
      }

      if (!transaction.docChanged) return
      const { selection, doc } = editor.state
      const { $from } = selection
      const node = $from.parent
      if (node.type.name !== 'paragraph' || node.content.size === 0) {
        setSlashOpen(false)
        return
      }
      const text = node.textContent
      if (text === '/') {
        const coords = editor.view.coordsAtPos($from.pos)
        setSlashPos({ top: coords.bottom + 8, left: coords.left })
        setSlashFilter('')
        slashTriggerPos.current = $from.pos - 1
        setSlashOpen(true)
      } else if (text.startsWith('/') && slashOpen) {
        setSlashFilter(text.slice(1).toLowerCase())
      } else {
        setSlashOpen(false)
      }
    },
    editorProps: {
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement
        const findingId  = target.getAttribute('data-finding-id')
        const citationId = target.getAttribute('data-citation-id')
        const tip        = target.getAttribute('data-tip')

        if (findingId || citationId) {
          setPopover({
            x: (event as MouseEvent).clientX,
            y: (event as MouseEvent).clientY,
            content:   tip ?? '',
            findingId: findingId ?? undefined,
          })
          return true
        }
        setPopover(null)
        return false
      },
    },
  }, [readOnly])

  // Fire onEditorReady once
  useEffect(() => {
    if (editor) onEditorReady(editor)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Close slash menu on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSlashOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Slash commands ─────────────────────────────────────────────────────────
  const slashCmds: SlashCmd[] = [
    { label: 'Continue writing',       desc: 'AI continues from cursor',        action: 'continue' },
    { label: 'Brainstorm arguments',   desc: 'Generate legal arguments',         action: 'brainstorm' },
    { label: 'Insert clause',          desc: 'Open clause library',              action: () => {
      setSlashOpen(false)
      onOpenClausePanel()
    }},
    { label: 'Suggest missing clauses', desc: 'AI suggests missing clauses',    action: 'suggest_clauses' },
  ]

  const filteredCmds = slashCmds.filter(c =>
    c.label.toLowerCase().includes(slashFilter) ||
    c.desc.toLowerCase().includes(slashFilter)
  )

  function executeSlashCmd(cmd: SlashCmd) {
    setSlashOpen(false)
    if (!editor) return

    // Remove the '/' character(s) from the document
    const pos = slashTriggerPos.current
    if (pos !== null) {
      const node = editor.state.selection.$from.parent
      const len  = 1 + slashFilter.length
      editor.chain().focus().deleteRange({ from: pos, to: pos + len }).run()
      slashTriggerPos.current = null
    }

    if (typeof cmd.action === 'function') {
      cmd.action()
    } else {
      // Slash commands pass full document HTML as context; no selection range
      onBubbleAction(cmd.action, editor.getText(), 0, 0)
    }
  }

  // ── Bubble menu action ────────────────────────────────────────────────────

  async function handleBubble(action: string) {
    if (!editor || bubbleLoading) return
    const { from, to } = editor.state.selection
    // Use plain text for the API — cleaner than sliced HTML
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    setBubbleLoading(action)
    try {
      await onBubbleAction(action, selectedText, from, to)
    } finally {
      setBubbleLoading(null)
    }
  }

  // ── Save as clause ────────────────────────────────────────────────────────

  function saveAsClause() {
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) return
    // Parent handles the actual save — we expose selected text via a DOM event
    const selected = editor.state.doc.textBetween(from, to, ' ')
    document.dispatchEvent(new CustomEvent('legal-editor:save-clause', { detail: { text: selected } }))
  }

  if (!editor) return null

  return (
    <div className="relative flex-1 flex flex-col legal-editor-root min-h-0" onClick={() => setPopover(null)}>

      {/* ── Bubble menu — shown when text is selected ── */}
      {bubbleMenu && (
        <div
          className="absolute z-[200] flex items-center gap-0.5 bg-[#0D0D0D] rounded-xl px-1.5 py-1 shadow-lg pointer-events-auto"
          style={{ top: bubbleMenu.top, left: bubbleMenu.left }}
          onMouseDown={e => e.preventDefault()}
        >
          {[
            { action: 'rewrite',  label: 'Rewrite'  },
            { action: 'firmer',   label: 'Firmer'   },
            { action: 'simplify', label: 'Simplify' },
            { action: 'explain',  label: 'Explain'  },
          ].map(({ action, label }) => (
            <button
              key={action}
              onClick={() => handleBubble(action)}
              disabled={bubbleLoading !== null}
              className="px-2 py-1 text-[11px] font-semibold text-white rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {bubbleLoading === action ? '…' : label}
            </button>
          ))}
          <div className="w-px h-4 bg-white/20 mx-0.5" />
          <button
            onClick={saveAsClause}
            className="px-2 py-1 text-[11px] font-semibold text-amber-300 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            Save clause
          </button>
        </div>
      )}

      {/* ── Slash command menu ── */}
      {slashOpen && filteredCmds.length > 0 && (
        <div
          className="fixed z-[200] bg-white border border-[#E5E5E5] rounded-xl shadow-xl w-64 py-1"
          style={{ top: slashPos.top, left: slashPos.left }}
        >
          {filteredCmds.map(cmd => (
            <button
              key={cmd.label}
              onClick={() => executeSlashCmd(cmd)}
              className="w-full text-left px-3 py-2.5 hover:bg-[#F5F5F5] transition-colors"
            >
              <p className="text-xs font-semibold text-[#0D0D0D]">{cmd.label}</p>
              <p className="text-[10px] text-[#999]">{cmd.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── Paper-page canvas ── */}
      <div className="flex-1 overflow-y-auto bg-[#EBEBEB] flex justify-center py-8 px-4 legal-canvas-scroll">
        {/* Zoom wrapper — transforms the paper sheet; outer div stays scrollable */}
        <div
          style={{
            transformOrigin: 'top center',
            transform:       `scale(${zoom})`,
            width:           '816px',
            flexShrink:      0,
          }}
        >
          <div
            className="bg-white shadow-[0_2px_16px_rgba(0,0,0,0.12)] legal-paper-page"
            style={{
              minHeight: '1056px',
              padding:   MARGIN_PADDING[margin],
              // Repeating dashed rule every 1056px = page-break guide
              backgroundImage: 'linear-gradient(to bottom, transparent calc(1056px - 1px), #D1D5DB calc(1056px - 1px), #D1D5DB 1056px)',
              backgroundSize:  '100% 1056px',
            }}
          >
            <EditorContent
              editor={editor}
              className="legal-editor-content prose prose-sm max-w-none"
            />
          </div>
        </div>
      </div>

      {/* ── Finding / citation popover ── */}
      {popover && (
        <div
          className="fixed z-[300] bg-[#0D0D0D] text-white text-xs rounded-xl px-3 py-2.5 shadow-xl max-w-xs pointer-events-none"
          style={{ top: popover.y + 10, left: popover.x }}
          onClick={e => e.stopPropagation()}
        >
          {popover.content}
        </div>
      )}

    </div>
  )
}
