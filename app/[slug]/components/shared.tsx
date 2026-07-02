export function KrylaLogo() {
  return (
    <a href="https://kryla.work" className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="7" y1="4" x2="7" y2="20" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="7" y1="12" x2="17" y2="4" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="7" y1="12" x2="17" y2="20" stroke="#F5A623" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <span className="text-xs font-semibold text-[#0D0D0D]">kryla<span style={{ color: '#F5A623' }}>.work</span></span>
    </a>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-[#E5E5E5] py-8 xl:pb-8 pb-20">
      <div className="max-w-2xl mx-auto px-6 flex items-center justify-center gap-2">
        <span className="text-xs text-[#999]">Powered by</span>
        <KrylaLogo />
      </div>
    </footer>
  )
}

export function NextdoorIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12l9-9 9 9" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function InstagramIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2.2"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill={color}/>
    </svg>
  )
}

export function WhatsAppIcon({ size = 20, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.848L0 24l6.336-1.51A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.79 9.79 0 01-5.001-1.374l-.36-.214-3.732.888.938-3.63-.235-.374A9.773 9.773 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
    </svg>
  )
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-6">{children}</h2>
  )
}

export function GalleryGrid({ images }: { images: string[] }) {
  if (!images.length) return null
  return (
    <section className="py-8 border-t border-[#E5E5E5]">
      <SectionHeading>Gallery</SectionHeading>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            <img src={url} alt={`Gallery ${i + 1}`} className="w-full aspect-square object-cover rounded-xl" />
          </a>
        ))}
      </div>
    </section>
  )
}

export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="space-y-2">
      {items.map((f, i) => (
        <details key={i} className="group border border-[#E5E5E5] rounded-xl overflow-hidden">
          <summary className="flex justify-between items-center px-5 py-4 cursor-pointer text-[#0D0D0D] font-medium text-sm list-none select-none">
            {f.question}
            <svg className="ml-4 shrink-0 transition-transform group-open:rotate-180" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 5l5 5 5-5" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </summary>
          <p className="px-5 pb-4 text-sm text-[#666666] leading-relaxed border-t border-[#E5E5E5] pt-3">{f.answer}</p>
        </details>
      ))}
    </div>
  )
}
