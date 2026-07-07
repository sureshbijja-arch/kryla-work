/**
 * app/[slug]/hours.ts
 * Shared helpers for business-hours display on the member page.
 * Consumed by HeroSection (status pill) and ContactSection (hours card).
 * Supports per-date exceptions (holidays, leave, special hours) stored in
 * `BusinessHours.exceptions[]`, which take priority over the weekly template.
 */

import type { BusinessHours, DayKey, HoursException } from './types'

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

/**
 * Get a YYYY-MM-DD date string in the given timezone, shifted by `offsetDays`.
 * Uses date-part extraction (no string splitting on ISO) to stay correct across DST.
 */
export function getDateStr(timezone: string, offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** The JS day-of-week index (0=Sun) for a YYYY-MM-DD string in UTC */
function dateToDayKey(dateStr: string): DayKey {
  const [y, mo, d] = dateStr.split('-').map(Number)
  // Using UTC date gives the correct weekday for the calendar date
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay() // 0=Sun..6=Sat
  const map: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return map[dow]
}

/** Find a matching exception for a given YYYY-MM-DD date */
export function findException(hours: BusinessHours, dateStr: string): HoursException | undefined {
  return (hours.exceptions ?? []).find(e => e.date === dateStr)
}

export function getStatus(hours: BusinessHours): { isOpen: boolean; label: string } {
  const tz = hours.timezone || 'UTC'
  const now = new Date()

  // Current time in minutes since midnight, in the member's timezone
  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now)
  const [hStr, mStr] = timeStr.split(':')
  const currentMins = (parseInt(hStr) % 24) * 60 + parseInt(mStr)

  const todayDateStr = getDateStr(tz, 0)
  const todayKey     = getTodayKey(tz)

  // Resolve today's effective open/close from exception first, then weekly fallback
  const todayExc = findException(hours, todayDateStr)

  if (todayExc?.closed) {
    // Closed today by exception — find next open day
    const nextLabel = findNextOpenLabel(hours, tz, todayDateStr)
    const closedLabel = todayExc.note ? `Closed · ${todayExc.note}` : `Closed${nextLabel ? ` · ${nextLabel}` : ''}`
    return { isOpen: false, label: closedLabel }
  }

  // Effective hours: exception special hours, or weekly schedule
  const effectiveHours: { open: string; close: string } | null =
    (todayExc?.open && todayExc?.close)
      ? { open: todayExc.open, close: todayExc.close }
      : (hours[todayKey] ?? null)

  if (effectiveHours) {
    const openM  = toMins(effectiveHours.open)
    const closeM = toMins(effectiveHours.close)
    if (currentMins >= openM && currentMins < closeM) {
      return { isOpen: true, label: `Open · closes ${fmt12(effectiveHours.close)}` }
    }
    if (currentMins < openM) {
      return { isOpen: false, label: `Closed · opens ${fmt12(effectiveHours.open)}` }
    }
  }

  // Past close (or no hours today) — look ahead for next open day
  const nextLabel = findNextOpenLabel(hours, tz, todayDateStr)
  return { isOpen: false, label: nextLabel ? `Closed · ${nextLabel}` : 'Closed' }
}

/**
 * Scan up to 14 calendar days ahead to find the next day the business is open,
 * respecting both exceptions and the weekly schedule.
 * Returns a label like "opens tomorrow 9 AM" or "opens Friday 9 AM", or '' if none found.
 */
function findNextOpenLabel(hours: BusinessHours, tz: string, todayDateStr: string): string {
  for (let i = 1; i <= 14; i++) {
    const dateStr = getDateStr(tz, i)
    const exc     = findException(hours, dateStr)
    if (exc?.closed) continue

    // Special hours for this date
    if (exc?.open && exc?.close) {
      const dayLabel = i === 1 ? 'tomorrow' : getDayOfWeekLabel(dateStr, todayDateStr)
      return `opens ${dayLabel} ${fmt12(exc.open)}`
    }

    // Fall back to weekly schedule
    const dayKey = dateToDayKey(dateStr)
    const weeklyHours = hours[dayKey]
    if (weeklyHours) {
      const dayLabel = i === 1 ? 'tomorrow' : getDayOfWeekLabel(dateStr, todayDateStr)
      return `opens ${dayLabel} ${fmt12(weeklyHours.open)}`
    }
  }
  return ''
}

/** Return "Monday" / "Tuesday" etc for a future date (abbreviated if far) */
function getDayOfWeekLabel(dateStr: string, todayDateStr: string): string {
  const [ty, tm, td] = todayDateStr.split('-').map(Number)
  const [dy, dm, dd] = dateStr.split('-').map(Number)
  const diffDays = Math.round(
    (Date.UTC(dy, dm - 1, dd) - Date.UTC(ty, tm - 1, td)) / 86_400_000
  )
  if (diffDays <= 7) {
    const dayKey = dateToDayKey(dateStr)
    return DAY_FULL[dayKey]
  }
  // More than a week away: "Mon, Dec 25"
  const dayKey = dateToDayKey(dateStr)
  const [, mo, d] = dateStr.split('-')
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${DAY_LABELS[dayKey]}, ${MONTHS[parseInt(mo) - 1]} ${parseInt(d)}`
}

/**
 * Return the next N upcoming exceptions (today onward), sorted ascending.
 * Used by HoursCard to show upcoming closures/special days to visitors.
 */
export function getUpcomingExceptions(hours: BusinessHours, tz: string, limit = 5): HoursException[] {
  const todayStr = getDateStr(tz, 0)
  return (hours.exceptions ?? [])
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)
}

/** Format a YYYY-MM-DD date into a human label like "Dec 25, 2026" */
export function fmtExceptionDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${MONTHS[mo - 1]} ${d}, ${y}`
}
