'use client'

import { useState, useEffect, useCallback } from 'react'

interface Student {
  id:           string
  name:         string
  label_1:      string | null
  label_2:      string | null
  sessions:     number
  next_session: string | null
  notes:        string | null
  avatar_color: string
  booking_id:   string | null
  created_at:   string
  parent_name:  string | null
  parent_email: string | null
  parent_phone: string | null
}

interface StudentSession {
  id:           string
  session_date: string
  topic:        string | null
  homework:     string | null
  notes:        string | null
  attended:     boolean
  created_at:   string
}

const COLORS = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EF4444','#14B8A6']

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

interface AddEditForm {
  name:        string
  label1:      string
  label2:      string
  notes:       string
  nextSession: string
  avatarColor: string
  parentName:  string
  parentEmail: string
  parentPhone: string
}

interface LogLessonForm {
  sessionDate: string
  topic:       string
  homework:    string
  notes:       string
}

const EMPTY_FORM: AddEditForm = {
  name: '', label1: '', label2: '', notes: '', nextSession: '',
  avatarColor: COLORS[0], parentName: '', parentEmail: '', parentPhone: '',
}

const EMPTY_LOG: LogLessonForm = {
  sessionDate: new Date().toISOString().slice(0, 10),
  topic: '', homework: '', notes: '',
}

export default function StudentsTab({
  providerId,
  label1Label = 'Grade',
  label2Label = 'Subject',
}: {
  providerId:   string
  label1Label?: string
  label2Label?: string
}) {
  const [students, setStudents]   = useState<Student[]>([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState<'add' | { edit: Student } | null>(null)
  const [form, setForm]           = useState<AddEditForm>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [logging, setLogging]     = useState<string | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)

  // lesson timeline state
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [sessions, setSessions]     = useState<Record<string, StudentSession[]>>({})
  const [loadingSess, setLoadingSess] = useState<string | null>(null)
  const [logForm, setLogForm]       = useState<LogLessonForm>(EMPTY_LOG)
  const [savingLog, setSavingLog]   = useState(false)
  const [deletingSession, setDeletingSession] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/mychat/students?providerId=${providerId}`)
      const data = await res.json()
      setStudents(data.students ?? [])
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => { load() }, [load])

  async function toggleExpand(studentId: string) {
    if (expanded === studentId) {
      setExpanded(null)
      return
    }
    setExpanded(studentId)
    setLogForm({ ...EMPTY_LOG, sessionDate: new Date().toISOString().slice(0, 10) })
    if (sessions[studentId]) return // already loaded

    setLoadingSess(studentId)
    try {
      const res  = await fetch(`/api/mychat/student-sessions?providerId=${providerId}&studentId=${studentId}`)
      const data = await res.json()
      setSessions(prev => ({ ...prev, [studentId]: data.sessions ?? [] }))
    } finally {
      setLoadingSess(null)
    }
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)] })
    setModal('add')
  }

  function openEdit(s: Student) {
    setForm({
      name:        s.name,
      label1:      s.label_1     ?? '',
      label2:      s.label_2     ?? '',
      notes:       s.notes       ?? '',
      nextSession: s.next_session ?? '',
      avatarColor: s.avatar_color,
      parentName:  s.parent_name  ?? '',
      parentEmail: s.parent_email ?? '',
      parentPhone: s.parent_phone ?? '',
    })
    setModal({ edit: s })
  }

  async function saveForm() {
    setSaving(true)
    try {
      if (modal === 'add') {
        await fetch('/api/mychat/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId,
            name:        form.name,
            label1:      form.label1      || null,
            label2:      form.label2      || null,
            notes:       form.notes       || null,
            nextSession: form.nextSession || null,
            avatarColor: form.avatarColor,
            parentName:  form.parentName  || null,
            parentEmail: form.parentEmail || null,
            parentPhone: form.parentPhone || null,
          }),
        })
      } else if (modal && 'edit' in modal) {
        await fetch('/api/mychat/students', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId,
            studentId:   modal.edit.id,
            name:        form.name,
            label1:      form.label1      || null,
            label2:      form.label2      || null,
            notes:       form.notes       || null,
            nextSession: form.nextSession || null,
            avatarColor: form.avatarColor,
            parentName:  form.parentName  || null,
            parentEmail: form.parentEmail || null,
            parentPhone: form.parentPhone || null,
          }),
        })
      }
      setModal(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function quickLogSession(id: string) {
    setLogging(id)
    try {
      await fetch('/api/mychat/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, studentId: id, action: 'log_session' }),
      })
      setStudents(prev =>
        prev.map(s => s.id === id ? { ...s, sessions: s.sessions + 1 } : s)
      )
      // refresh session list if expanded
      if (expanded === id) {
        const res  = await fetch(`/api/mychat/student-sessions?providerId=${providerId}&studentId=${id}`)
        const data = await res.json()
        setSessions(prev => ({ ...prev, [id]: data.sessions ?? [] }))
      }
    } finally {
      setLogging(null)
    }
  }

  async function saveLesson(studentId: string) {
    if (!logForm.topic && !logForm.homework && !logForm.notes) return
    setSavingLog(true)
    try {
      const res = await fetch('/api/mychat/student-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          studentId,
          sessionDate: logForm.sessionDate || new Date().toISOString().slice(0, 10),
          topic:       logForm.topic    || null,
          homework:    logForm.homework || null,
          notes:       logForm.notes    || null,
          attended:    true,
        }),
      })
      const data = await res.json()
      if (data.session) {
        setSessions(prev => ({ ...prev, [studentId]: [data.session, ...(prev[studentId] ?? [])] }))
        setStudents(prev =>
          prev.map(s => s.id === studentId ? { ...s, sessions: s.sessions + 1 } : s)
        )
        setLogForm({ ...EMPTY_LOG, sessionDate: new Date().toISOString().slice(0, 10) })
      }
    } finally {
      setSavingLog(false)
    }
  }

  async function deleteSession(studentId: string, sessionId: string) {
    setDeletingSession(sessionId)
    try {
      await fetch('/api/mychat/student-sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, sessionId, studentId }),
      })
      setSessions(prev => ({
        ...prev,
        [studentId]: (prev[studentId] ?? []).filter(s => s.id !== sessionId),
      }))
      setStudents(prev =>
        prev.map(s => s.id === studentId ? { ...s, sessions: Math.max(0, s.sessions - 1) } : s)
      )
    } finally {
      setDeletingSession(null)
    }
  }

  async function deleteStudent(id: string) {
    if (!confirm('Remove this student?')) return
    setDeleting(id)
    try {
      await fetch('/api/mychat/students', {
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
          <div key={s.id} className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
            <div className="p-4">
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

                  {s.parent_name && (
                    <p className="text-xs text-[#bbb] mt-1">Parent: {s.parent_name}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => quickLogSession(s.id)}
                      disabled={logging === s.id}
                      className="flex items-center gap-1 text-xs font-semibold bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7] px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                      {logging === s.id ? '…' : '✓ Quick log'}
                    </button>
                    <button
                      onClick={() => toggleExpand(s.id)}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                        expanded === s.id
                          ? 'bg-[#0D0D0D] text-white'
                          : 'text-[#666] bg-[#F5F5F5] hover:bg-[#E5E5E5]'
                      }`}>
                      📚 Lessons
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

            {/* Expandable lesson timeline */}
            {expanded === s.id && (
              <div className="border-t border-[#F0F0F0] bg-[#FAFAFA] px-4 py-4 space-y-4">

                {/* Log a lesson form */}
                <div>
                  <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wide mb-2">Log a lesson</p>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#999] font-semibold uppercase tracking-wide block mb-1">Date</label>
                        <input
                          type="date"
                          value={logForm.sessionDate}
                          onChange={e => setLogForm(f => ({ ...f, sessionDate: e.target.value }))}
                          className="w-full border border-[#E5E5E5] rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none focus:border-[#0D0D0D] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#999] font-semibold uppercase tracking-wide block mb-1">Topic</label>
                        <input
                          type="text"
                          value={logForm.topic}
                          onChange={e => setLogForm(f => ({ ...f, topic: e.target.value }))}
                          placeholder="e.g. Quadratic equations"
                          className="w-full border border-[#E5E5E5] rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none focus:border-[#0D0D0D] transition-colors"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={logForm.homework}
                      onChange={e => setLogForm(f => ({ ...f, homework: e.target.value }))}
                      placeholder="Homework assigned (e.g. Practice problems p.42)"
                      className="w-full border border-[#E5E5E5] rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none focus:border-[#0D0D0D] transition-colors"
                    />
                    <input
                      type="text"
                      value={logForm.notes}
                      onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Private notes (not shared with parent)"
                      className="w-full border border-[#E5E5E5] rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none focus:border-[#0D0D0D] transition-colors"
                    />
                    <button
                      onClick={() => saveLesson(s.id)}
                      disabled={savingLog || (!logForm.topic && !logForm.homework && !logForm.notes)}
                      className="w-full py-2 rounded-lg bg-[#0D0D0D] text-white text-xs font-semibold disabled:opacity-40 hover:opacity-80 transition-opacity">
                      {savingLog ? 'Saving…' : 'Save lesson'}
                    </button>
                  </div>
                </div>

                {/* Lesson history */}
                <div>
                  <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wide mb-2">History</p>
                  {loadingSess === s.id && (
                    <p className="text-xs text-[#bbb]">Loading…</p>
                  )}
                  {!loadingSess && (sessions[s.id] ?? []).length === 0 && (
                    <p className="text-xs text-[#bbb]">No lessons logged yet.</p>
                  )}
                  <div className="space-y-2">
                    {(sessions[s.id] ?? []).map(sess => (
                      <div key={sess.id} className="bg-white border border-[#E5E5E5] rounded-xl px-3 py-2.5 relative group">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[10px] font-semibold text-[#999]">{formatDate(sess.session_date)}</p>
                          <button
                            onClick={() => deleteSession(s.id, sess.id)}
                            disabled={deletingSession === sess.id}
                            className="text-[10px] text-[#ccc] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                            {deletingSession === sess.id ? '…' : 'Remove'}
                          </button>
                        </div>
                        {sess.topic && (
                          <p className="text-xs text-[#0D0D0D] mt-0.5">{sess.topic}</p>
                        )}
                        {sess.homework && (
                          <p className="text-xs text-[#666] mt-0.5">HW: {sess.homework}</p>
                        )}
                        {sess.notes && (
                          <p className="text-xs text-[#999] mt-0.5 italic">{sess.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
                  placeholder="e.g. Grade 5"
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666] block mb-1">{label2Label}</span>
                <input
                  type="text"
                  value={form.label2}
                  onChange={e => setForm(f => ({ ...f, label2: e.target.value }))}
                  placeholder="e.g. Maths"
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
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666] block mb-1">Notes (private)</span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Quick notes about this student…"
                className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#0D0D0D] transition-colors"
              />
            </label>

            {/* Parent / guardian */}
            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#999] mb-3">Parent / guardian (optional)</p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={form.parentName}
                  onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))}
                  placeholder="Parent name"
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    value={form.parentEmail}
                    onChange={e => setForm(f => ({ ...f, parentEmail: e.target.value }))}
                    placeholder="Email"
                    className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors"
                  />
                  <input
                    type="tel"
                    value={form.parentPhone}
                    onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))}
                    placeholder="Phone / WhatsApp"
                    className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0D0D0D] transition-colors"
                  />
                </div>
              </div>
            </div>

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
