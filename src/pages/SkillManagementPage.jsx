import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import SkillForm from '../components/skills/SkillForm'
import SkillCard from '../components/skills/SkillCard'
import { createEmptySkill, formatSkillFromDatabase, prepareSkillForSave, validateSkill } from '../utils/skillUtils'
import { getSkills, addSkill, updateSkill, deleteSkill } from '../services/skillService'

export default function SkillManagementPage() {
  const [skills, setSkills] = useState([])
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editor, setEditor] = useState(null)
  const [draft, setDraft] = useState(createEmptySkill)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [removing, setRemoving] = useState(null)
  const errorRef = useRef(null)
  const addButton = useRef(null)
  const editorTrigger = useRef(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!user) throw new Error('Sign in to manage skills.')
        const data = await getSkills(user.id)
        if (active) { setUserId(user.id); setSkills(data.map(formatSkillFromDatabase)) }
      } catch {
        if (active) setError('Unable to load your skills. Please refresh to try again.')
      } finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [])

  function showError(text) {
    setError(text)
    requestAnimationFrame(() => errorRef.current?.focus())
  }
  function closeEditor() {
    setEditor(null)
    requestAnimationFrame(() => (editorTrigger.current?.isConnected ? editorTrigger.current : addButton.current)?.focus())
  }
  function openEditor(skill, trigger) {
    editorTrigger.current = trigger
    setEditor(skill ? skill.id : 'new')
    setDraft(skill ? { ...createEmptySkill(), ...skill, experienceLevel: skill.experienceLevel || '', location: skill.location || '' } : createEmptySkill())
    setRemoving(null)
    setError('')
    setMessage('')
  }
  async function save(event) {
    event.preventDefault()
    if (busy || !userId) return
    const prepared = prepareSkillForSave(draft)
    const validationError = validateSkill(prepared)
    if (validationError) { showError(validationError); return }
    setBusy(true)
    setError('')
    try {
      const saved = formatSkillFromDatabase(editor === 'new'
        ? await addSkill(userId, prepared)
        : await updateSkill(userId, editor, prepared))
      setSkills(current => editor === 'new' ? [saved, ...current] : current.map(skill => skill.id === editor ? saved : skill))
      setMessage(`${saved.title} ${editor === 'new' ? 'added' : 'updated'}. You can see it on your profile.`)
      closeEditor()
    } catch { showError('Unable to save this skill. Your edits are still here; please try again.') }
    finally { setBusy(false) }
  }
  async function remove(skill) {
    if (busy || !userId) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await deleteSkill(userId, skill.id)
      setSkills(current => current.filter(item => item.id !== skill.id))
      setRemoving(null)
      setMessage(`${skill.title} removed from your portfolio.`)
      requestAnimationFrame(() => addButton.current?.focus())
    } catch { showError('Unable to remove this skill. Please try again.') }
    finally { setBusy(false) }
  }

  return (
    <main id="main-content" className="community-page" tabIndex={-1}>
      <div className="page-heading"><div><p className="eyebrow">A little knowledge goes a long way</p><h1>My skills</h1><p>Share what you know. Explore what you could learn.</p></div><button ref={addButton} className="primary-button" disabled={loading || busy || !userId} onClick={event => openEditor(null, event.currentTarget)}>Add a skill</button></div>
      <p role="status" className={message ? 'notice success' : 'sr-only'}>{message}</p>
      {error && <p ref={errorRef} role="alert" tabIndex={-1} className="notice error">{error}</p>}
      {loading ? <p role="status" className="panel">Loading your skills…</p> : userId && <>
        {editor && <section className="panel skill-editor" aria-labelledby="editor-title"><h2 id="editor-title">{editor === 'new' ? 'Add a skill' : 'Edit your skill'}</h2><p className="form-intro">Help someone find their next learning moment. Keep contact details and exact addresses private.</p><SkillForm key={editor} skill={draft} setSkill={setDraft} onSubmit={save} onCancel={() => { setError(''); closeEditor() }} busy={busy} submitLabel={editor === 'new' ? 'Save skill' : 'Save changes'} /></section>}
        <section aria-labelledby="portfolio-title"><div className="section-heading"><div><h2 id="portfolio-title">Your portfolio <span className="count">{skills.length}</span></h2><p>Your listings also appear on your profile.</p></div><Link className="text-link" to="/profile">View my profile →</Link></div>
          {skills.length ? <div className="skills-grid">{skills.map(skill => <SkillCard key={skill.id} skill={skill}>
            {removing === skill.id ? <div className="remove-confirmation"><p id={`remove-${skill.id}`}>Remove “{skill.title}” from your portfolio?</p><button autoFocus className="danger-button" disabled={busy} aria-describedby={`remove-${skill.id}`} onClick={() => remove(skill)}>{busy ? 'Removing…' : 'Yes, remove'}</button><button disabled={busy} onClick={() => { setRemoving(null); requestAnimationFrame(() => document.getElementById(`remove-button-${skill.id}`)?.focus()) }}>Keep skill</button></div> : <><button disabled={busy} aria-label={`Edit ${skill.title}`} onClick={event => openEditor(skill, event.currentTarget)}>Edit</button><button id={`remove-button-${skill.id}`} className="text-button" disabled={busy} aria-label={`Remove ${skill.title}`} onClick={() => { setRemoving(skill.id); setMessage('') }}>Remove</button></>}
          </SkillCard>)}</div> : <div className="panel empty-state"><span className="empty-icon" aria-hidden="true">✦</span><h3>You know something worth sharing</h3><p>From baking to coding, every skill has a place here.<br />Add your first listing to get started.</p><button className="primary-button" disabled={busy} onClick={event => openEditor(null, event.currentTarget)}>Add your first skill</button></div>}
        </section>
      </>}
    </main>
  )
}
