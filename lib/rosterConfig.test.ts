import { describe, it, expect } from 'vitest'
import { parseRosterConfig, DEFAULT_ROSTER_CONFIG } from './rosterConfig'

const valid = {
  singular: 'customer',
  plural: 'customers',
  tabLabel: 'Customers',
  emoji: '🛍️',
  emptyHeading: 'No customers yet',
  emptySubtext: 'Customers appear here automatically when you accept an order.',
  addLabel: '+ Add customer',
  lessonsBtnLabel: '🧾 Orders',
  logTitle: 'Log an order',
  topicLabel: 'Order details',
  topicPlaceholder: 'e.g. 3 ft Ganesh, gold finish',
  homeworkLabel: 'Follow-up',
  homeworkPlaceholder: 'e.g. Confirm pickup time',
  notesPlaceholder: 'Private notes',
  nextLabel: 'Pickup / delivery date',
  nextPlaceholder: 'e.g. Chaturthi eve, 5 PM',
  historyLabel: 'Order history',
  sessionNoun: 'order',
  contactSectionLabel: 'Alternate contact (optional)',
  contactRowLabel: 'Contact',
  quickLogLabel: '✓ Quick log',
  removeConfirm: 'Remove this customer?',
}

describe('parseRosterConfig — validates DB-editable jsonb before it reaches the Clients tab', () => {
  it('accepts a fully-shaped valid config', () => {
    expect(parseRosterConfig(valid)).toEqual(valid)
  })

  it('rejects null', () => {
    expect(parseRosterConfig(null)).toBeNull()
  })

  it('rejects a non-object (e.g. a stray string in the jsonb column)', () => {
    expect(parseRosterConfig('not an object')).toBeNull()
  })

  it('rejects when a required field is missing', () => {
    const { addLabel: _addLabel, ...rest } = valid
    expect(parseRosterConfig(rest)).toBeNull()
  })

  it('rejects when a field has the wrong type', () => {
    expect(parseRosterConfig({ ...valid, singular: 42 })).toBeNull()
  })

  it('rejects a plain empty object', () => {
    expect(parseRosterConfig({})).toBeNull()
  })

  it('DEFAULT_ROSTER_CONFIG itself parses as valid (guards against the fallback constant drifting out of shape)', () => {
    expect(parseRosterConfig(DEFAULT_ROSTER_CONFIG)).toEqual(DEFAULT_ROSTER_CONFIG)
  })

  it('DEFAULT_ROSTER_CONFIG preserves today\'s tutor/"student" copy exactly', () => {
    expect(DEFAULT_ROSTER_CONFIG.singular).toBe('student')
    expect(DEFAULT_ROSTER_CONFIG.addLabel).toBe('+ Add student')
  })
})
