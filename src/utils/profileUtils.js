import { isValidGeneralLocation, formatGeneralLocation } from './skillUtils'

export const emptyProfile = { displayName: '', username: '', bio: '', location: '' }
export const formatProfile = (profile) => ({
  displayName: profile.display_name || '',
  username: profile.username || '',
  bio: profile.bio || '',
  location: profile.location || '',
})
export function prepareProfile(profile) {
  return {
    displayName: profile.displayName.trim(),
    username: profile.username.trim(),
    bio: profile.bio.trim(),
    location: formatGeneralLocation(profile.location),
  }
}
export function validateProfile(profile) {
  if (!profile.displayName || !profile.username || !profile.location) {
    return 'Enter a display name, username, and city/state.'
  }
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(profile.username)) {
    return 'Use 3–30 letters, numbers, periods, hyphens, or underscores for your username.'
  }
  if (profile.displayName.length > 80 || profile.bio.length > 500) {
    return 'Keep your display name under 81 characters and your bio under 501 characters.'
  }
  if (!isValidGeneralLocation(profile.location)) {
    return 'Enter only a city and state/region, such as San Antonio, TX.'
  }
  return ''
}
