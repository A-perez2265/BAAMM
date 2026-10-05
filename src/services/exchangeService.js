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

async function withSkillAndLearner(exchanges) {
  if (!exchanges?.length) {
    return []
  }

  const skillIds = [
    ...new Set(exchanges.map((exchange) => exchange.skill_id).filter(Boolean)),
  ]
  const learnerIds = [
    ...new Set(exchanges.map((exchange) => exchange.learner_id)),
  ]
  const teacherIds = [
    ...new Set(exchanges.map((exchange) => exchange.teacher_id)),
  ]
  const profileIds = [...new Set([...learnerIds, ...teacherIds])]

  const [{ data: skills }, { data: profiles }] = await Promise.all([
    skillIds.length
      ? supabase.from('skills').select('id, title, category').in('id', skillIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('profiles')
      .select('id, display_name, username')
      .in('id', profileIds),
  ])

  const skillsById = Object.fromEntries(
    (skills ?? []).map((skill) => [skill.id, skill])
  )
  const profilesById = Object.fromEntries(
    (profiles ?? []).map((profile) => [profile.id, profile])
  )

  return exchanges.map((exchange) => ({
    ...exchange,
    skill: skillsById[exchange.skill_id] ?? null,
    learner: profilesById[exchange.learner_id] ?? null,
    teacher: profilesById[exchange.teacher_id] ?? null,
  }))
}

export async function getActiveExchangesForUser(userId) {
  const { data: exchanges, error } = await supabase
    .from('exchanges')
    .select('*')
    .or(`learner_id.eq.${userId},teacher_id.eq.${userId}`)
    .in('status', [
      EXCHANGE_STATUS.PENDING,
      EXCHANGE_STATUS.ACCEPTED,
      EXCHANGE_STATUS.SESSION_COMPLETED,
      EXCHANGE_STATUS.AWAITING_CONFIRMATION,
    ])
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return withSkillAndLearner(exchanges)
}

export async function getCompletedCreditCounts(userId) {
  const { data, error } = await supabase
    .from('exchanges')
    .select('learner_id, teacher_id')
    .eq('status', EXCHANGE_STATUS.COMPLETED)

  if (error) {
    throw error
  }

  const rows = data ?? []

  return {
    earned: rows.filter((row) => row.teacher_id === userId).length,
    spent: rows.filter((row) => row.learner_id === userId).length,
  }
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

  return withSkillAndLearner(exchanges)
}

export async function getAcceptedTeachingExchanges(teacherId) {
  const { data: exchanges, error } = await supabase
    .from('exchanges')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('status', EXCHANGE_STATUS.ACCEPTED)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return withSkillAndLearner(exchanges)
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

export async function markExchangeComplete({ exchangeId, teacherId }) {
  const { data, error } = await supabase
    .from('exchanges')
    .update({
      status: EXCHANGE_STATUS.SESSION_COMPLETED,
      updated_at: new Date().toISOString(),
    })
    .eq('id', exchangeId)
    .eq('teacher_id', teacherId)
    .eq('status', EXCHANGE_STATUS.ACCEPTED)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getAwaitingLearnerConfirmation(learnerId) {
  const { data: exchanges, error } = await supabase
    .from('exchanges')
    .select('*')
    .eq('learner_id', learnerId)
    .in('status', [
      EXCHANGE_STATUS.SESSION_COMPLETED,
      EXCHANGE_STATUS.AWAITING_CONFIRMATION,
    ])
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return withSkillAndLearner(exchanges)
}

export async function confirmExchange({ exchangeId, learnerId }) {
  const runComplete = () =>
    supabase.rpc('complete_exchange', {
      p_exchange_id: exchangeId,
      p_credit_amount: 1,
    })

  let { data, error } = await runComplete()

  if (error?.message?.toLowerCase().includes('confirmable status')) {
    const { error: statusError } = await supabase
      .from('exchanges')
      .update({
        status: EXCHANGE_STATUS.ACCEPTED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', exchangeId)
      .eq('learner_id', learnerId)

    if (statusError) {
      throw statusError
    }

    ;({ data, error } = await runComplete())
  }

  if (!error) {
    return data
  }

  const rpcMissing =
    error.code === 'PGRST202' ||
    error.message?.toLowerCase().includes('could not find the function')

  if (!rpcMissing) {
    throw error
  }

  const { data: updated, error: updateError } = await supabase
    .from('exchanges')
    .update({
      status: EXCHANGE_STATUS.COMPLETED,
      updated_at: new Date().toISOString(),
    })
    .eq('id', exchangeId)
    .eq('learner_id', learnerId)
    .eq('status', EXCHANGE_STATUS.AWAITING_CONFIRMATION)
    .select()
    .single()

  if (updateError) {
    throw updateError
  }

  return updated
}
