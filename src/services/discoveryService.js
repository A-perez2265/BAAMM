import { supabase } from '../utils/supabaseClient'

export async function getDiscoverableSkills(currentUserId) {
  const { data, error } = await supabase
    .from('skills')
    .select(
      'id, title, description, category, user_id, listing_type, tags, experience_level, format, language, location'
    )
    .eq('listing_type', 'Teacher')
    .neq('user_id', currentUserId)
    .order('title', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export function skillMatchesQuery(skill, query) {
  const needle = query.toLowerCase().trim()

  if (!needle) {
    return true
  }

  const tagText = Array.isArray(skill.tags)
    ? skill.tags.join(' ')
    : skill.tags || ''

  const haystack = [
    skill.title,
    skill.description,
    skill.category,
    skill.language,
    skill.location,
    tagText,
  ]

  return haystack.some((value) => (value || '').toLowerCase().includes(needle))
}
