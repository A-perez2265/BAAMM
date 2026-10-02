import AvatarPicker from '../components/AvatarPicker'
import ProfileAvatar from '../components/ProfileAvatar'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import { getSkills } from '../services/skillService'
import { getProfile, saveProfile } from '../services/profileService'
import { privacyMessage } from '../utils/publicTextPrivacy'
import { emptyProfile, formatProfile, prepareProfile, validateProfile } from '../utils/profileUtils'
import { formatSkillFromDatabase, capitalizeSentences } from '../utils/skillUtils'
import SkillCard from '../components/skills/SkillCard'
import SkillFilters from '../components/skills/SkillFilters'
import CommunityIcon from '../components/CommunityIcon'

export default function ProfilePage() {
  const { profileId } = useParams()
  const [profile, setProfile] = useState(emptyProfile)
  const [skills, setSkills] = useState([])
  const [roleFilter, setRoleFilter] = useState('All')
  const [draft, setDraft] = useState(emptyProfile)
  const [userId, setUserId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const editButton = useRef(null)
  const errorRef = useRef(null)
  const isOwner = Boolean(userId && (!profileId || profileId === userId))

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setUserId(null)
      setError('')
      setMessage('')
      setIsEditing(false)
      setRoleFilter('All')
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!user) throw new Error('Sign in to view profiles.')
        const id = profileId || user.id
        const [savedProfile, savedSkills] = await Promise.all([getProfile(id), getSkills(id)])
        if (active) {
          setUserId(user.id)
          setProfile(formatProfile(savedProfile))
          setSkills(savedSkills.map(formatSkillFromDatabase))
        }
      } catch {
        if (active) setError('Unable to load this profile. Please refresh to try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [profileId])

  function showError(text) {
    setError(text)
    requestAnimationFrame(() => errorRef.current?.focus())
  }
  function closeEditor() {
    setIsEditing(false)
    requestAnimationFrame(() => editButton.current?.focus())
  }
  async function handleSave(event) {
    event.preventDefault()
    if (saving || !isOwner) return
    const prepared = prepareProfile(draft)
    const validationError = validateProfile(prepared)
    if (validationError) { showError(validationError); return }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const saved = await saveProfile(userId, prepared)
      setProfile(formatProfile(saved))
      setMessage('Profile saved. Your changes are now visible on your profile.')
      closeEditor()
    } catch (saveError) {
      showError(saveError.code === 'AVATAR_NOT_ENABLED'
        ? saveError.message
        : saveError.code === 'PUBLIC_CONTACT_DETAILS' || saveError.message?.includes('PUBLIC_CONTACT_DETAILS')
        ? privacyMessage
        : saveError.code === '23505'
        ? 'That username is already taken. Try another one.'
        : 'Your profile could not be saved. Your edits are still here; please try again.')
    } finally { setSaving(false) }
  }

  const initials = profile.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'SS'
  return (
    <main id="main-content" className="community-page profile-page" tabIndex={-1}>
      <p role="status" className={message ? 'notice success' : 'sr-only'}>{message}</p>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="notice error">{error}</p>}
      {loading ? <p role="status" className="panel">Loading profile…</p> : userId && (
        <div className={`profile-layout ${isEditing ? 'profile-layout-editing' : ''}`}>
          <section className="panel profile-panel" aria-label="Profile details">
            {isEditing ? (
              <form onSubmit={handleSave} aria-busy={saving}>
                <h1>Edit profile</h1><p className="form-intro">These details appear on your public profile. Keep contact details and exact addresses private.</p>
                <fieldset disabled={saving} className="form-grid">
                  <legend className="sr-only">Public profile information</legend>
                  <AvatarPicker value={draft.avatarId} initials={initials} onChange={avatarId => setDraft(current => ({ ...current, avatarId }))} />
                  <label>Display name <span className="required-note">(required)</span><input autoFocus required maxLength={80} autoComplete="nickname" value={draft.displayName} onChange={event => setDraft({ ...draft, displayName: event.target.value })} /></label>
                  <label>Username <span className="required-note">(required)</span><input required minLength={3} maxLength={30} autoCapitalize="none" spellCheck={false} aria-describedby="username-help" value={draft.username} onChange={event => setDraft({ ...draft, username: event.target.value })} /><span id="username-help" className="field-help">3–30 letters, numbers, periods, hyphens, or underscores.</span></label>
                  <label className="full-width">Bio<textarea autoCapitalize="sentences" onBlur={() => setDraft(current => ({ ...current, bio: capitalizeSentences(current.bio) }))} maxLength={500} rows={4} aria-describedby="bio-help" value={draft.bio} onChange={event => setDraft({ ...draft, bio: event.target.value })} /><span id="bio-help" className="field-help">Share your interests and what you enjoy teaching. No emails, phone numbers, or street addresses. Up to 500 characters.</span></label>
                  <label className="full-width">City, state/region <span className="required-note">(required)</span><input required placeholder="San Antonio, TX" aria-describedby="location-help" value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })} /><span id="location-help" className="field-help">Use a broad area. Leave out your street address and live location.</span></label>
                </fieldset>
                <div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button><button type="button" disabled={saving} onClick={() => { setError(''); closeEditor() }}>Cancel</button></div>
              </form>
            ) : (
              <>
                <div className="profile-header">
                  <ProfileAvatar avatarId={profile.avatarId} initials={initials} />
                  <div className="profile-identity"><h1>{profile.displayName || 'Your profile'}</h1>{profile.username && <p>@{profile.username}</p>}{profile.location && <p className="profile-location"><CommunityIcon name="location" />{profile.location}</p>}</div>
                  {isOwner && <button className="primary-button" ref={editButton} onClick={() => { setDraft(profile); setError(''); setMessage(''); setIsEditing(true) }}>Edit profile</button>}
                </div>
                <div className="profile-bio"><h2>About me</h2><p>{profile.bio || (isOwner ? 'Share your interests and what you enjoy teaching in your bio.' : 'This member has not added a bio yet.')}</p></div>
                <div className="profile-counts" aria-label="Portfolio summary">
                  <p><strong>{skills.filter(skill => skill.listingType === 'Teacher').length}</strong><span>Skills to teach</span></p>
                  <p><strong>{skills.filter(skill => skill.listingType === 'Learner').length}</strong><span>Skills to learn</span></p>
                </div>
              </>
            )}
          </section>
          <section className="profile-portfolio" aria-labelledby="profile-skills-title">
            <div className="section-heading"><h2 id="profile-skills-title">Skill portfolio <span className="count">{skills.length}</span></h2>{isOwner && <Link className="button-link" to="/skills">Manage skills</Link>}</div>
            <SkillFilters skills={skills} value={roleFilter} onChange={setRoleFilter} />
            <p className="sr-only" role="status">{skills.filter(skill => roleFilter === 'All' || skill.listingType === roleFilter).length} skills shown.</p>
            {skills.length ? (skills.some(skill => roleFilter === 'All' || skill.listingType === roleFilter)
              ? <div className="skills-grid">{skills.filter(skill => roleFilter === 'All' || skill.listingType === roleFilter).map(skill => <SkillCard key={skill.id} skill={skill} />)}</div>
              : <div className="panel empty-state"><h3>No {roleFilter.toLowerCase()} listings yet</h3><p>Select All to see the rest of this portfolio.</p><button onClick={() => setRoleFilter('All')}>Show all skills</button></div>)
              : <div className="panel empty-state"><h3>Every skill starts somewhere</h3><p>{isOwner ? 'Add your first skill to let others know what you can share or want to learn.' : 'This member has not listed any skills yet.'}</p>{isOwner && <Link className="button-link" to="/skills">Add your first skill</Link>}</div>}
          </section>
        </div>
      )}
    </main>
  )
}
