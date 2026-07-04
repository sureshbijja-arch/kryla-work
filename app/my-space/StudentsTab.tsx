'use client'

import { useState, useEffect, useCallback } from 'react'

interface Student {
  id:           string
  name:         string
  label_1:      string | null  // grade / level
  label_2:      string | null  // subject / goal
  sessions:     number
  next_session: string | null
  notes:        string | null
  avatar_color: string
  booking_id:   string | null
  created_at:   string
}

const COLORS = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EF4444','#14B8A6']

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

interface AddEditForm {
  name:         string
  label1:       string
  label2:       string
  notes:        string
  nextSession:  string
  avatarColor:  string
}

const EMPTY_FORM: AddEditForm = { name: '', label1: '', label2: '', notes: '', nextSession: '', avatarColor: COLORS[0] }

export default function StudentsTab({
  providerId,
  label1Label = 'Grade',
  label2Label = 'Subject',
}: {
  providerId:  string
  label1Label?: string
  label2Label?: string
}) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState<'add' | { edit: Student } | null>(null)
  const [form, setForm]         = useState<AddEditForm>(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [logging, setLogging]   = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/my-space/students?providerId=${providerId}`)
      const data = await res.json()
      setStudents(data.students ?? [])
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setForm({ ...EMPTY_FORM, avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)] })
    setModal('add')
  }

  function openEdit(s: Student) {
    setForm({
      name:        s.name,
      label1:      s.label_1 ?? '',
      label2:      s.label_2 ?? '',
      notes:       s.notes ?? '',
      nextSession: s.next_session ?? '',
      avatarColor: s.avatar_color,
    })
    setModal({ edit: s })
  }

  async function saveForm() {
    setSaving(true)
    try {
      if (modal === 'add') {
        await fetch('/api/my-space/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId,
            name:        form.name,
            label1:      form.label1 || null,
            label2:      form.label2 || null,
            notes:       form.notes || null,
            nextSession: form.nextSession || null,
            avatarColor: form.avatarColor,
          }),
        })
      } else if (modal && 'edit' in modal) {
        await fetch('/api/my-space/students', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId,
            studentId:   modal.edit.id,
            name:        form.name,
            label1:      form.label1 || null,
            label2:      form.label2 || null,
            notes:       form.notes || null,
            nextSession: form.nextSession || null,
            avatarColor: form.avatarColor,
          }),
        })
      }
      setModal(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function logSession(id: string) {
    setLogging(id)
    try {
      await fetch('/api/my-space/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, studentId: id, action: 'log_session' }),
      })
      setStudents(prev =>
        prev.map(s => s.id === id ? { ...s, sessions: s.sessions + 1 } : s)
      )
    } finally {
      setLogging(null)
    }
  }

  async function deleteStudent(id: string) {
    if (!confirm('Remove this student?')) return
    setDeleting(id)
    try {
      await fetch('/api/my-space/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, studentId: id }),
      })
      setStudents(prev => prev.filter(s => s.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[#bbb] text-sm">Loading students…</div>
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-[#999] font-semibold uppercase tracking-wide">
          {students.length} student{students.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={openAdd}
          className="text-xs font-semibold bg-[#0D0D0D] text-white px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity">
          + Add student
        </button>
      </div>

      {students.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-4 text-2xl">🎓</div>
          <p className="font-semibold text-[#0D0D0D] text-sm">No students yet</p>
          <p className="text-[#999] text-xs mt-1">Students appear here automatically when you accept a booking.</p>
        </div>
      )}

      <div className="space-y-3">
        {students.map(s => (
          <div key={s.id} className="bg-white border border-[#E5E5E5] rounded-2xl p-4">
            <div className="flex items-start gap-3">

              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: s.avatar_color }}>
                {initials(s.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-[#0D0D0D] text-sm truncate">{s.name}</p>
                  <span className="shrink-0 text-[10px] font-bold bg-[#F0F4FF] text-[#6366F1] px-2 py-0.5 rounded-full">
                    {s.sessions} session{s.sessions !== 1 ? 's' : ''}
                  </span>
                </div>

                {(s.label_1 || s.label_2) && (
                  <p className="text-xs text-[#666] mt-0.5">
                    {[s.label_1, s.label_2].filter(Boolean).join(' · ')}
                  </p>
                )}

                {s.next_session && (
                  <p className="text-xs text-[#999] mt-0.5">
                    Next: <span className="text-[#0D0D0D]">{s.next_session}</span>
                  </p>
                )}

                {s.notes && (
                  <p className="text-xs text-[#999] mt-1 line-clamp-2">{s.notes}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => logSession(s.id)}
                    disabled={logging === s.id}
                    className="flex items-center gap-1 text-xs font-semibold bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7] px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                    {logging === s.id ? '…' : '✓ Log session'}
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="text-xs font-semibold text-[#666] bg-[#F5F5F5] hover:bg-[#E5E5E5] px-2.5 py-1.5 rounded-lg transition-colors">
                    Edit
                  </button>
                  <button
                    onClick={() => deleteStudent(s.id)}
                    disabled={deleting === s.id}
                    className="text-xs font-semibold text-[#bbb] hover:text-red-500 transition-colors px-1 ml-auto">
                    {deleting === s.id ? '…' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <p className="font-bold text-[#0D0D0D]">{modal === 'add' ? 'Add student' : 'Edit student'}</p>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666] block mb-1">Name</span>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Student name"
                className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666] block mb-1">{label1Label}</span>
                <input
                  type="text"
                  value={form.label1}
                  onChange={e => setForm(f => ({ ...f, label1: e.target.value }))}
                  placeholder={`e.g. Grade 5`}
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666] block mb-1">{label2Label}</span>
                <input
                  type="text"
                  value={form.label2}
                  onChange={e => setForm(f => ({ ...f, label2: e.target.value }))}
                  placeholder={`e.g. Maths`}
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666] block mb-1">Next session</span>
              <input
                type="text"
                value={form.nextSession}
                onChange={e => setForm(f => ({ ...f, nextSession: e.target.value }))}
                placeholder="e.g. Saturday 10 AM"
                className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666] block mb-1">Notes</span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Quick notes about this student…"
                className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#0D0D0D] transition-colors"
              />
            </label>

            {/* Avatar colour */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666] block mb-2">Avatar colour</span>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, avatarColor: c }))}
                    className={`w-6 h-6 rounded-full transition-all ${form.avatarColor === c ? 'ring-2 ring-offset-1 ring-[#0D0D0D]' : ''}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E5E5E5] text-sm font-semibold text-[#666] hover:border-[#0D0D0D] transition-colors">
                Cancel
              </button>
              <button
                onClick={saveForm}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#0D0D0D] text-sm font-semibold text-white disabled:opacity-40 hover:opacity-80 transition-opacity">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
