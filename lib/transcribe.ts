/**
 * lib/transcribe.ts — shared OpenAI Whisper transcription helper.
 * Used by /api/mychat/transcribe (My Chat mic) and the WhatsApp webhook (voice notes).
 * Calls Whisper via raw fetch — no openai npm package required.
 * Language is NOT specified → Whisper auto-detects (supports 99 languages).
 */

export class TranscribeError extends Error {
  constructor(message: string, public readonly code: 'no_key' | 'api_error') {
    super(message)
    this.name = 'TranscribeError'
  }
}

/**
 * Transcribe an audio buffer using OpenAI Whisper (whisper-1).
 *
 * @param bytes     Raw audio bytes
 * @param filename  Filename with the correct extension, e.g. "audio.webm".
 *                  Whisper uses the extension to detect the codec.
 * @param mimeType  MIME type for the FormData Blob, e.g. "audio/webm" or "audio/ogg; codecs=opus".
 *                  Codec params are stripped internally.
 * @returns Trimmed transcript string
 * @throws TranscribeError (code 'no_key' | 'api_error')
 */
export async function transcribeAudio(
  bytes: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new TranscribeError('OPENAI_API_KEY is not set', 'no_key')
  }

  // Strip codec params so Whisper gets a clean MIME (e.g. "audio/webm" not "audio/webm; codecs=opus")
  const baseMime = mimeType.split(';')[0].trim()

  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(bytes)], { type: baseMime }), filename)
  form.append('model', 'whisper-1')
  // No `language` → auto-detect (Hindi, Tamil, Telugu, etc. all work)

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new TranscribeError(
      `Whisper API error ${res.status}: ${JSON.stringify(body)}`,
      'api_error',
    )
  }

  const data = await res.json()
  return (data.text ?? '').trim()
}
