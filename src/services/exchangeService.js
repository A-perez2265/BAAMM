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

export async function getIncomingPendingRequests(teacherId) {
  const { data: exchanges, error } = await supabase
    .from('exchanges')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('status', EXCHANGE_STATUS.PENDING)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  if (!exchanges?.length) {
    return []
  }

  const skillIds = [
    ...new Set(exchanges.map((exchange) => exchange.skill_id).filter(Boolean)),
  ]
  const learnerIds = [
    ...new Set(exchanges.map((exchange) => exchange.learner_id)),
  ]

  const [{ data: skills }, { data: learners }] = await Promise.all([
    skillIds.length
      ? supabase.from('skills').select('id, title, category').in('id', skillIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('profiles')
      .select('id, display_name, username')
      .in('id', learnerIds),
  ])

  const skillsById = Object.fromEntries(
    (skills ?? []).map((skill) => [skill.id, skill])
  )
  const learnersById = Object.fromEntries(
    (learners ?? []).map((profile) => [profile.id, profile])
  )

  return exchanges.map((exchange) => ({
    ...exchange,
    skill: skillsById[exchange.skill_id] ?? null,
    learner: learnersById[exchange.learner_id] ?? null,
  }))
}

export async function respondToIncomingRequest({
  exchangeId,
  teacherId,
  nextStatus,
}) {
  const allowed = [EXCHANGE_STATUS.ACCEPTED, EXCHANGE_STATUS.DECLINED]

  if (!allowed.includes(nextStatus)) {
    throw new Error('Invalid response.')
  }

  const { data, error } = await supabase
    .from('exchanges')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', exchangeId)
    .eq('teacher_id', teacherId)
    .eq('status', EXCHANGE_STATUS.PENDING)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
