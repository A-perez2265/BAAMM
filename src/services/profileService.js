import { assertPublicFields } from '../utils/publicTextPrivacy'
import { supabase } from '../utils/supabaseClient'

// Explicitly select public fields: never return credits, admin status, or contact details.
const publicFields = 'id, display_name, username, bio, location'

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles')
    .select(publicFields).eq('id', userId).single()
  if (error) throw error
  return data
}

export async function saveProfile(userId, profile) {
  assertPublicFields({ 'Display name': profile.displayName, Username: profile.username, Bio: profile.bio, Location: profile.location })
  // Only write fields owned by the profile editor. RLS must enforce ownership in Supabase.
  const { data, error } = await supabase.from('profiles').update({
    display_name: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    location: profile.location,
  }).eq('id', userId).select(publicFields).single()
  if (error) throw error
  return data
}
