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

export const EMPTY_SEARCH_FILTERS = {
  category: 'all',
  format: 'all',
  experienceLevel: 'all',
  language: 'all',
}

export function skillMatchesFilters(skill, filters) {
  const active = filters || EMPTY_SEARCH_FILTERS

  if (active.category !== 'all' && skill.category !== active.category) {
    return false
  }

  if (active.format !== 'all' && skill.format !== active.format) {
    return false
  }

  if (active.experienceLevel !== 'all' && skill.experience_level !== active.experienceLevel) {
    return false
  }

  if (active.language !== 'all' && skill.language !== active.language) {
    return false
  }

  return true
}

export function getPrefixMatchedTags(tags, query) {
  const needle = query.toLowerCase().trim()

  if (needle.length < 3) {
    return []
  }

  return tags.filter((tag) => (tag.name || '').toLowerCase().startsWith(needle))
}
