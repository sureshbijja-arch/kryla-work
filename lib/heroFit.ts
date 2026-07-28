import { supabaseAdmin } from '@/lib/supabase/admin'

// How far a full-bleed background image's aspect ratio can be from its box's
// before SmartImg's 'auto' fit gives up on cropping (cover) and switches to
// blurred-fill instead. See SmartImg.tsx for how this is applied.
export const DEFAULT_HERO_FIT_CROP_TOLERANCE = 1.35

export async function getHeroFitCropTolerance(admin: typeof supabaseAdmin = supabaseAdmin): Promise<number> {
  const { data } = await admin
    .from('system_config')
    .select('value')
    .eq('key', 'hero_fit')
    .single()
  const value = (data?.value as { cropTolerance?: unknown } | null)?.cropTolerance
  return typeof value === 'number' && value > 1 ? value : DEFAULT_HERO_FIT_CROP_TOLERANCE
}
