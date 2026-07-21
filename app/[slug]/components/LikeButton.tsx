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
    // Same-device UX hint only — the actual dedupe/toggle is server-side by
    // salted-IP hash (see /api/track), so this is just a fast local guess
    // for the initial icon state, not a security boundary.
    const key = `kryla_liked_${slug}`
    if (typeof window !== 'undefined' && localStorage.getItem(key)) setLiked(true)

    fetch(`/api/track?providerId=${providerId}`)
      .then(r => r.json())
      .then(data => setLikes(data.likes ?? 0))
      .catch(() => setLikes(0))
  }, [providerId, slug])

  // Toggles: liking again un-reacts. Previously this button locked after
  // one click (localStorage-only, disabled={liked}) with no way back, and
  // clearing storage / incognito / another device let the same visitor
  // like unlimited times since there was no server-side dedupe at all.
  async function handleLike() {
    const key = `kryla_liked_${slug}`
    if (loading) return
    setLoading(true)
    try {
      const res  = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, eventType: 'like' }),
      })
      const data = await res.json()
      if (typeof data.likes === 'number') setLikes(data.likes)
      if (typeof data.liked === 'boolean') {
        setLiked(data.liked)
        if (data.liked) localStorage.setItem(key, '1')
        else localStorage.removeItem(key)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={loading}
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
