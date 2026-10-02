import { assertPublicFields } from '../utils/publicTextPrivacy'
import { supabase } from '../utils/supabaseClient'
import { parseTags } from '../utils/skillUtils'

// Retrieves all skills belonging to a specific user
export async function getSkills(userId) {
  const { data, error } = await supabase
    .from('skills')
    .select('id, user_id, title, description, category, listing_type, tags, experience_level, format, language, location, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

// Adds a new skill for a specific user
export async function addSkill(userId, skill) {
  assertPublicFields(skill)
  const { data, error } = await supabase
    .from('skills')
    .insert({
      user_id: userId,
      title: skill.title.trim(),
      description: skill.description.trim(),
      category: skill.category.trim(),
      listing_type: skill.listingType,
      tags: parseTags(skill.tags),
      experience_level: skill.experienceLevel?.trim() || null,
      format: skill.format.trim(),
      language: skill.language.trim(),
      location: skill.location?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

// Updates an existing skill belonging to a specific user
export async function updateSkill(userId, skillId, skill) {
  assertPublicFields(skill)
  const { data, error } = await supabase
    .from('skills')
    .update({
      title: skill.title.trim(),
      description: skill.description.trim(),
      category: skill.category.trim(),
      listing_type: skill.listingType,
      tags: parseTags(skill.tags),
      experience_level: skill.experienceLevel?.trim() || null,
      format: skill.format.trim(),
      language: skill.language.trim(),
      location: skill.location?.trim() || null,
    })
    .eq('id', skillId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

// Deletes an existing skill belonging to a specific user
export async function deleteSkill(userId, skillId) {
  const { data, error } = await supabase
    .from('skills')
    .delete()
    .eq('id', skillId)
    .eq('user_id', userId)
    .select('id')

  if (error) {
    throw error
  }
  if (!data?.length) throw new Error('Skill was not removed. Check ownership and permissions.')
}