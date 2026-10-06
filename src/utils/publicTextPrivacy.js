// best attempt at detection of recognizable contact details (email, phone, street address) in public text fields
const email = /[a-z0-9.!$%&'*+/=?^_`{|}~-]+\s*@\s*[a-z0-9-]+(?:\s*\.\s*[a-z0-9-]+)+/i
const phone = /(?:\+?\d[\s().-]*){7,}/i
const address = /\d+[a-z]?\s+(?:[a-z0-9.'-]+\s+){0,6}(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|circle|cir|way|parkway|pkwy|terrace|ter|trail|trl|place|pl|highway|hwy)\b|(?:p\.?\s*o\.?|post office)\s*box\s*\d+/i
// Full street suffixes also catch removed spaces and letters added around an address.
// Short suffixes still need a boundary to avoid treating ordinary words as streets.
const compactAddress = /\d+[a-z]?\s*[a-z\s.'-]{1,100}(?:street|avenue|road|drive|lane|boulevard|court|circle|parkway|terrace|trail|place|highway)/i

export const privacyMessage = 'Remove email addresses, phone numbers, and street addresses from public profile and skill details. Use only a city/state for location.'

export function containsContactDetails(value) {
  const text = (Array.isArray(value) ? value.join(' ') : String(value || ''))
    .normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/#/g, ' ')
    .replace(/\s*(?:\[at\]|\(at\))\s*/gi, '@')
    .replace(/\s*(?:\[dot\]|\(dot\))\s*/gi, '.')
  return email.test(text) || phone.test(text) || address.test(text) || compactAddress.test(text)
}

export function validatePublicFields(fields) {
  for (const [label, value] of Object.entries(fields)) {
    if (containsContactDetails(value)) return `${label}: ${privacyMessage}`
  }
  return ''
}

export function assertPublicFields(fields) {
  const message = validatePublicFields(fields)
  if (message) throw Object.assign(new Error(message), { code: 'PUBLIC_CONTACT_DETAILS' })
}
