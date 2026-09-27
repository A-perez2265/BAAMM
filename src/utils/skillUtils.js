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
export const capitalizeWords = (value) => {
    return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}
export const capitalizeFirstLetter = (value) => {
    if (!value) return ''
    return value.charAt(0).toUpperCase() + value.slice(1)
}
export const formatTags = (value) => {
    return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => `#${tag.replace(/^#+/, '')}`)
        .join(', ')
}
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
    listingType: skill.listing_type,
    experienceLevel: skill.experience_level,
    tags: skill.tags ? skill.tags.join(', ') : '',
})