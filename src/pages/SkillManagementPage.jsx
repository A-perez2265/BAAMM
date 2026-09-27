import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import SkillForm from '../components/skills/SkillForm'
import {
    isValidGeneralLocation,
    formatGeneralLocation,
    createEmptySkill,
    formatSkillFromDatabase,
} from '../utils/skillUtils'

import {
    getSkills,
    addSkill,
    updateSkill,
    deleteSkill,
} from '../services/skillService'

function SkillManagementPage() {
    // Deleted the initial skills state to start with an empty list & added null
    const [skills, setSkills] = useState([])
    const [userId, setUserId] = useState(null)

    // Controls whether the add-skill form is visible
    const [showAddForm, setShowAddForm] = useState(false)

    // Stores the values entered into the add-skill form
    const [newSkill, setNewSkill] = useState(createEmptySkill)

    // Tracks which skill is currently being edited
    const [editingSkillId, setEditingSkillId] = useState(null)

    // Stores temporary values while editing
    const [editSkill, setEditSkill] = useState(createEmptySkill)
    // Stores validation errors for adding a skill
    const [addError, setAddError] = useState('')

    // Stores validation errors for editing a skill
    const [editError, setEditError] = useState('')
    useEffect(() => {
        const loadUserSkills = async () => {
            try {
                const {
                    data: { user },
                    error: userError,
                } = await supabase.auth.getUser()

                if (userError) {
                    throw userError
                }

                if (!user) {
                    return
                }

                setUserId(user.id)

                const skillData = await getSkills(user.id)

                const formattedSkills = skillData.map(formatSkillFromDatabase)

                setSkills(formattedSkills)
            } catch (error) {
                console.error('Error loading user skills:', error)
            }
        }

        loadUserSkills()
    }, [])


    // Adds a new skill to the user's skill list
    const handleAddSkill = async () => {
        const title = newSkill.title.trim()
        const description = newSkill.description.trim()
        const category = newSkill.category.trim()
        const location = formatGeneralLocation(newSkill.location)
        !newSkill.experienceLevel || (newSkill.experienceLevel = newSkill.experienceLevel.trim())

        // Check required fields
        // Check required fields
        if (
            !title ||
            !description ||
            !category ||
            !newSkill.listingType ||
            !newSkill.format.trim() ||
            !newSkill.language.trim()
        ) {
            setAddError(
                'Title, description, category, listing type, format, and language are required.'
            )
            return
        }

        if (location && !isValidGeneralLocation(location)) {
            setAddError('Please enter a location in City, State/Region format.')
            return
        }

        if (!userId) {
            setAddError('Unable to identify the signed-in user.')
            return
        }

        try {
            const savedSkill = await addSkill(userId, {
                title,
                description,
                category,
                listingType: newSkill.listingType,
                tags: newSkill.tags,
                experienceLevel: newSkill.experienceLevel,
                format: newSkill.format,
                language: newSkill.language,
                location,
            })

            setSkills([
                ...skills,
                {
                    ...savedSkill,
                    listingType: savedSkill.listing_type,
                    experienceLevel: savedSkill.experience_level,
                    tags: savedSkill.tags ? savedSkill.tags.join(', ') : '',
                },
            ])
            setNewSkill(createEmptySkill())

            setAddError('')
            setShowAddForm(false)
        } catch (error) {
            console.error('Error adding skill:', error)
            setAddError('Unable to save skill. Please try again.')
        }
    }
    // Opens the selected skill in edit mode
    const handleEditSkill = (skill) => {
        setEditingSkillId(skill.id)
        setEditError('')

        setEditSkill({
            title: skill.title,
            description: skill.description,
            category: skill.category,
            listingType: skill.listingType,
            tags: skill.tags || '',
            experienceLevel: skill.experienceLevel || '',
            format: skill.format || '',
            language: skill.language || '',
            location: skill.location || '',
        })
    }
    // Saves changes to the selected skill & added async function to handle saving edits
    const handleSaveEdit = async () => {
        const title = editSkill.title.trim()
        const description = editSkill.description.trim()
        const category = editSkill.category.trim()
        const location = formatGeneralLocation(editSkill.location)
        // Check required fields
        if (
            !title ||
            !description ||
            !category ||
            !editSkill.listingType ||
            !editSkill.format.trim() ||
            !editSkill.language.trim()
        ) {
            setEditError(
                'Title, description, category, listing type, format, and language are required.'
            )
            return
        }

        // Make sure we know which signed-in user owns the skill
        if (!userId) {
            setEditError('Unable to identify the signed-in user.')
            return
        }
        if (location && !isValidGeneralLocation(location)) {
            setEditError('Please enter a location in City, State/Region format.')
            return
        }

        try {
            const savedSkill = await updateSkill(userId, editingSkillId, {
                title,
                description,
                category,
                listingType: editSkill.listingType,
                tags: editSkill.tags,
                experienceLevel: editSkill.experienceLevel,
                format: editSkill.format,
                language: editSkill.language,
                location,
            })

            const formattedSkill = formatSkillFromDatabase(savedSkill)
            setSkills(
                skills.map((skill) =>
                    skill.id === editingSkillId ? formattedSkill : skill
                )
            )

            setEditError('')
            setEditingSkillId(null)
        } catch (error) {
            console.error('Error updating skill:', error)
            setEditError('Unable to update skill. Please try again.')
        }
    }
    // Removes a skill from the user's skill list
    const handleRemoveSkill = async (skillId) => {
        if (!userId) {
            return
        }

        try {
            await deleteSkill(userId, skillId)

            setSkills(
                skills.filter((skill) => skill.id !== skillId)
            )
        } catch (error) {
            console.error('Error deleting skill:', error)
        }
    }

    return (
        <main>
            <h1>My Skills</h1>

            <button
                type="button"
                onClick={() => setShowAddForm(true)}
            >
                Add Skill
            </button>
            {showAddForm && (
                <div>
                    <h2>Add New Skill</h2>

                    <SkillForm
                        skill={newSkill}
                        setSkill={setNewSkill}
                        error={addError}
                        onSubmit={handleAddSkill}
                        onCancel={() => {
                            setShowAddForm(false)
                            setAddError('')
                        }}
                        submitLabel="Save Skill"
                    />
                </div>
            )}

            <h2>Skill Portfolio</h2>

            {skills.map((skill) => (
                <div key={skill.id}>
                    {editingSkillId === skill.id ? (
                        <div>
                            <h3>Edit Skill</h3>
                            <SkillForm
                                skill={editSkill}
                                setSkill={setEditSkill}
                                error={editError}
                                onSubmit={handleSaveEdit}
                                onCancel={() => {
                                    setEditingSkillId(null)
                                    setEditError('')
                                }}
                                submitLabel="Save Changes"
                            />


                        </div>
                    ) : (
                        <div>
                            <h3>{skill.title}</h3>

                            <p>
                                <strong>Description:</strong> {skill.description}
                            </p>

                            <p>
                                <strong>Category:</strong> {skill.category}
                            </p>

                            <p>
                                <strong>Tags:</strong> {skill.tags}
                            </p>

                            <p>
                                <strong>Experience Level:</strong> {skill.experienceLevel}
                            </p>

                            <p>
                                <strong>Format:</strong> {skill.format}
                            </p>

                            <p>
                                <strong>Language:</strong> {skill.language}
                            </p>

                            <p>
                                <strong>Location:</strong> {skill.location}
                            </p>

                            <p>
                                <strong>Listing Type:</strong> {skill.listingType}
                            </p>

                            <button
                                type="button"
                                onClick={() => handleEditSkill(skill)}
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                onClick={() => handleRemoveSkill(skill.id)}
                            >
                                Remove
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </main>
    )
}

export default SkillManagementPage