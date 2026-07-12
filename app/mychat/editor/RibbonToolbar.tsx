'use client'

/**
 * RibbonToolbar — Microsoft Word-style grouped toolbar for LegalEditor.
 *
 * Four tabs: Home · Insert · Layout · Review
 *
 * Buttons drive editor.chain().focus()... via the TipTap imperative API.
 * Bubble menu and slash commands remain as accelerators on top of this toolbar.
 *
 * New TipTap extensions required (added to LegalEditor.tsx):
 *   @tiptap/extension-underline
 *   @tiptap/extension-text-align
 *   @tiptap/extension-font-family
 *   @tiptap/extension-text-style
 *   @tiptap/extension-table (+ row, cell, header)
 *   @tiptap/extension-image
 */

import { useState, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import type { MarginPreset } from './LegalEditor'
// Table chain methods are available via editor.chain() — no direct import needed

type RibbonTab = 'home' | 'insert' | 'layout' | 'review'

interface Props {
  editor: Editor | null
  /** Called when user clicks Insert > Clause button */
  onInsertClause: () => void
  /** Called when user clicks Review > Proofread */
  onProofread: () => void
  /** Called when user clicks Review > Citations */
  onCitations: () => void
  /** Called when user clicks Review > Accept all redline */
  onAcceptRedline: () => void
  /** Called when user clicks Review > Reject all redline */
  onRejectRedline: () => void
  /** Whether redline is currently showing */
  showRedline: boolean
  /** Count of proofread findings (shows badge) */
  proofFindingCount: number
  /** Count of citations (shows badge) */
  citationCount: number
  /** Current margin preset (for Layout tab) */
  margin: MarginPreset
  /** Called when user changes margin */
  onMarginChange: (m: MarginPreset) => void
  /** Current line-height multiplier (for Layout tab) */
  lineHeight: string
  /** Called when user changes line-height */
  onLineHeightChange: (lh: string) => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function RibbonButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center w-7 h-7 rounded text-[11px] font-semibold transition-colors disabled:opacity-30 ${
        active
          ? 'bg-[#0D0D0D] text-white'
          : 'text-[#444] hover:bg-[#EBEBEB] hover:text-[#0D0D0D]'
      }`}
    >
      {children}
    </button>
  )
}

function RibbonDivider() {
  return <div className="w-px h-5 bg-[#E5E5E5] mx-1 shrink-0" />
}

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-0.5 flex-wrap">
        {children}
      </div>
      <span className="text-[9px] text-[#bbb] font-medium uppercase tracking-wide leading-none">{label}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RibbonToolbar({
  editor,
  onInsertClause,
  onProofread,
  onCitations,
  onAcceptRedline,
  onRejectRedline,
  showRedline,
  proofFindingCount,
  citationCount,
  margin,
  onMarginChange,
  lineHeight,
  onLineHeightChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<RibbonTab>('home')
  const [showFontMenu, setShowFontMenu] = useState(false)
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false)
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)
  const [showTextColorMenu, setShowTextColorMenu] = useState(false)
  const [showHighlightMenu, setShowHighlightMenu] = useState(false)
  const fontBtnRef = useRef<HTMLButtonElement>(null)
  const headingBtnRef = useRef<HTMLButtonElement>(null)

  const FONTS = [
    { label: 'Default',     value: '' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Georgia',     value: 'Georgia' },
    { label: 'Arial',       value: 'Arial' },
    { label: 'Helvetica',   value: 'Helvetica' },
    { label: 'Courier New', value: 'Courier New' },
  ]

  const HEADINGS: { label: string; level?: 1 | 2 | 3 | 4 }[] = [
    { label: 'Normal',    level: undefined },
    { label: 'Heading 1', level: 1 },
    { label: 'Heading 2', level: 2 },
    { label: 'Heading 3', level: 3 },
    { label: 'Heading 4', level: 4 },
  ]

  const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '24', '36', '48', '72']

  const TEXT_COLORS = [
    { label: 'Default',   value: '' },
    { label: 'Black',     value: '#0D0D0D' },
    { label: 'Dark gray', value: '#444444' },
    { label: 'Gray',      value: '#888888' },
    { label: 'Red',       value: '#DC2626' },
    { label: 'Orange',    value: '#F5A623' },
    { label: 'Blue',      value: '#2563EB' },
    { label: 'Green',     value: '#16A34A' },
    { label: 'Purple',    value: '#7C3AED' },
    { label: 'Brown',     value: '#92400E' },
  ]

  const HIGHLIGHT_COLORS = [
    { label: 'None',   value: '' },
    { label: 'Yellow', value: '#FEF08A' },
    { label: 'Green',  value: '#BBF7D0' },
    { label: 'Blue',   value: '#BFDBFE' },
    { label: 'Pink',   value: '#FBCFE8' },
    { label: 'Orange', value: '#FED7AA' },
    { label: 'Purple', value: '#DDD6FE' },
    { label: 'Gray',   value: '#E5E5E5' },
  ]

  const LINE_HEIGHTS = [
    { label: 'Single',  value: '1' },
    { label: '1.15',    value: '1.15' },
    { label: '1.5',     value: '1.5' },
    { label: 'Double',  value: '2' },
  ]

  function setHeading(level?: 1 | 2 | 3 | 4) {
    if (!editor) return
    if (level) {
      editor.chain().focus().toggleHeading({ level }).run()
    } else {
      editor.chain().focus().setParagraph().run()
    }
    setShowHeadingMenu(false)
  }

  function setFont(value: string) {
    if (!editor) return
    if (value) {
      editor.chain().focus().setFontFamily(value).run()
    } else {
      editor.chain().focus().unsetFontFamily().run()
    }
    setShowFontMenu(false)
  }

  function setFontSize(value: string) {
    if (!editor) return
    if (value) {
      editor.chain().focus().setFontSize(`${value}pt`).run()
    } else {
      editor.chain().focus().unsetFontSize().run()
    }
    setShowFontSizeMenu(false)
  }

  function setTextColor(value: string) {
    if (!editor) return
    if (value) {
      editor.chain().focus().setColor(value).run()
    } else {
      editor.chain().focus().unsetColor().run()
    }
    setShowTextColorMenu(false)
  }

  function setHighlightColor(value: string) {
    if (!editor) return
    if (value) {
      editor.chain().focus().setHighlight({ color: value }).run()
    } else {
      editor.chain().focus().unsetHighlight().run()
    }
    setShowHighlightMenu(false)
  }

  function applyLineHeight(value: string) {
    if (!editor) return
    editor.chain().focus().setLineHeight(value).run()
    onLineHeightChange(value)
  }

  function insertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  function insertImage() {
    const url = window.prompt('Image URL:')
    if (url) editor?.chain().focus().setImage({ src: url }).run()
  }

  const currentFontFamily = editor?.getAttributes('textStyle')?.fontFamily as string | undefined
  const currentFontSize   = editor?.getAttributes('textStyle')?.fontSize   as string | undefined
  const currentTextColor  = editor?.getAttributes('textStyle')?.color       as string | undefined
  const currentHeading    = editor?.getAttributes('heading')?.level         as number | undefined

  const headingLabel   = currentHeading ? `Heading ${currentHeading}` : 'Normal'
  const fontSizeLabel  = currentFontSize ? currentFontSize.replace('pt', '') : '—'

  return (
    <div className="bg-[#F5F5F5] border-b border-[#E5E5E5] shrink-0 select-none">
      {/* ── Ribbon tabs ── */}
      <div className="flex items-center border-b border-[#E0E0E0] px-3 pt-1 gap-0.5">
        {(['home', 'insert', 'layout', 'review'] as RibbonTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 text-[11px] font-semibold capitalize rounded-t transition-colors ${
              activeTab === tab
                ? 'bg-white text-[#0D0D0D] border border-b-white border-[#E0E0E0] -mb-px relative z-10'
                : 'text-[#666] hover:text-[#0D0D0D]'
            }`}
          >
            {tab}
            {tab === 'review' && (proofFindingCount > 0 || citationCount > 0 || showRedline) && (
              <span className="ml-1 inline-flex w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>
        ))}
      </div>

      {/* ── Ribbon panel ── */}
      <div className="bg-white border-b border-[#E0E0E0] px-3 py-1.5 flex items-start gap-3 overflow-x-auto">

        {/* ── HOME ── */}
        {activeTab === 'home' && (
          <>
            {/* Font family */}
            <RibbonGroup label="Font">
              <div className="relative">
                <button
                  ref={fontBtnRef}
                  onMouseDown={e => { e.preventDefault(); setShowFontMenu(v => !v) }}
                  className="h-7 px-2 text-[11px] font-medium text-[#333] border border-[#E5E5E5] rounded hover:border-[#0D0D0D] transition-colors flex items-center gap-1 min-w-[110px] justify-between"
                >
                  <span className="truncate">{currentFontFamily || 'Default'}</span>
                  <svg width="8" height="5" viewBox="0 0 8 5" fill="none" className="shrink-0">
                    <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
                {showFontMenu && (
                  <div className="absolute top-full left-0 mt-0.5 z-50 bg-white border border-[#E5E5E5] rounded-xl shadow-lg w-44 py-1">
                    {FONTS.map(f => (
                      <button
                        key={f.value}
                        onMouseDown={e => { e.preventDefault(); setFont(f.value) }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#F5F5F5] transition-colors ${
                          (f.value === '' && !currentFontFamily) || f.value === currentFontFamily
                            ? 'font-semibold text-[#0D0D0D]'
                            : 'text-[#444]'
                        }`}
                        style={{ fontFamily: f.value || 'inherit' }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </RibbonGroup>

            {/* Font size */}
            <RibbonGroup label="Size">
              <div className="relative">
                <button
                  onMouseDown={e => { e.preventDefault(); setShowFontSizeMenu(v => !v); setShowFontMenu(false); setShowHeadingMenu(false); setShowTextColorMenu(false); setShowHighlightMenu(false) }}
                  className="h-7 px-2 text-[11px] font-medium text-[#333] border border-[#E5E5E5] rounded hover:border-[#0D0D0D] transition-colors flex items-center gap-1 min-w-[52px] justify-between"
                >
                  <span>{fontSizeLabel}</span>
                  <svg width="8" height="5" viewBox="0 0 8 5" fill="none" className="shrink-0">
                    <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
                {showFontSizeMenu && (
                  <div className="absolute top-full left-0 mt-0.5 z-50 bg-white border border-[#E5E5E5] rounded-xl shadow-lg w-20 py-1 max-h-48 overflow-y-auto">
                    {FONT_SIZES.map(sz => (
                      <button
                        key={sz}
                        onMouseDown={e => { e.preventDefault(); setFontSize(sz) }}
                        className={`w-full text-left px-3 py-1 text-[11px] hover:bg-[#F5F5F5] transition-colors ${
                          currentFontSize === `${sz}pt` ? 'font-semibold text-[#0D0D0D]' : 'text-[#444]'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </RibbonGroup>

            <RibbonDivider />

            {/* Text style */}
            <RibbonGroup label="Style">
              <div className="relative">
                <button
                  ref={headingBtnRef}
                  onMouseDown={e => { e.preventDefault(); setShowHeadingMenu(v => !v) }}
                  className="h-7 px-2 text-[11px] font-medium text-[#333] border border-[#E5E5E5] rounded hover:border-[#0D0D0D] transition-colors flex items-center gap-1 min-w-[90px] justify-between"
                >
                  {headingLabel}
                  <svg width="8" height="5" viewBox="0 0 8 5" fill="none" className="shrink-0">
                    <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
                {showHeadingMenu && (
                  <div className="absolute top-full left-0 mt-0.5 z-50 bg-white border border-[#E5E5E5] rounded-xl shadow-lg w-36 py-1">
                    {HEADINGS.map(h => (
                      <button
                        key={h.label}
                        onMouseDown={e => { e.preventDefault(); setHeading(h.level) }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-[#F5F5F5] transition-colors ${
                          (!currentHeading && !h.level) || currentHeading === h.level
                            ? 'font-semibold text-[#0D0D0D]'
                            : 'text-[#444]'
                        }`}
                        style={{
                          fontSize: h.level === 1 ? '14px' : h.level === 2 ? '13px' : h.level === 3 ? '12px' : '11px',
                          fontWeight: h.level ? 'bold' : 'normal',
                        }}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </RibbonGroup>

            <RibbonDivider />

            {/* Bold / Italic / Underline / Strikethrough */}
            <RibbonGroup label="Format">
              <RibbonButton
                onClick={() => editor?.chain().focus().toggleBold().run()}
                active={editor?.isActive('bold')}
                title="Bold (Ctrl+B)"
              >
                <span className="font-bold text-[13px]">B</span>
              </RibbonButton>
              <RibbonButton
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                active={editor?.isActive('italic')}
                title="Italic (Ctrl+I)"
              >
                <span className="italic text-[13px]">I</span>
              </RibbonButton>
              <RibbonButton
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                active={editor?.isActive('underline')}
                title="Underline (Ctrl+U)"
              >
                <span className="underline text-[13px]">U</span>
              </RibbonButton>
              <RibbonButton
                onClick={() => editor?.chain().focus().toggleStrike().run()}
                active={editor?.isActive('strike')}
                title="Strikethrough"
              >
                <span className="line-through text-[13px]">S</span>
              </RibbonButton>
              <RibbonButton
                onClick={() => editor?.chain().focus().toggleHighlight().run()}
                active={editor?.isActive('highlight')}
                title="Highlight"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 9l2-2 4-4-2-2-4 4-2 2h2z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                  <path d="M1 11h10" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </RibbonButton>
            </RibbonGroup>

            <RibbonDivider />

            {/* Text color + Highlight color */}
            <RibbonGroup label="Color">
              {/* Text color swatch */}
              <div className="relative">
                <button
                  onMouseDown={e => { e.preventDefault(); setShowTextColorMenu(v => !v); setShowHighlightMenu(false); setShowFontMenu(false); setShowFontSizeMenu(false); setShowHeadingMenu(false) }}
                  title="Text color"
                  className="flex flex-col items-center justify-center w-7 h-7 rounded hover:bg-[#EBEBEB] transition-colors"
                >
                  <span className="text-[12px] font-bold text-[#0D0D0D] leading-none">A</span>
                  <div className="w-4 h-1 rounded-sm mt-0.5" style={{ background: currentTextColor || '#0D0D0D' }} />
                </button>
                {showTextColorMenu && (
                  <div className="absolute top-full left-0 mt-0.5 z-50 bg-white border border-[#E5E5E5] rounded-xl shadow-lg p-2 w-[132px]">
                    <p className="text-[9px] font-semibold text-[#bbb] uppercase tracking-wide mb-1.5 px-0.5">Text color</p>
                    <div className="grid grid-cols-5 gap-1">
                      {TEXT_COLORS.map(c => (
                        <button
                          key={c.value}
                          onMouseDown={e => { e.preventDefault(); setTextColor(c.value) }}
                          title={c.label}
                          className="w-5 h-5 rounded border border-[#E5E5E5] hover:scale-110 transition-transform"
                          style={{ background: c.value || '#fff' }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Highlight color swatch */}
              <div className="relative">
                <button
                  onMouseDown={e => { e.preventDefault(); setShowHighlightMenu(v => !v); setShowTextColorMenu(false); setShowFontMenu(false); setShowFontSizeMenu(false); setShowHeadingMenu(false) }}
                  title="Highlight color"
                  className="flex flex-col items-center justify-center w-7 h-7 rounded hover:bg-[#EBEBEB] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 9l2-2 4-4-2-2-4 4-2 2h2z" stroke="#0D0D0D" strokeWidth="1.1" strokeLinejoin="round"/>
                    <path d="M1 11h10" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                {showHighlightMenu && (
                  <div className="absolute top-full left-0 mt-0.5 z-50 bg-white border border-[#E5E5E5] rounded-xl shadow-lg p-2 w-[104px]">
                    <p className="text-[9px] font-semibold text-[#bbb] uppercase tracking-wide mb-1.5 px-0.5">Highlight</p>
                    <div className="grid grid-cols-4 gap-1">
                      {HIGHLIGHT_COLORS.map(c => (
                        <button
                          key={c.value}
                          onMouseDown={e => { e.preventDefault(); setHighlightColor(c.value) }}
                          title={c.label}
                          className="w-5 h-5 rounded border border-[#E5E5E5] hover:scale-110 transition-transform"
                          style={{ background: c.value || 'transparent' }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </RibbonGroup>

            <RibbonDivider />

            {/* Alignment */}
            <RibbonGroup label="Align">
              <RibbonButton
                onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                active={editor?.isActive({ textAlign: 'left' })}
                title="Align left"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 3h10M1 6h7M1 9h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </RibbonButton>
              <RibbonButton
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                active={editor?.isActive({ textAlign: 'center' })}
                title="Center"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 3h10M2.5 6h7M1 9h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </RibbonButton>
              <RibbonButton
                onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                active={editor?.isActive({ textAlign: 'right' })}
                title="Align right"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 3h10M4 6h7M1 9h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </RibbonButton>
              <RibbonButton
                onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
                active={editor?.isActive({ textAlign: 'justify' })}
                title="Justify"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 3h10M1 6h10M1 9h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </RibbonButton>
            </RibbonGroup>

            <RibbonDivider />

            {/* Lists */}
            <RibbonGroup label="Lists">
              <RibbonButton
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                active={editor?.isActive('bulletList')}
                title="Bullet list"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="2" cy="4" r="1" fill="currentColor"/>
                  <circle cx="2" cy="7.5" r="1" fill="currentColor"/>
                  <circle cx="2" cy="11" r="1" fill="currentColor"/>
                  <path d="M5 4h7M5 7.5h7M5 11h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </RibbonButton>
              <RibbonButton
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                active={editor?.isActive('orderedList')}
                title="Numbered list"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M1.5 2.5h1.5v3M1.5 5.5h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1.5 8l1.5-.5a1 1 0 010 2H1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 3.5h7M5 7.5h7M5 11.5h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </RibbonButton>
              <RibbonButton
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                active={editor?.isActive('blockquote')}
                title="Blockquote"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 3.5C2 3 2.5 2.5 3 2.5h2.5v3H3L2 7V3.5zM7.5 3.5c0-.5.5-1 1-1H11v3H9l-1.5 1.5V3.5z" stroke="currentColor" strokeWidth="1.1"/>
                </svg>
              </RibbonButton>
            </RibbonGroup>

            <RibbonDivider />

            {/* Undo / Redo */}
            <RibbonGroup label="History">
              <RibbonButton
                onClick={() => editor?.chain().focus().undo().run()}
                disabled={!editor?.can().undo()}
                title="Undo (Ctrl+Z)"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 5a4.5 4.5 0 108 2.2M1.5 1.5V5H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </RibbonButton>
              <RibbonButton
                onClick={() => editor?.chain().focus().redo().run()}
                disabled={!editor?.can().redo()}
                title="Redo (Ctrl+Y)"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10.5 5a4.5 4.5 0 10-8 2.2M10.5 1.5V5H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </RibbonButton>
            </RibbonGroup>
          </>
        )}

        {/* ── INSERT ── */}
        {activeTab === 'insert' && (
          <>
            <RibbonGroup label="Clause">
              <button
                onMouseDown={e => { e.preventDefault(); onInsertClause() }}
                className="flex items-center gap-1.5 px-3 py-1.5 h-7 text-[11px] font-semibold text-[#333] border border-[#E5E5E5] rounded hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M4 5h4M4 8h2.5M6 2v3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                </svg>
                Insert clause
              </button>
            </RibbonGroup>

            <RibbonDivider />

            <RibbonGroup label="Table">
              <button
                onMouseDown={e => { e.preventDefault(); insertTable() }}
                className="flex items-center gap-1.5 px-3 py-1.5 h-7 text-[11px] font-semibold text-[#333] border border-[#E5E5E5] rounded hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.1"/>
                  <path d="M1 4h10M1 7.5h10M4 1v10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                Table
              </button>
              {editor?.isActive('table') && (
                <div className="flex gap-0.5 ml-1">
                  <RibbonButton
                    onClick={() => editor?.chain().focus().addColumnBefore().run()}
                    title="Add column before"
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <rect x="5" y="1" width="5" height="9" rx="0.8" stroke="currentColor" strokeWidth="1"/>
                      <path d="M2.5 4v3M1 5.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                    </svg>
                  </RibbonButton>
                  <RibbonButton
                    onClick={() => editor?.chain().focus().deleteColumn().run()}
                    title="Delete column"
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <rect x="5" y="1" width="5" height="9" rx="0.8" stroke="currentColor" strokeWidth="1"/>
                      <path d="M1.5 4l3 3M4.5 4l-3 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                    </svg>
                  </RibbonButton>
                  <RibbonButton
                    onClick={() => editor?.chain().focus().addRowAfter().run()}
                    title="Add row after"
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <rect x="1" y="1" width="9" height="5" rx="0.8" stroke="currentColor" strokeWidth="1"/>
                      <path d="M4 8.5h3M5.5 7v3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                    </svg>
                  </RibbonButton>
                  <RibbonButton
                    onClick={() => editor?.chain().focus().deleteRow().run()}
                    title="Delete row"
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <rect x="1" y="1" width="9" height="5" rx="0.8" stroke="currentColor" strokeWidth="1"/>
                      <path d="M3.5 7.5l4 4M7.5 7.5l-4 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                    </svg>
                  </RibbonButton>
                  <RibbonButton
                    onClick={() => editor?.chain().focus().deleteTable().run()}
                    title="Delete table"
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <rect x="1" y="1" width="9" height="9" rx="0.8" stroke="currentColor" strokeWidth="1"/>
                      <path d="M3 3l5 5M8 3L3 8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                    </svg>
                  </RibbonButton>
                </div>
              )}
            </RibbonGroup>

            <RibbonDivider />

            <RibbonGroup label="Image">
              <button
                onMouseDown={e => { e.preventDefault(); insertImage() }}
                className="flex items-center gap-1.5 px-3 py-1.5 h-7 text-[11px] font-semibold text-[#333] border border-[#E5E5E5] rounded hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="2" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.1"/>
                  <circle cx="4" cy="5" r="1" stroke="currentColor" strokeWidth="1"/>
                  <path d="M1 9l3-3 2 2 2-2.5L11 9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Image
              </button>
            </RibbonGroup>

            <RibbonDivider />

            <RibbonGroup label="Break">
              <button
                onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setHardBreak().run() }}
                className="flex items-center gap-1.5 px-3 py-1.5 h-7 text-[11px] font-semibold text-[#333] border border-[#E5E5E5] rounded hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6h10M4 3l-3 3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Line break
              </button>
            </RibbonGroup>
          </>
        )}

        {/* ── LAYOUT ── */}
        {activeTab === 'layout' && (
          <>
            {/* Margins */}
            <RibbonGroup label="Margins">
              {(['normal', 'narrow', 'wide'] as MarginPreset[]).map(m => (
                <button
                  key={m}
                  onMouseDown={e => { e.preventDefault(); onMarginChange(m) }}
                  className={`px-2.5 py-1 h-7 text-[11px] font-semibold rounded border transition-colors capitalize ${
                    margin === m
                      ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]'
                      : 'text-[#444] border-[#E5E5E5] hover:border-[#0D0D0D] hover:text-[#0D0D0D]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </RibbonGroup>

            <RibbonDivider />

            {/* Line spacing */}
            <RibbonGroup label="Line spacing">
              {LINE_HEIGHTS.map(lh => (
                <button
                  key={lh.value}
                  onMouseDown={e => { e.preventDefault(); applyLineHeight(lh.value) }}
                  className={`px-2.5 py-1 h-7 text-[11px] font-semibold rounded border transition-colors ${
                    lineHeight === lh.value
                      ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]'
                      : 'text-[#444] border-[#E5E5E5] hover:border-[#0D0D0D] hover:text-[#0D0D0D]'
                  }`}
                >
                  {lh.label}
                </button>
              ))}
            </RibbonGroup>
          </>
        )}

        {/* ── REVIEW ── */}
        {activeTab === 'review' && (
          <>
            <RibbonGroup label="Proofread">
              <button
                onMouseDown={e => { e.preventDefault(); onProofread() }}
                className={`flex items-center gap-1.5 px-3 py-1.5 h-7 text-[11px] font-semibold border rounded transition-colors ${
                  proofFindingCount > 0
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'text-[#333] border-[#E5E5E5] hover:border-[#0D0D0D] hover:text-[#0D0D0D]'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M6 4v2.5M6 8v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                {proofFindingCount > 0 ? `${proofFindingCount} issues` : 'Proofread'}
              </button>
            </RibbonGroup>

            <RibbonDivider />

            <RibbonGroup label="Citations">
              <button
                onMouseDown={e => { e.preventDefault(); onCitations() }}
                className={`flex items-center gap-1.5 px-3 py-1.5 h-7 text-[11px] font-semibold border rounded transition-colors ${
                  citationCount > 0
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'text-[#333] border-[#E5E5E5] hover:border-[#0D0D0D] hover:text-[#0D0D0D]'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 2h4l3 3v5a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.1"/>
                  <path d="M7 2v3h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                </svg>
                {citationCount > 0 ? `${citationCount} citations` : 'Check citations'}
              </button>
            </RibbonGroup>

            <RibbonDivider />

            <RibbonGroup label="Track changes">
              {showRedline ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#666] mr-1">Showing changes</span>
                  <button
                    onMouseDown={e => { e.preventDefault(); onAcceptRedline() }}
                    className="px-2.5 py-1 h-7 text-[10px] font-semibold bg-[#22C55E] text-white rounded hover:opacity-80 transition-opacity"
                  >
                    Accept all
                  </button>
                  <button
                    onMouseDown={e => { e.preventDefault(); onRejectRedline() }}
                    className="px-2.5 py-1 h-7 text-[10px] font-semibold bg-[#E5E5E5] text-[#444] rounded hover:bg-[#d5d5d5] transition-colors"
                  >
                    Reject all
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-[#999] py-1">No tracked changes</span>
              )}
            </RibbonGroup>
          </>
        )}

      </div>
    </div>
  )
}
