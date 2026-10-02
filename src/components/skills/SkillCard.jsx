export default function SkillCard({ skill, children }) {
  return (
    <article className="skill-card">
      <div className="card-labels">
        <span className="badge">{skill.category}</span>
        <span className="listing-label">{skill.listingType === 'Teacher' ? 'Teaching' : 'Learning'}</span>
      </div>
      <h3>{skill.title}</h3>
      <p className="skill-description">{skill.description}</p>
      <dl className="skill-details">
        {[
          ['Experience', skill.experienceLevel], ['Format', skill.format],
          ['Language', skill.language], ['Location', skill.location],
        ].filter(([, value]) => value).map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      {skill.tags && <p className="skill-tags">{skill.tags}</p>}
      {children && <div className="card-actions">{children}</div>}
    </article>
  )
}
