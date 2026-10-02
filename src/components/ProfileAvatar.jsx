import { AVATAR_OPTIONS } from '../constants/avatarOptions'

export default function ProfileAvatar({ avatarId, initials = 'SS', decorative = false }) {
  const avatar = AVATAR_OPTIONS.find(option => option.id === avatarId)
  if (!avatar) return <span className="avatar avatar-initials" aria-hidden={decorative || undefined}>{initials}</span>
  const dimension = 1254
  // Exclude the illustrated ring. CSS supplies the single, consistent outer border.
  const inset = Math.max(6, Math.round(Math.min(avatar.width, avatar.height) * 0.025))
  const width = avatar.width - inset * 2
  const height = avatar.height - inset * 2
  return <span className="avatar animal-avatar" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : avatar.name} aria-hidden={decorative || undefined}>
    <span className="animal-avatar-art" style={{
      backgroundImage: `url(${avatar.sheet})`,
      backgroundSize: `${dimension / width * 100}% ${dimension / height * 100}%`,
      backgroundPosition: `${(avatar.x + inset) / (dimension - width) * 100}% ${(avatar.y + inset) / (dimension - height) * 100}%`,
    }} />
  </span>
}
