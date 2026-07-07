import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { transcribeAudio, TranscribeError } from '@/lib/transcribe'

const MAX_BYTES = 4 * 1024 * 1024 // 4 MB — well under Vercel's 4.5 MB body limit

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 503 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as Blob | null
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Audio too large (max 4 MB)' }, { status: 413 })
  }

  const filename = (file as File).name ?? 'audio.webm'

  try {
    const text = await transcribeAudio(bytes, filename, file.type || 'audio/webm')
    return NextResponse.json({ text })
  } catch (err) {
    if (err instanceof TranscribeError && err.code === 'no_key') {
      return NextResponse.json({ error: err.message }, { status: 503 })
    }
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 })
  }
}
