export default function SkillFilters({ skills, value, onChange }) {
  return (
    <div className="skill-filters" role="group" aria-label="Filter skills by role">
      {['All', 'Teacher', 'Learner'].map(role => (
        <button key={role} type="button" className={`skill-filter ${role === 'Learner' ? 'learner-filter' : ''}`} aria-pressed={value === role} onClick={() => onChange(role)}>
          {role} <span>{role === 'All' ? skills.length : skills.filter(skill => skill.listingType === role).length}</span>
        </button>
      ))}
    </div>
  )
}
