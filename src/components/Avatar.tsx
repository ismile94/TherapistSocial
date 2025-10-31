import { useMemo, useState } from 'react'

interface AvatarProps {
  src?: string | null
  name?: string
  alt?: string
  size?: number
  className?: string
  useInlineSize?: boolean
}

function getInitials(name?: string) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase() || 'U'
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

export default function Avatar({ src, name, alt, size = 32, className = '', useInlineSize = true }: AvatarProps) {
  const [broken, setBroken] = useState(false)
  const displayAlt = alt || name || 'User'
  const initials = useMemo(() => getInitials(name), [name])
  const dimension = `${size}px`

  if (!src || broken) {
    return (
      <div
        className={`rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold ${className}`}
        style={useInlineSize ? { width: dimension, height: dimension, fontSize: Math.max(10, Math.floor(size * 0.4)) } : undefined}
        aria-label={displayAlt}
      >
        {initials}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={displayAlt}
      className={`rounded-full object-cover ${className}`}
      style={useInlineSize ? { width: dimension, height: dimension } : undefined}
      onError={() => setBroken(true)}
      loading="lazy"
    />
  )
}
