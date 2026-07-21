import { supabaseAdmin } from '@/lib/supabase/admin'

// Shared storage-delete helpers for the `profile-media` bucket.
//
// Every upload path in the app (avatar, gallery, service photo, section
// background, layout preset, imported images) writes to this bucket but,
// until now, nothing ever called `.remove()` — deletes/replaces only ever
// updated the DB reference, leaving the underlying file orphaned forever.
// These helpers are the single place that talks to Storage for deletion so
// every call site behaves consistently (fail-open, never blocks the DB
// write it's paired with).

const BUCKET = 'profile-media'

// Public URLs look like:
//   https://<project>.supabase.co/storage/v1/object/public/profile-media/<path>
// Extract just the <path> portion so we can pass it to `.remove()`.
function pathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(publicUrl.slice(idx + marker.length))
}

// Deletes a single object given its public URL. Non-fatal on any failure —
// logs and returns, since a storage-delete failure must never block the DB
// write it's paired with (mirrors the fail-open pattern in lib/rateLimit.ts).
export async function deleteStorageFile(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return
  const path = pathFromPublicUrl(publicUrl)
  if (!path) {
    console.error('[storage] could not parse path from URL, skipping delete:', publicUrl)
    return
  }
  try {
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path])
    if (error) console.error('[storage] delete failed:', path, error.message)
  } catch (err) {
    console.error('[storage] delete threw:', path, err)
  }
}

// Deletes every object under a folder prefix (e.g. `${providerId}/`).
// `.remove()` requires explicit paths, so this lists the folder (and its
// known subfolders, since Storage list() is not recursive) first.
export async function deleteStorageFolder(prefix: string): Promise<void> {
  const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`
  try {
    const { data: topLevel, error: listError } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(normalized.slice(0, -1), { limit: 1000 })
    if (listError) {
      console.error('[storage] folder list failed:', normalized, listError.message)
      return
    }
    if (!topLevel) return

    const paths: string[] = []
    for (const entry of topLevel) {
      // Entries with no `id` are subfolders (e.g. avatar/, gallery/, service/) — recurse one level.
      if (entry.id === null) {
        const { data: nested, error: nestedError } = await supabaseAdmin.storage
          .from(BUCKET)
          .list(`${normalized}${entry.name}`, { limit: 1000 })
        if (nestedError) {
          console.error('[storage] nested list failed:', entry.name, nestedError.message)
          continue
        }
        for (const nestedEntry of nested ?? []) {
          paths.push(`${normalized}${entry.name}/${nestedEntry.name}`)
        }
      } else {
        paths.push(`${normalized}${entry.name}`)
      }
    }

    if (paths.length === 0) return
    const { error: removeError } = await supabaseAdmin.storage.from(BUCKET).remove(paths)
    if (removeError) console.error('[storage] folder delete failed:', normalized, removeError.message)
  } catch (err) {
    console.error('[storage] folder delete threw:', normalized, err)
  }
}
