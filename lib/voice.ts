// Flip to true to route TTS through OpenAI instead of browser speechSynthesis.
// When false: zero cost, works everywhere, no API calls.
// When true: calls /api/my-space/tts — requires OPENAI_API_KEY in env.
const USE_OPENAI_TTS = false

let currentAudio: HTMLAudioElement | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
    currentUtterance = null
  }
}

export async function speak(text: string): Promise<void> {
  stopSpeaking()

  if (USE_OPENAI_TTS) {
    try {
      const res = await fetch('/api/my-space/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      currentAudio = audio
      audio.play()
      audio.onended = () => {
        URL.revokeObjectURL(url)
        currentAudio = null
      }
    } catch {
      // fall through to browser TTS on error
      browserSpeak(text)
    }
    return
  }

  browserSpeak(text)
}

function browserSpeak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = 1.05
  utter.pitch = 1
  // prefer a natural-sounding voice if available
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v =>
    v.name.includes('Samantha') ||   // macOS/iOS
    v.name.includes('Google UK') ||
    v.name.includes('Microsoft Aria') ||
    v.lang === 'en-GB'
  )
  if (preferred) utter.voice = preferred
  currentUtterance = utter
  utter.onend = () => { currentUtterance = null }
  window.speechSynthesis.speak(utter)
}
