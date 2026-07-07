/**
 * app/[slug]/hours.ts
 * Shared helpers for business-hours display on the member page.
 * Consumed by HeroSection (status pill) and ContactSection (hours card).
 */

import type { BusinessHours, DayKey } from './types'

export const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

export const DAY_FULL: Record<DayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

export function toMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h % 24) * 60 + m
}

export function fmt12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return m === 0 ? `${hour} ${period}` : `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

export function getTodayKey(timezone: string): DayKey {
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' })
    .format(new Date()).toLowerCase() as DayKey
}

export function getStatus(hours: BusinessHours): { isOpen: boolean; label: string } {
  const tz = hours.timezone || 'UTC'
  const now = new Date()
  const todayKey = getTodayKey(tz)
  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now)
  const [hStr, mStr] = timeStr.split(':')
  const currentMins = (parseInt(hStr) % 24) * 60 + parseInt(mStr)
  const today = hours[todayKey]

  if (today) {
    const openM = toMins(today.open)
    const closeM = toMins(today.close)
    if (currentMins >= openM && currentMins < closeM) {
      return { isOpen: true, label: `Open · closes ${fmt12(today.close)}` }
    }
    if (currentMins < openM) {
      return { isOpen: false, label: `Closed · opens ${fmt12(today.open)}` }
    }
  }

  const todayIdx = DAY_ORDER.indexOf(todayKey)
  for (let i = 1; i <= 7; i++) {
    const nextKey = DAY_ORDER[(todayIdx + i) % 7]
    const next = hours[nextKey]
    if (next) {
      const dayLabel = i === 1 ? 'tomorrow' : DAY_FULL[nextKey].toLowerCase()
      return { isOpen: false, label: `Closed · opens ${dayLabel} ${fmt12(next.open)}` }
    }
  }

  return { isOpen: false, label: 'Closed' }
}
