'use client'

import { useState, useEffect } from 'react'

export default function LikeButton({
  providerId,
  slug,
  accentColor = '#EC4899',
}: {
  providerId:   string
  slug:         string
  accentColor?: string
}) {
  const [likes, setLikes]   = useState<number | null>(null)
  const [liked, setLiked]   = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const key = `kryla_liked_${slug}`
    if (typeof window !== 'undefined' && localStorage.getItem(key)) setLiked(true)

    fetch(`/api/track?providerId=${providerId}`)
      .then(r => r.json())
      .then(data => setLikes(data.likes ?? 0))
      .catch(() => setLikes(0))
  }, [providerId, slug])

  async function handleLike() {
    const key = `kryla_liked_${slug}`
    if (liked || loading) return
    setLoading(true)
    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, eventType: 'like' }),
      })
      localStorage.setItem(key, '1')
      setLiked(true)
      setLikes(n => (n ?? 0) + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={liked || loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
        liked
          ? 'border-transparent text-white'
          : 'border-current bg-transparent hover:scale-105'
      }`}
      style={{
        background:  liked ? accentColor : 'transparent',
        color:       liked ? '#fff'      : accentColor,
        borderColor: liked ? 'transparent' : accentColor,
      }}>
      <span className="text-base">{liked ? '❤️' : '🤍'}</span>
      <span>{likes !== null ? likes : '…'}</span>
    </button>
  )
}
