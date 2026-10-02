import { parseTags } from '../../utils/skillUtils'
import CommunityIcon from '../CommunityIcon'
import { CATEGORY_ICONS, FORMAT_ICONS } from '../../constants/skillIcons'

export default function SkillCard({ skill, children }) {
  const tags = parseTags(skill.tags)
  return (
    <article className="skill-card">
      <div className="card-labels">
        <span className="badge"><CommunityIcon name={CATEGORY_ICONS[skill.category] || 'sparkles'} />{skill.category}</span>
        <span className={`listing-label ${skill.listingType === 'Teacher' ? 'listing-teaching' : 'listing-learning'}`}>{skill.listingType === 'Teacher' ? 'Teacher' : 'Learner'}</span>
      </div>
      <h3>{skill.title}</h3>
      <p className="skill-description">{skill.description}</p>
      <dl className="skill-details">
        {[
          ['Experience', skill.experienceLevel], ['Format', skill.format],
          ['Language', skill.language], ['Location', skill.location],
        ].filter(([, value]) => value).map(([label, value]) => (
          <div key={label}><CommunityIcon name={label === 'Format' ? FORMAT_ICONS[value] || 'format' : label.toLowerCase()} /><div><dt>{label}</dt><dd>{value}</dd></div></div>
        ))}
      </dl>
      {tags.length > 0 && <ul className="skill-tags" aria-label="Skill tags">{tags.map(tag => <li key={tag}>#{tag}</li>)}</ul>}
      {children && <div className="card-actions">{children}</div>}
    </article>
  )
}
