import { supabase } from '../utils/supabaseClient'

export function validateNewPassword(password, confirmation) {
  if (password.length < 8) return 'Use at least 8 characters for your new password.'
  if (password !== confirmation) return 'Your passwords do not match. Please enter them again.'
  return ''
}

export async function requestPasswordReset(email, origin) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: new URL('/reset-password', origin).href,
  })
  if (error) throw error
}

export async function updatePassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) throw error
  if (!data?.user) throw new Error('Unable to confirm the password update.')
}
