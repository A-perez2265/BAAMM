import { validatePublicFields } from './publicTextPrivacy'
export const isValidGeneralLocation = (location) => {
    const trimmedLocation = location.trim()

    if (!trimmedLocation) {
        return false
    }

    if (trimmedLocation.length < 3) {
        return false
    }

    const locationPattern = /^[A-Za-zÀ-ÿ.' -]+,\s*[A-Za-zÀ-ÿ.' -]+$/

    return locationPattern.test(trimmedLocation)
}
export const formatGeneralLocation = (location) => {
    const [city, region] = location.trim().split(',')

    if (!region) {
        return location.trim()
    }

    const formattedCity = city
        .trim()
        .split(' ')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1).toLowerCase()
        )
        .join(' ')

    const trimmedRegion = region.trim()

    const formattedRegion =
        trimmedRegion.length <= 3
            ? trimmedRegion.toUpperCase()
            : trimmedRegion
                  .split(' ')
                  .map(
                      (word) =>
                          word.charAt(0).toUpperCase() +
                          word.slice(1).toLowerCase()
                  )
                  .join(' ')

    return `${formattedCity}, ${formattedRegion}`
}
// Capitalize on blur/save without lowercasing acronyms or changing the rest of a sentence.
export const capitalizeWords = (value) => value.replace(
    /(^|[\s-])(\p{L}[\p{L}\p{N}'’]*)/gu,
    (_match, prefix, word) => prefix + (/\p{Lu}/u.test(word.slice(1)) ? word : word[0].toUpperCase() + word.slice(1))
)
export const capitalizeSentences = (value) => value.replace(
    /(^|[.!?]\s+|\n)([\s"'“‘([{]*)(\p{Ll})/gu,
    (_match, boundary, prefix, letter) => boundary + prefix + letter.toUpperCase()
)
export const capitalizeFirstLetter = (value) => {
    if (!value) return ''
    return value.charAt(0).toUpperCase() + value.slice(1)
}
// Accept the old comma-separated input and hashtags, but store plain tags in the array.
export const parseTags = (value) => {
    const parts = (Array.isArray(value) ? value : [value || ''])
        .flatMap(tag => tag.split(/[,\s#]+/u))
        .filter(Boolean)
    const seen = new Set()
    return parts.filter(tag => {
        const key = tag.toLocaleLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}
export const formatTags = (value) => parseTags(value).map(tag => `#${tag}`).join(' ')
export const createEmptySkill = () => ({
    title: '',
    description: '',
    category: '',
    listingType: '',
    tags: '',
    experienceLevel: '',
    format: '',
    language: '',
    location: '',
})
export const formatSkillFromDatabase = (skill) => ({
    ...skill,
    title: capitalizeWords(skill.title || ''),
    description: capitalizeSentences(skill.description || ''),
    listingType: skill.listing_type,
    experienceLevel: skill.experience_level,
    tags: formatTags(skill.tags),
})
export const prepareSkillForSave = (skill) => ({
    title: capitalizeWords(skill.title.trim()),
    description: capitalizeSentences(skill.description.trim()),
    category: skill.category.trim(),
    listingType: skill.listingType.trim(),
    tags: formatTags(skill.tags),
    experienceLevel: (skill.experienceLevel || '').trim(),
    format: skill.format.trim(),
    language: skill.language.trim(),
    location: formatGeneralLocation(skill.location),
})
export const validateSkill = (skill) => {
    if (
        !skill.title ||
        !skill.description ||
        !skill.category ||
        !skill.experienceLevel ||
        !skill.listingType ||
        !skill.format ||
        !skill.language
    ) {
        return 'Title, description, category, experience level, listing type, format, and language are required.'
    }

    if (
        skill.location &&
        !isValidGeneralLocation(skill.location)
    ) {
        return 'Please enter a location in City, State/Region format.'
    }

    return validatePublicFields(skill)
}