import { capitalizeWords, capitalizeSentences, formatTags } from '../../utils/skillUtils'
import { CATEGORIES, EXPERIENCE_LEVELS, FORMATS, LANGUAGES, LISTING_TYPES } from '../../constants/skillOptions'

export default function SkillForm({ skill, setSkill, onSubmit, onCancel, submitLabel, busy }) {
  const change = (key) => (event) => setSkill(current => ({ ...current, [key]: event.target.value }))
  const normalize = (key, format) => () => setSkill(current => ({ ...current, [key]: format(current[key]) }))
  const select = (key, label, options) => (
    <label key={key}>{label} <span className="required-note">(required)</span>
      <select required value={skill[key]} onChange={change(key)}>
        <option value="">Choose {label.toLowerCase()}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
  return (
    <form onSubmit={onSubmit} aria-busy={busy}>
      <p className="field-help">Keep these public details free of emails, phone numbers, and street addresses.</p>
      <fieldset disabled={busy} className="form-grid">
        <legend className="sr-only">Skill listing details</legend>
        <label className="full-width">Skill name <span className="required-note">(required)</span><input autoFocus required maxLength={100} placeholder="e.g. Beginner guitar lessons" autoCapitalize="words" value={skill.title} onChange={change('title')} onBlur={normalize('title', capitalizeWords)} /></label>
        <label className="full-width">Description <span className="required-note">(required)</span><textarea required maxLength={1000} rows={4} placeholder="What can someone learn with you?" autoCapitalize="sentences" value={skill.description} onChange={change('description')} onBlur={normalize('description', capitalizeSentences)} /></label>
        {select('category', 'Category', CATEGORIES)}
        {select('listingType', 'Listing type', LISTING_TYPES)}
        {select('experienceLevel', 'Experience level', EXPERIENCE_LEVELS)}
        {select('format', 'Format', FORMATS)}
        {select('language', 'Language', LANGUAGES)}
        <label>City, state/region <span className="required-note">(optional)</span><input placeholder="San Antonio, TX" aria-describedby="skill-location-help" value={skill.location} onChange={change('location')} /><span id="skill-location-help" className="field-help">A broad area only, never an exact address.</span></label>
        <label className="full-width">Tags <span className="required-note">(optional)</span><input maxLength={200} placeholder="#guitar #music #beginner" aria-describedby="tags-help" value={skill.tags} onChange={change('tags')} onBlur={normalize('tags', formatTags)} /><span id="tags-help" className="field-help">Use hashtags, or separate tags with spaces or commas. They’ll appear as individual hashtags.</span></label>
      </fieldset>
      <div className="form-actions"><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button><button type="button" disabled={busy} onClick={onCancel}>Cancel</button></div>
    </form>
  )
}
