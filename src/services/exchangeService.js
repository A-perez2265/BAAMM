import { supabase } from '../utils/supabaseClient'
import { EXCHANGE_STATUS } from '../constants/exchangeStatus'

export async function getCreditsBalance(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data.credits_balance ?? 0
}

export async function getRequestableSkills(currentUserId) {
  const { data, error } = await supabase
    .from('skills')
    .select(
      'id, title, description, category, user_id, listing_type, format, language, location, experience_level'
    )
    .eq('listing_type', 'Teacher')
    .neq('user_id', currentUserId)
    .order('title', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createExchangeRequest({
  learnerId,
  teacherId,
  skillId,
  message,
}) {
  const trimmedMessage = message.trim()

  if (!trimmedMessage) {
    throw new Error('A short message is required.')
  }

  if (!skillId || !teacherId) {
    throw new Error('Select a skill listing.')
  }

  if (learnerId === teacherId) {
    throw new Error('You cannot request an exchange with yourself.')
  }

  const credits = await getCreditsBalance(learnerId)

  if (credits < 1) {
    throw new Error('You need at least 1 credit to request an exchange.')
  }

  const { data, error } = await supabase
    .from('exchanges')
    .insert({
      learner_id: learnerId,
      teacher_id: teacherId,
      skill_id: skillId,
      message: trimmedMessage,
      status: EXCHANGE_STATUS.PENDING,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
