'use client'
import { createContext, useContext, useState, useRef, useCallback } from 'react'

/**
 * Shares "which idol/size is selected" between two sibling sections —
 * FactsSection's idol-showcase cards and HeroSection's HeroPdp — without
 * prop-drilling through LayoutRenderer's section switch (which would force
 * every other section type to forward props it doesn't use) or URL state
 * (the public page is ISR-cached; a query param would fight that cache and
 * wouldn't survive a fresh visit anyway).
 *
 * sellganeshidols-only in practice — HeroPdp is the only hero variant that
 * reads it — but the provider itself is persona-agnostic infrastructure, so
 * it lives beside LayoutRenderer rather than under a Ganesh-specific path.
 */
interface IdolSelectionValue {
  selectedIdolIdx: number
  selectIdol: (idx: number) => void
  /** Scrolls the PDP into view after selecting — used by the idol-showcase
   * cards so clicking a card both loads the idol AND brings the PDP on
   * screen, per the "click loads idol detail" requirement. No-ops if the
   * PDP hasn't registered a target (e.g. this variant/persona doesn't use
   * the hero at all). */
  registerPdpTarget: (el: HTMLElement | null) => void
  scrollToPdp: () => void
}

const IdolSelectionContext = createContext<IdolSelectionValue | null>(null)

export function IdolSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedIdolIdx, setSelectedIdolIdx] = useState(0)
  const pdpRef = useRef<HTMLElement | null>(null)

  const selectIdol = useCallback((idx: number) => setSelectedIdolIdx(idx), [])
  const registerPdpTarget = useCallback((el: HTMLElement | null) => { pdpRef.current = el }, [])
  const scrollToPdp = useCallback(() => {
    pdpRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <IdolSelectionContext.Provider value={{ selectedIdolIdx, selectIdol, registerPdpTarget, scrollToPdp }}>
      {children}
    </IdolSelectionContext.Provider>
  )
}

/** Returns null outside a provider (every non-ganesh page) rather than
 * throwing, so callers can fall back to uncontrolled local state — matches
 * this codebase's fail-open convention for optional/persona-scoped features. */
export function useIdolSelection(): IdolSelectionValue | null {
  return useContext(IdolSelectionContext)
}
