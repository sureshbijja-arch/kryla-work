import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import OrderModal from './OrderModal'
import type { OrderConfig } from '../types'

afterEach(cleanup)

const bakeryConfig: OrderConfig = {
  occasions: ['Birthday', 'Anniversary', 'Wedding', 'Festive', 'Corporate', 'Graduation', 'Other'],
  notesPlaceholder: "e.g. Write 'Happy Birthday Priya', chocolate frosting, no nuts",
  fulfillment: [
    { key: 'pickup', label: 'Pickup' },
    { key: 'delivery', label: 'Delivery', areaPlaceholder: 'Delivery area / address' },
  ],
  customOrder: {
    whatLabel: 'What are you looking for?', whatOptions: ['Cake'],
    sizeLabel: 'Servings / Size', sizeOptions: ['Feeds 4–6'],
    detailPlaceholders: { finish: 'flavour', design: 'design' },
  },
}

const ganeshConfig: OrderConfig = {
  occasions: ['Ganesh Chaturthi', 'Home puja', 'Society mandal', 'Gifting', 'Other'],
  notesPlaceholder: 'e.g. specific mukut, dhoti colour, seated or standing pose',
  fulfillment: [
    { key: 'pickup', label: 'Pickup' },
    { key: 'transport', label: 'Transport arranged on request', areaPlaceholder: 'Area / society name' },
  ],
  customOrder: {
    whatLabel: 'What are you looking for?', whatOptions: ['Single idol'],
    sizeLabel: 'Size', sizeOptions: ['1–2 ft'],
    detailPlaceholders: { finish: 'finish', design: 'design' },
  },
}

const item = { name: 'Gold-Finish Ganesh', price: '₹8,500' }

describe('OrderModal — DB-driven vocabulary (no more hardcoded bakery copy)', () => {
  it('renders the passed config\'s occasions, not the old hardcoded bakery list', () => {
    render(<OrderModal item={item} providerId="p1" config={ganeshConfig} persona="sellganeshidols" onClose={() => {}} />)
    expect(screen.getByText('Ganesh Chaturthi')).toBeTruthy()
    expect(screen.getByText('Society mandal')).toBeTruthy()
    expect(screen.queryByText('Birthday')).toBeNull()
    expect(screen.queryByText('Graduation')).toBeNull()
  })

  it('renders the config\'s notes placeholder', () => {
    render(<OrderModal item={item} providerId="p1" config={ganeshConfig} persona="sellganeshidols" onClose={() => {}} />)
    expect(screen.getByPlaceholderText('e.g. specific mukut, dhoti colour, seated or standing pose')).toBeTruthy()
  })

  it('falls back to the generic bakery-shaped default when no config is passed (back-compat)', () => {
    render(<OrderModal item={item} providerId="p1" onClose={() => {}} />)
    expect(screen.getByText('Birthday')).toBeTruthy()
  })

  it('hides the fulfillment chooser entirely when the config has only one option (Pickup only)', () => {
    const pickupOnly: OrderConfig = { ...ganeshConfig, fulfillment: [{ key: 'pickup', label: 'Pickup' }] }
    render(<OrderModal item={item} providerId="p1" config={pickupOnly} persona="sellganeshidols" onClose={() => {}} />)
    expect(screen.queryByText('Fulfillment')).toBeNull()
  })

  it('shows Transport (not Delivery) as the second fulfillment option for the ganesh config', () => {
    render(<OrderModal item={item} providerId="p1" config={ganeshConfig} persona="sellganeshidols" onClose={() => {}} />)
    expect(screen.getByText('Transport arranged on request')).toBeTruthy()
    expect(screen.queryByText('Delivery')).toBeNull()
  })

  it('reveals the areaPlaceholder input only after selecting an option that declares one', () => {
    render(<OrderModal item={item} providerId="p1" config={ganeshConfig} persona="sellganeshidols" onClose={() => {}} />)
    expect(screen.queryByPlaceholderText('Area / society name')).toBeNull()
    fireEvent.click(screen.getByText('Transport arranged on request'))
    expect(screen.getByPlaceholderText('Area / society name')).toBeTruthy()
  })

  it('honours hasQuantity: false for sellganeshidols — no quantity stepper', () => {
    render(<OrderModal item={item} providerId="p1" config={ganeshConfig} persona="sellganeshidols" onClose={() => {}} />)
    expect(screen.queryByText('Quantity')).toBeNull()
  })

  it('shows the quantity stepper for a persona with hasQuantity: true (baker)', () => {
    render(<OrderModal item={item} providerId="p1" config={bakeryConfig} persona="baker" onClose={() => {}} />)
    expect(screen.getByText('Quantity')).toBeTruthy()
  })

  it('honours hasNotes for the persona — hidden when false', () => {
    // salon has hasNotes: false in PERSONA_CONFIG
    render(<OrderModal item={item} providerId="p1" config={bakeryConfig} persona="salon" onClose={() => {}} />)
    expect(screen.queryByText('Notes / Customization')).toBeNull()
  })
})
