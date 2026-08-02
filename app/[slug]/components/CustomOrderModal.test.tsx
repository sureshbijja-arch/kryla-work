import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import CustomOrderModal from './CustomOrderModal'
import type { OrderConfig } from '../types'

afterEach(cleanup)

const ganeshConfig: OrderConfig = {
  occasions: ['Ganesh Chaturthi', 'Home puja', 'Society mandal', 'Gifting', 'Other'],
  notesPlaceholder: 'e.g. specific mukut, dhoti colour, seated or standing pose',
  fulfillment: [
    { key: 'pickup', label: 'Pickup' },
    { key: 'transport', label: 'Transport arranged on request', areaPlaceholder: 'Area / society name' },
  ],
  customOrder: {
    whatLabel: 'What are you looking for?',
    whatOptions: ['Single idol', 'Society / mandal idol', 'Bulk order', 'Other'],
    sizeLabel: 'Size',
    sizeOptions: ['1–2 ft', '3–4 ft', '5–7 ft', 'Larger', 'Not sure'],
    detailPlaceholders: {
      finish: 'e.g. natural clay, gold detailing, painted',
      design: 'e.g. seated Ganesh, specific mukut, reference photo available',
    },
  },
}

describe('CustomOrderModal — DB-driven vocabulary (no more hardcoded Cake/Cupcakes)', () => {
  it('renders the ganesh custom-order options, not Cake/Cupcakes/Cookies', () => {
    render(<CustomOrderModal providerId="p1" config={ganeshConfig} onClose={() => {}} />)
    expect(screen.getByText('Single idol')).toBeTruthy()
    expect(screen.getByText('Society / mandal idol')).toBeTruthy()
    expect(screen.queryByText('Cake')).toBeNull()
    expect(screen.queryByText('Cupcakes')).toBeNull()
  })

  it('renders idol size options, not "Feeds 4–6"', () => {
    render(<CustomOrderModal providerId="p1" config={ganeshConfig} onClose={() => {}} />)
    expect(screen.getByText('1–2 ft')).toBeTruthy()
    expect(screen.queryByText('Feeds 4–6')).toBeNull()
  })

  it('renders the ganesh occasions, not Birthday/Anniversary', () => {
    render(<CustomOrderModal providerId="p1" config={ganeshConfig} onClose={() => {}} />)
    expect(screen.getByText('Ganesh Chaturthi')).toBeTruthy()
    expect(screen.queryByText('Birthday')).toBeNull()
  })

  it('renders the ganesh detail placeholders, not cake flavour/theme copy', () => {
    render(<CustomOrderModal providerId="p1" config={ganeshConfig} onClose={() => {}} />)
    expect(screen.getByPlaceholderText('e.g. natural clay, gold detailing, painted')).toBeTruthy()
    expect(screen.getByPlaceholderText('e.g. seated Ganesh, specific mukut, reference photo available')).toBeTruthy()
  })

  it('falls back to the generic bakery-shaped default when no config is passed', () => {
    render(<CustomOrderModal providerId="p1" onClose={() => {}} />)
    expect(screen.getByText('Cake')).toBeTruthy()
  })

  it('hides the fulfillment chooser when the config has only one option', () => {
    const pickupOnly: OrderConfig = { ...ganeshConfig, fulfillment: [{ key: 'pickup', label: 'Pickup' }] }
    render(<CustomOrderModal providerId="p1" config={pickupOnly} onClose={() => {}} />)
    expect(screen.queryByText('Fulfillment')).toBeNull()
  })

  it('reveals the areaPlaceholder input only after selecting Transport', () => {
    render(<CustomOrderModal providerId="p1" config={ganeshConfig} onClose={() => {}} />)
    expect(screen.queryByPlaceholderText('Area / society name')).toBeNull()
    fireEvent.click(screen.getByText('Transport arranged on request'))
    expect(screen.getByPlaceholderText('Area / society name')).toBeTruthy()
  })

  it('selecting a "what" chip marks it pressed/active (background switches to the accent color)', () => {
    render(<CustomOrderModal providerId="p1" accentColor="#7A3B12" config={ganeshConfig} onClose={() => {}} />)
    const chip = screen.getByText('Single idol')
    expect(chip.style.background).not.toBe('rgb(122, 59, 18)')
    fireEvent.click(chip)
    expect(chip.style.background).toBe('rgb(122, 59, 18)')
  })
})
