export default function AdminDashboard() {
  const sections = [
    {
      href:        '/admin/layouts',
      emoji:       '🎨',
      title:       'Layouts',
      description: 'Manage layout presets — create, edit, and activate persona-specific design templates.',
    },
    {
      href:        '/admin/plans',
      emoji:       '💳',
      title:       'Plans',
      description: 'Configure pricing plans and feature keys that gate member functionality.',
    },
    {
      href:        '/admin/personas',
      emoji:       '🎭',
      title:       'Personas',
      description: 'Toggle personas on/off, reorder them, and add new ones. Changes reflect on landing and onboarding.',
    },
    {
      href:        '/admin/suggestions',
      emoji:       '💡',
      title:       'Suggestions',
      description: 'Review feature requests from members, update status, and trigger AI agents.',
    },
    {
      href:        '/admin/notifications',
      emoji:       '🔔',
      title:       'Notifications',
      description: 'Toggle automated WhatsApp notifications on/off and view the send history log.',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto pt-8">
      <h1 className="text-2xl font-bold text-[#0D0D0D] mb-1">Admin</h1>
      <p className="text-sm text-[#666] mb-10">Manage layouts, plans, and member suggestions.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {sections.map(s => (
          <a key={s.href} href={s.href}
            className="group block border border-[#E5E5E5] rounded-2xl p-6 bg-white hover:border-[#F5A623] hover:shadow-sm transition-all">
            <div className="text-3xl mb-4">{s.emoji}</div>
            <p className="font-bold text-[#0D0D0D] mb-2 group-hover:text-[#0D0D0D]">{s.title}</p>
            <p className="text-xs text-[#888] leading-relaxed">{s.description}</p>
            <div className="mt-5 text-xs font-semibold text-[#F5A623]">Open →</div>
          </a>
        ))}
      </div>
    </div>
  )
}
