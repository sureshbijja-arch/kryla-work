import { describe, it, expect } from 'vitest'
import { parseOrderConfig } from './orderConfig'

const valid = {
  occasions: ['Ganesh Chaturthi', 'Home puja'],
  notesPlaceholder: 'e.g. specific mukut',
  fulfillment: [{ key: 'pickup', label: 'Pickup' }],
  customOrder: {
    whatLabel: 'What are you looking for?',
    whatOptions: ['Single idol'],
    sizeLabel: 'Size',
    sizeOptions: ['1–2 ft'],
    detailPlaceholders: { finish: 'finish placeholder', design: 'design placeholder' },
  },
}

describe('parseOrderConfig — validates DB-editable jsonb before it reaches a public order modal', () => {
  it('accepts a fully-shaped valid config', () => {
    expect(parseOrderConfig(valid)).toEqual(valid)
  })

  it('accepts a fulfillment option with an areaPlaceholder', () => {
    const withArea = { ...valid, fulfillment: [{ key: 'transport', label: 'Transport', areaPlaceholder: 'Area / society name' }] }
    expect(parseOrderConfig(withArea)).toEqual(withArea)
  })

  it('rejects null', () => {
    expect(parseOrderConfig(null)).toBeNull()
  })

  it('rejects a non-object (e.g. a stray string in the jsonb column)', () => {
    expect(parseOrderConfig('not an object')).toBeNull()
  })

  it('rejects when occasions is missing', () => {
    const { occasions: _occasions, ...rest } = valid
    expect(parseOrderConfig(rest)).toBeNull()
  })

  it('rejects when occasions contains a non-string', () => {
    expect(parseOrderConfig({ ...valid, occasions: ['Ganesh Chaturthi', 42] })).toBeNull()
  })

  it('rejects when fulfillment is an empty array (nothing to choose, but also nothing valid)', () => {
    expect(parseOrderConfig({ ...valid, fulfillment: [] })).toBeNull()
  })

  it('rejects a fulfillment entry missing "label"', () => {
    expect(parseOrderConfig({ ...valid, fulfillment: [{ key: 'pickup' }] })).toBeNull()
  })

  it('rejects when customOrder.detailPlaceholders is missing a field', () => {
    const broken = {
      ...valid,
      customOrder: { ...valid.customOrder, detailPlaceholders: { finish: 'only finish' } },
    }
    expect(parseOrderConfig(broken)).toBeNull()
  })

  it('rejects when customOrder.whatOptions is not an array', () => {
    const broken = { ...valid, customOrder: { ...valid.customOrder, whatOptions: 'Cake' } }
    expect(parseOrderConfig(broken)).toBeNull()
  })

  it('rejects a plain empty object', () => {
    expect(parseOrderConfig({})).toBeNull()
  })
})
