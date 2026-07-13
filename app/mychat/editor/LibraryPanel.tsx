'use client'

/**
 * LibraryPanel — generalized studio content library browser.
 * Replaces ExercisePanel (physio) for all archetypes.
 *
 * Used when `studio_archetypes.has_library = true`.
 * Item shape: studio_library (id, category, name, description, instructions, meta, tags, is_system).
 * API: /api/mychat/studio/library
 *
 * Props:
 *   providerId      — for API calls
 *   persona         — filters to correct persona library
 *   libraryLabel    — display name from archetype ('Exercises' | 'Interventions' | etc.)
 *   categories      — ordered list of category keys from persona studio_config.library_categories
 *   selectedItems   — currently selected items (for the program/plan form field)
 *   onInsertItem    — called when user clicks + on an item
 *   onRemoveItem    — called when user clicks − on a selected item
 *   onSaveItem      — save a custom item to the provider's library
 *   onDeleteItem    — delete a provider item
 */

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LibraryItem {
  id:           string
  provider_id:  string | null
  persona:      string
  category:     string
  name:         string
  description:  string
  instructions: string
  meta:         Record<string, unknown>
  media_url:    string | null
  is_system:    boolean
  tags:         string[]
}

export interface LibraryItemEntry {
  item_id?:     string
  name:         string
  instructions: string
  meta:         Record<string, unknown>
  /** Optional overrides from the item row for display purposes */
  custom_label?: string
}

interface Props {
  providerId:    string
  persona:       string
  libraryLabel:  string
  categories:    string[]
  selectedItems: LibraryItemEntry[]
  onInsertItem:  (item: LibraryItem) => void
  onRemoveItem:  (index: number) => void
  onSaveItem?:   (category: string, name: string, instructions: string) => Promise<void>
  onDeleteItem?: (itemId: string) => Promise<void>
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function LibraryPanel({
  providerId,
  persona,
  libraryLabel,
  categories,
  selectedItems,
  onInsertItem,
  onRemoveItem,
  onSaveItem,
  onDeleteItem,
}: Props) {
  const [items,        setItems]        = useState<LibraryItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [category,     setCategory]     = useState<string>('all')
  const [expanded,     setExpanded]     = useState<string | null>(null)
  const [tab,          setTab]          = useState<'library' | 'selected'>('library')
  const [saving,       setSaving]       = useState(false)
  const [showAddForm,  setShowAddForm]  = useState(false)
  const [addName,      setAddName]      = useState('')
  const [addCategory,  setAddCategory]  = useState(categories[0] ?? 'general')
  const [addInstr,     setAddInstr]     = useState('')

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ providerId, persona })
      if (category && category !== 'all') params.set('category', category)
      if (search.trim()) params.set('q', search.trim())
      const res = await fetch(`/api/mychat/studio/library?${params}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [providerId, persona, category, search])

  useEffect(() => { loadItems() }, [loadItems])

  const handleSave = async () => {
    if (!addName.trim() || !onSaveItem) return
    setSaving(true)
    try {
      await onSaveItem(addCategory, addName.trim(), addInstr.trim())
      setAddName(''); setAddInstr(''); setShowAddForm(false)
      await loadItems()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!onDeleteItem || !confirm('Delete this item?')) return
    await onDeleteItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const isSelected = (id: string) => selectedItems.some(s => s.item_id === id)

  // Category display name — capitalise and replace underscores
  const catLabel = (key: string) => key === 'all' ? `All ${libraryLabel}` : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="flex flex-col h-full text-sm">

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-700 shrink-0">
        {(['library', 'selected'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === t ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
          >
            {t === 'library' ? libraryLabel : `Selected (${selectedItems.length})`}
          </button>
        ))}
      </div>

      {tab === 'library' ? (
        <>
          {/* Search + category filter */}
          <div className="p-2 space-y-1.5 shrink-0 border-b border-zinc-100 dark:border-zinc-700">
            <input
              type="text"
              placeholder={`Search ${libraryLabel.toLowerCase()}…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none"
            >
              <option value="all">All</option>
              {categories.map(c => (
                <option key={c} value={c}>{catLabel(c)}</option>
              ))}
              <option value="member">My {libraryLabel}</option>
            </select>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <p className="text-xs text-zinc-400 text-center py-6">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-6">No items found</p>
            ) : items.map(item => (
              <div key={item.id} className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-750"
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                >
                  <span className="flex-1 font-medium text-zinc-800 dark:text-zinc-100 text-xs leading-snug">{item.name}</span>
                  <div className="flex gap-1 shrink-0">
                    {!item.is_system && onDeleteItem && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(item.id) }}
                        className="px-1.5 py-0.5 text-[10px] text-red-400 hover:text-red-600 rounded"
                        title="Delete"
                      >✕</button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); onInsertItem(item) }}
                      disabled={isSelected(item.id)}
                      className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${isSelected(item.id) ? 'bg-zinc-100 text-zinc-400 cursor-default dark:bg-zinc-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300'}`}
                    >
                      {isSelected(item.id) ? '✓' : '+'}
                    </button>
                  </div>
                </div>
                {expanded === item.id && (
                  <div className="px-3 pb-3 text-[11px] text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-700 pt-2 space-y-1">
                    {item.description && <p>{item.description}</p>}
                    {item.instructions && <p className="whitespace-pre-line">{item.instructions}</p>}
                    {Object.entries(item.meta ?? {}).filter(([, v]) => v != null).map(([k, v]) => (
                      <p key={k} className="text-[10px] text-zinc-400">{k.replace(/_/g, ' ')}: {String(v)}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add custom item */}
          {onSaveItem && (
            <div className="p-2 border-t border-zinc-100 dark:border-zinc-700 shrink-0">
              {showAddForm ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Name"
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none"
                  />
                  <select
                    value={addCategory}
                    onChange={e => setAddCategory(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{catLabel(c)}</option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Instructions (optional)"
                    value={addInstr}
                    onChange={e => setAddInstr(e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1.5 text-xs rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving || !addName.trim()}
                      className="flex-1 py-1.5 text-xs bg-indigo-600 text-white rounded font-medium disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded border border-dashed border-indigo-300 dark:border-indigo-700 transition-colors"
                >
                  + Add custom item
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        /* Selected items list */
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {selectedItems.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-6">No items selected yet</p>
          ) : selectedItems.map((entry, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
              <span className="flex-1 text-xs text-zinc-800 dark:text-zinc-100">{entry.name}</span>
              <button
                onClick={() => onRemoveItem(i)}
                className="text-[10px] text-red-400 hover:text-red-600 shrink-0"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
