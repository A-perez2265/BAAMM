import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import { getSkills } from '../services/skillService'
import { getProfile, saveProfile } from '../services/profileService'
import { emptyProfile, formatProfile, prepareProfile, validateProfile } from '../utils/profileUtils'
import { formatSkillFromDatabase } from '../utils/skillUtils'
import SkillCard from '../components/skills/SkillCard'

export default function ProfilePage() {
  const { profileId } = useParams()
  const [profile, setProfile] = useState(emptyProfile)
  const [skills, setSkills] = useState([])
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
      showError(saveError.code === '23505'
        ? 'That username is already taken. Try another one.'
        : 'Your profile could not be saved. Your edits are still here; please try again.')
    } finally { setSaving(false) }
  }

  const initials = profile.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'SS'
  return (
    <main id="main-content" className="community-page" tabIndex={-1}>
      <div className="page-heading"><div><p className="eyebrow">Your community, your skills</p><h1>{profileId && !isOwner ? 'Member profile' : 'My profile'}</h1><p>A little about you. A lot you can share.</p></div></div>
      <p role="status" className={message ? 'notice success' : 'sr-only'}>{message}</p>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="notice error">{error}</p>}
      {loading ? <p role="status" className="panel">Loading profile…</p> : userId && (
        <>
          <section className="panel profile-panel" aria-label="Profile details">
            {isEditing ? (
              <form onSubmit={handleSave} aria-busy={saving}>
                <h2>Edit profile</h2><p className="form-intro">These details appear on your public profile. Keep contact details and exact addresses private.</p>
                <fieldset disabled={saving} className="form-grid">
                  <legend className="sr-only">Public profile information</legend>
                  <label>Display name <span className="required-note">(required)</span><input autoFocus required maxLength={80} autoComplete="nickname" value={draft.displayName} onChange={event => setDraft({ ...draft, displayName: event.target.value })} /></label>
                  <label>Username <span className="required-note">(required)</span><input required minLength={3} maxLength={30} autoCapitalize="none" spellCheck={false} aria-describedby="username-help" value={draft.username} onChange={event => setDraft({ ...draft, username: event.target.value })} /><span id="username-help" className="field-help">3–30 letters, numbers, periods, hyphens, or underscores.</span></label>
                  <label className="full-width">Bio<textarea maxLength={500} rows={4} aria-describedby="bio-help" value={draft.bio} onChange={event => setDraft({ ...draft, bio: event.target.value })} /><span id="bio-help" className="field-help">Share your interests and what you enjoy teaching. Up to 500 characters.</span></label>
                  <label className="full-width">City, state/region <span className="required-note">(required)</span><input required placeholder="San Antonio, TX" aria-describedby="location-help" value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })} /><span id="location-help" className="field-help">Use a broad area. Leave out your street address and live location.</span></label>
                </fieldset>
                <div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button><button type="button" disabled={saving} onClick={() => { setError(''); closeEditor() }}>Cancel</button></div>
              </form>
            ) : (
              <><div className="profile-header"><div className="avatar" aria-hidden="true">{initials}</div><div className="profile-identity"><h2>{profile.displayName || 'Make yourself at home'}</h2>{profile.username && <p>@{profile.username}</p>}{profile.location && <p className="profile-location">{profile.location}</p>}</div>{isOwner && <button ref={editButton} onClick={() => { setDraft(profile); setError(''); setMessage(''); setIsEditing(true) }}>Edit profile</button>}</div><div className="profile-bio"><h3>About</h3><p>{profile.bio || 'A little introduction goes a long way. Add a bio to help the community get to know you.'}</p></div></>
            )}
          </section>
          <section aria-labelledby="profile-skills-title"><div className="section-heading"><div><h2 id="profile-skills-title">Skill portfolio</h2><p>Knowledge worth sharing. Something new to learn.</p></div>{isOwner && <Link className="button-link" to="/skills">Manage skills</Link>}</div>{skills.length ? <div className="skills-grid">{skills.map(skill => <SkillCard key={skill.id} skill={skill} />)}</div> : <div className="panel empty-state"><h3>Every skill starts somewhere</h3><p>{isOwner ? 'Add your first skill to let others know what you can share.' : 'This member has not listed any skills yet.'}</p>{isOwner && <Link className="button-link" to="/skills">Add your first skill</Link>}</div>}</section>
        </>
      )}
    </main>
  )
}
