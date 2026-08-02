import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import IdolsTab from './IdolsTab'
import type { ServiceItem } from '../[slug]/types'

afterEach(cleanup)

const oneIdol: ServiceItem[] = [{
  name: 'Natural Shadu Ganesh', description: 'Unpainted clay.', duration_or_unit: null,
  image_url: null,
  variants: [
    { size: '1 ft', price: '₹3,000' },
    { size: '2 ft', price: '₹5,500' },
  ],
}]

describe('IdolsTab — seller CRUD for idol → variants catalogue', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, url: 'https://x/img.jpg' }) }))
  })

  it('renders one collapsed card per idol, with its size count', () => {
    render(<IdolsTab providerId="p1" slug="ganesh-seller" initialServices={oneIdol} plan="grow" planOrder={['seed', 'sprout', 'grow', 'thrive']} />)
    expect(screen.getByText('Natural Shadu Ganesh')).toBeTruthy()
    expect(screen.getByText('2 sizes')).toBeTruthy()
  })

  it('seeds one blank idol with one blank variant when the seller has none yet', () => {
    render(<IdolsTab providerId="p1" slug="ganesh-seller" initialServices={[]} plan="grow" planOrder={['seed', 'sprout', 'grow', 'thrive']} />)
    expect(screen.getByText('Untitled idol')).toBeTruthy()
  })

  it('expanding a card reveals name/description/size fields', () => {
    render(<IdolsTab providerId="p1" slug="ganesh-seller" initialServices={oneIdol} plan="grow" planOrder={['seed', 'sprout', 'grow', 'thrive']} />)
    fireEvent.click(screen.getByText('Natural Shadu Ganesh'))
    expect(screen.getByDisplayValue('Natural Shadu Ganesh')).toBeTruthy()
    expect(screen.getByDisplayValue('1 ft')).toBeTruthy()
    expect(screen.getByDisplayValue('₹5,500')).toBeTruthy()
  })

  it('"Add idol" appends a new blank card and expands it (Untitled idol label shown)', () => {
    render(<IdolsTab providerId="p1" slug="ganesh-seller" initialServices={oneIdol} plan="grow" planOrder={['seed', 'sprout', 'grow', 'thrive']} />)
    fireEvent.click(screen.getByText('Add idol'))
    // Two idol cards now exist: the seeded one (collapsed, showing its name)
    // and the new blank one, which shows the empty-name placeholder label
    // both in its collapsed row and in its now-expanded Name field.
    expect(screen.getByText('Untitled idol')).toBeTruthy()
    expect(screen.getByPlaceholderText('e.g. Natural Shadu Ganesh')).toBeTruthy()
  })

  it('"Add size" appends a new blank variant row within the expanded idol', () => {
    render(<IdolsTab providerId="p1" slug="ganesh-seller" initialServices={oneIdol} plan="grow" planOrder={['seed', 'sprout', 'grow', 'thrive']} />)
    fireEvent.click(screen.getByText('Natural Shadu Ganesh'))
    const sizeInputsBefore = screen.getAllByPlaceholderText('1 ft')
    expect(sizeInputsBefore).toHaveLength(2) // one per existing variant row (shared placeholder text)
    fireEvent.click(screen.getByText('Add size'))
    expect(screen.getAllByPlaceholderText('1 ft')).toHaveLength(3) // 2 existing + 1 new blank row
  })

  it('cannot remove the last remaining size — the button is disabled', () => {
    const singleVariant: ServiceItem[] = [{
      name: 'Idol', description: '', duration_or_unit: null,
      variants: [{ size: '1 ft', price: '₹3,000' }],
    }]
    render(<IdolsTab providerId="p1" slug="ganesh-seller" initialServices={singleVariant} plan="grow" planOrder={['seed', 'sprout', 'grow', 'thrive']} />)
    fireEvent.click(screen.getByText('Idol'))
    // The remove-variant button next to the only size row should be disabled.
    const removeButtons = document.querySelectorAll('button:disabled')
    expect(Array.from(removeButtons).some(b => b.className.includes('text-[#CCC]'))).toBe(true)
  })

  it('gates photo upload behind Grow+ plan (DB-driven planOrder, not a hardcoded rank)', () => {
    render(<IdolsTab providerId="p1" slug="ganesh-seller" initialServices={oneIdol} plan="seed" planOrder={['seed', 'sprout', 'grow', 'thrive']} />)
    fireEvent.click(screen.getByText('Natural Shadu Ganesh'))
    expect(screen.getByText(/Photo upload requires/)).toBeTruthy()
    expect(screen.queryByText('Upload photo')).toBeNull()
  })

  it('allows photo upload for Grow plan and above', () => {
    render(<IdolsTab providerId="p1" slug="ganesh-seller" initialServices={oneIdol} plan="thrive" planOrder={['seed', 'sprout', 'grow', 'thrive']} />)
    fireEvent.click(screen.getByText('Natural Shadu Ganesh'))
    expect(screen.getByText('Upload photo')).toBeTruthy()
  })

  it('save() POSTs the idol/variants shape to /api/mychat/services', async () => {
    render(<IdolsTab providerId="p1" slug="ganesh-seller" initialServices={oneIdol} plan="grow" planOrder={['seed', 'sprout', 'grow', 'thrive']} />)
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/mychat/services', expect.objectContaining({ method: 'POST' })))
    const call = (fetch as any).mock.calls.find((c: any[]) => c[0] === '/api/mychat/services')
    const body = JSON.parse(call[1].body)
    expect(body.providerId).toBe('p1')
    expect(body.services[0].variants).toEqual([
      { size: '1 ft', price: '₹3,000' },
      { size: '2 ft', price: '₹5,500' },
    ])
  })

  it('save() drops a fully-blank variant row before sending', async () => {
    render(<IdolsTab providerId="p1" slug="ganesh-seller" initialServices={oneIdol} plan="grow" planOrder={['seed', 'sprout', 'grow', 'thrive']} />)
    fireEvent.click(screen.getByText('Natural Shadu Ganesh'))
    fireEvent.click(screen.getByText('Add size')) // adds one blank variant
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/mychat/services', expect.anything()))
    const call = (fetch as any).mock.calls.find((c: any[]) => c[0] === '/api/mychat/services')
    const body = JSON.parse(call[1].body)
    expect(body.services[0].variants).toHaveLength(2) // blank one dropped
  })
})
