import {
    capitalizeWords,
    capitalizeFirstLetter,
    formatTags,
    formatGeneralLocation,
} from '../../utils/skillUtils'
import {
    CATEGORIES,
    EXPERIENCE_LEVELS,
    FORMATS,
    LANGUAGES,
    LISTING_TYPES,
} from '../../constants/skillOptions'


function SkillForm({
    skill,
    setSkill,
    error,
    onSubmit,
    onCancel,
    submitLabel,
}) {
    return (
        <div>
            <label>
                Skill Title:
                <input
                    type="text"
                    value={skill.title}
                    onChange={(event) =>
                        setSkill({
                            ...skill,
                            title: event.target.value,
                        })
                    }
                    onBlur={() =>
                        setSkill({
                            ...skill,
                            title: capitalizeWords(skill.title),
                        })
                    }
                />
            </label>
            <br />

            <label>
                Description:
                <textarea
                    value={skill.description}
                    onChange={(event) =>
                        setSkill({
                            ...skill,
                            description: event.target.value,
                        })
                    }
                    onBlur={() =>
                        setSkill({
                            ...skill,
                            description: capitalizeFirstLetter(skill.description),
                        })
                    }
                />
            </label>
            <br />

            <label>
                Category:
                <select
                    value={skill.category}
                    onChange={(event) =>
                        setSkill({
                            ...skill,
                            category: event.target.value,
                        })
                    }
                >
                    <option value="">Select a category</option>

                    {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                            {category}
                        </option>
                    ))}
                </select>
            </label>
            <br />

            <label>
                Tags:
                <input
                    type="text"
                    value={skill.tags}
                    onChange={(event) =>
                        setSkill({
                            ...skill,
                            tags: event.target.value,
                        })
                    }
                    onBlur={() =>
                        setSkill({
                            ...skill,
                            tags: formatTags(skill.tags),
                        })
                    }
                />
            </label>
            <br />

            <label>
                Experience Level:
                <select
                    value={skill.experienceLevel}
                    onChange={(event) =>
                        setSkill({
                            ...skill,
                            experienceLevel: event.target.value,
                        })
                    }
                >
                    <option value="">Select an experience level</option>

                    {EXPERIENCE_LEVELS.map((level) => (
                        <option key={level} value={level}>
                            {level}
                        </option>
                    ))}
                </select>
            </label>
            <br />

            <label>
                Format:
                <select
                    value={skill.format}
                    onChange={(event) =>
                        setSkill({
                            ...skill,
                            format: event.target.value,
                        })
                    }
                >
                    <option value="">Select a format</option>

                    {FORMATS.map((format) => (
                        <option key={format} value={format}>
                            {format}
                        </option>
                    ))}
                </select>
            </label>
            <br />

            <label>
                Language:
                <select
                    value={skill.language}
                    onChange={(event) =>
                        setSkill({
                            ...skill,
                            language: event.target.value,
                        })
                    }
                >
                    <option value="">Select a language</option>

                    {LANGUAGES.map((language) => (
                        <option key={language} value={language}>
                            {language}
                        </option>
                    ))}
                </select>
            </label>
            <br />

            <label>
                Location:
                <input
                    type="text"
                    value={skill.location}
                    placeholder="City, State/Region"
                    onChange={(event) =>
                        setSkill({
                            ...skill,
                            location: event.target.value,
                        })
                    }
                    onBlur={() =>
                        setSkill({
                            ...skill,
                            location: formatGeneralLocation(skill.location),
                        })
                    }
                />
            </label>
            <br />

            <label>
                Listing Type:
                <select
                    value={skill.listingType}
                    onChange={(event) =>
                        setSkill({
                            ...skill,
                            listingType: event.target.value,
                        })
                    }
                >
                    <option value="">Select a listing type</option>

                    {LISTING_TYPES.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
            </label>
            {error && (
                <p style={{ color: 'red' }}>
                    {error}
                </p>
            )}

            <button type="button" onClick={onSubmit}>
                {submitLabel}
            </button>

            <button type="button" onClick={onCancel}>
                Cancel
            </button>
        </div>
    )
}

export default SkillForm