import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import BioSection from './BioSection'
import type { ProfileData } from '../../types'

afterEach(cleanup)

describe('BioSection — story variant (sellganeshidols v3 rebuild)', () => {
  const ganeshData = {
    persona: 'sellganeshidols',
    bio: 'Handcrafted Ganesh idols for over a decade.',
    storyTabs: [
      { label: 'Story & Craft', body: 'Every idol begins as an uncut block of natural shadu clay.' },
      { label: 'Materials & Care', body: 'Natural shadu clay, water-soluble colours only.' },
      { label: 'Shipping & Returns', body: 'Advance orders recommended before Ganesh Chaturthi.' },
    ],
  } as unknown as ProfileData

  it('renders real tab buttons for each story tab, with the first tab\'s body shown by default', () => {
    render(<BioSection data={ganeshData} accent="#7A3B12" variant="story" />)
    expect(screen.getByRole('tab', { name: 'Story & Craft' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Materials & Care' })).toBeTruthy()
    expect(screen.getByText('Every idol begins as an uncut block of natural shadu clay.')).toBeTruthy()
    expect(screen.queryByText('Natural shadu clay, water-soluble colours only.')).toBeNull()
  })

  it('switches panels on click, showing only the selected tab\'s body', () => {
    render(<BioSection data={ganeshData} accent="#7A3B12" variant="story" />)
    fireEvent.click(screen.getByRole('tab', { name: 'Materials & Care' }))
    expect(screen.getByText('Natural shadu clay, water-soluble colours only.')).toBeTruthy()
    expect(screen.queryByText('Every idol begins as an uncut block of natural shadu clay.')).toBeNull()
  })

  it('falls back to rendering bio as a single untabbed column when storyTabs is empty', () => {
    render(<BioSection data={{ ...ganeshData, storyTabs: [] }} accent="#7A3B12" variant="story" />)
    expect(screen.queryByRole('tab')).toBeNull()
    expect(screen.getByText('Handcrafted Ganesh idols for over a decade.')).toBeTruthy()
  })

  it('renders nothing when both storyTabs and bio are empty', () => {
    const { container } = render(<BioSection data={{ ...ganeshData, storyTabs: [], bio: '' }} accent="#7A3B12" variant="story" />)
    expect(container.querySelector('#materials')).toBeNull()
  })
})
