import { isValidAvatarId } from '../constants/avatarOptions'
import { assertPublicFields } from '../utils/publicTextPrivacy'
import { supabase } from '../utils/supabaseClient'

// Explicitly select public fields: never return credits, admin status, or contact details.
const legacyFields = 'id, display_name, username, bio, location'
const publicFields = `${legacyFields}, avatar_id`
const missingAvatarColumn = error => ['42703', 'PGRST204'].includes(error?.code) && /avatar_id/i.test(error.message || '')

export async function getProfile(userId) {
  let { data, error } = await supabase.from('profiles')
    .select(publicFields).eq('id', userId).single()
  if (missingAvatarColumn(error)) {
    ({ data, error } = await supabase.from('profiles').select(legacyFields).eq('id', userId).single())
  }
  if (error) throw error
  return data
}

export async function saveProfile(userId, profile) {
  assertPublicFields({ 'Display name': profile.displayName, Username: profile.username, Bio: profile.bio, Location: profile.location })
  if (!isValidAvatarId(profile.avatarId ?? null)) throw new Error('Choose an avatar from the available options.')
  // Only write fields owned by the profile editor. RLS must enforce ownership in Supabase.
  const payload = {
    display_name: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    location: profile.location,
    avatar_id: profile.avatarId || null,
  }
  let { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select(publicFields).single()
  if (missingAvatarColumn(error)) {
    if (profile.avatarId) throw Object.assign(new Error('Avatar saving is not available yet. Please try again once it is enabled.'), { code: 'AVATAR_NOT_ENABLED' })
    const { avatar_id: _avatarId, ...legacyPayload } = payload
    void _avatarId
    ;({ data, error } = await supabase.from('profiles').update(legacyPayload).eq('id', userId).select(legacyFields).single())
  }
  if (error) throw error
  return data
}
