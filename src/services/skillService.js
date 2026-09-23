import { supabase } from '../utils/supabaseClient'

// Retrieves all skills belonging to a specific user
export async function getSkills(userId) {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

// Adds a new skill for a specific user
export async function addSkill(userId, skill) {
  const { data, error } = await supabase
    .from('skills')
    .insert({
      user_id: userId,
      title: skill.title.trim(),
      description: skill.description.trim(),
      category: skill.category.trim(),
      listing_type: skill.listingType,
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
  const { data, error } = await supabase
    .from('skills')
    .update({
      title: skill.title.trim(),
      description: skill.description.trim(),
      category: skill.category.trim(),
      listing_type: skill.listingType,
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
  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', skillId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}