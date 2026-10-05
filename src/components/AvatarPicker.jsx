import { AVATAR_OPTIONS } from '../constants/avatarOptions'
import ProfileAvatar from './ProfileAvatar'

export default function AvatarPicker({ value, onChange, initials }) {
  return <fieldset className="avatar-picker full-width">
    <legend>Choose your avatar</legend>
    <p className="field-help">Pick a character that feels like you. Save profile to keep your choice.</p>
    <div className="avatar-options">
      {[{ id: '', name: 'Use my initials' }, ...AVATAR_OPTIONS].map(avatar => (
        <button key={avatar.id} type="button" className="avatar-option" aria-label={avatar.name} aria-pressed={(value || '') === avatar.id} title={avatar.name} onClick={() => onChange(avatar.id || null)}>
          <ProfileAvatar avatarId={avatar.id} initials={initials} decorative />
          <span className="avatar-tooltip" aria-hidden="true">{avatar.name}</span>
          {(value || '') === avatar.id && <span className="avatar-check" aria-hidden="true">✓</span>}
        </button>
      ))}
    </div>
    <p className="sr-only" role="status">Selected: {AVATAR_OPTIONS.find(avatar => avatar.id === value)?.name || 'Your initials'}.</p>
  </fieldset>
}
