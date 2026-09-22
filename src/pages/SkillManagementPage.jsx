import { useState } from 'react'

function SkillManagementPage() {
    // Temporary skill data until Supabase user data is connected
    const [skills, setSkills] = useState([
        {
            id: 1,
            title: 'Python Programming',
            description: 'Beginner Python programming and problem solving.',
            category: 'Technology',
            listingType: 'Teaching',
        },
        {
            id: 2,
            title: 'Web Development',
            description: 'Basic HTML, CSS, and JavaScript.',
            category: 'Technology',
            listingType: 'Teaching',
        },

    ])
    // Controls whether the add-skill form is visible
    const [showAddForm, setShowAddForm] = useState(false)

    // Stores the values entered into the add-skill form
    const [newSkill, setNewSkill] = useState({
        title: '',
        description: '',
        category: '',
        listingType: 'Teaching',
    })

    // Tracks which skill is currently being edited
    const [editingSkillId, setEditingSkillId] = useState(null)

    // Stores temporary values while editing
    const [editSkill, setEditSkill] = useState({
        title: '',
        description: '',
        category: '',
        listingType: 'Teaching',
    })
    // Stores validation errors for adding a skill
    const [addError, setAddError] = useState('')

    // Stores validation errors for editing a skill
    const [editError, setEditError] = useState('')
    // Adds a new skill to the user's skill list
    const handleAddSkill = () => {
        const title = newSkill.title.trim()
        const description = newSkill.description.trim()
        const category = newSkill.category.trim()

        // Check required fields
        if (!title || !description || !category || !newSkill.listingType) {
            setAddError(
                'Title, description, category, and listing type are required.'
            )
            return
        }

        const skillToAdd = {
            ...newSkill,
            id: Date.now(),
            title,
            description,
            category,
        }

        setSkills([...skills, skillToAdd])

        // Reset the form after saving
        setNewSkill({
            title: '',
            description: '',
            category: '',
            listingType: 'Teaching',
        })

        setAddError('')
        setShowAddForm(false)
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
        })
    }
    // Saves changes to the selected skill
    // Saves changes to the selected skill
    const handleSaveEdit = () => {
        const title = editSkill.title.trim()
        const description = editSkill.description.trim()
        const category = editSkill.category.trim()

        // Check required fields
        if (!title || !description || !category || !editSkill.listingType) {
            setEditError(
                'Title, description, category, and listing type are required.'
            )
            return
        }

        const updatedSkills = skills.map((skill) =>
            skill.id === editingSkillId
                ? {
                    ...skill,
                    title,
                    description,
                    category,
                    listingType: editSkill.listingType,
                }
                : skill
        )

        setSkills(updatedSkills)
        setEditError('')
        setEditingSkillId(null)
    }
    // Removes a skill from the user's skill list
    const handleRemoveSkill = (skillId) => {
        const updatedSkills = skills.filter(
            (skill) => skill.id !== skillId
        )

        setSkills(updatedSkills)
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

                    <label>
                        Skill Title:
                        <input
                            type="text"
                            value={newSkill.title}
                            onChange={(event) =>
                                setNewSkill({
                                    ...newSkill,
                                    title: event.target.value,
                                })
                            }
                        />
                    </label>

                    <br />

                    <label>
                        Description:
                        <textarea
                            value={newSkill.description}
                            onChange={(event) =>
                                setNewSkill({
                                    ...newSkill,
                                    description: event.target.value,
                                })
                            }
                        />
                    </label>

                    <br />

                    <label>
                        Category:
                        <input
                            type="text"
                            value={newSkill.category}
                            onChange={(event) =>
                                setNewSkill({
                                    ...newSkill,
                                    category: event.target.value,
                                })
                            }
                        />
                    </label>

                    <br />

                    <label>
                        Listing Type:
                        <select
                            value={newSkill.listingType}
                            onChange={(event) =>
                                setNewSkill({
                                    ...newSkill,
                                    listingType: event.target.value,
                                })
                            }
                        >
                            <option value="Teaching">Teaching</option>
                            <option value="Learning">Learning</option>
                        </select>
                    </label>

                    <br />
                    {/* Display validation error for new skills */}
                    {addError && <p style={{ color: 'red' }}>{addError}</p>}
                    <button
                        type="button"
                        onClick={handleAddSkill}
                    >
                        Save Skill
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setShowAddForm(false);
                            setAddError('');
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}


            <h2>Skill Portfolio</h2>

            {skills.map((skill) => (
                <div key={skill.id}>
                    {editingSkillId === skill.id ? (
                        <div>
                            <h3>Edit Skill</h3>

                            <label>
                                Skill Title:
                                <input
                                    type="text"
                                    value={editSkill.title}
                                    onChange={(event) =>
                                        setEditSkill({
                                            ...editSkill,
                                            title: event.target.value,
                                        })
                                    }
                                />
                            </label>

                            <br />

                            <label>
                                Description:
                                <textarea
                                    value={editSkill.description}
                                    onChange={(event) =>
                                        setEditSkill({
                                            ...editSkill,
                                            description: event.target.value,
                                        })
                                    }
                                />
                            </label>

                            <br />

                            <label>
                                Category:
                                <input
                                    type="text"
                                    value={editSkill.category}
                                    onChange={(event) =>
                                        setEditSkill({
                                            ...editSkill,
                                            category: event.target.value,
                                        })
                                    }
                                />
                            </label>

                            <br />

                            <label>
                                Listing Type:
                                <select
                                    value={editSkill.listingType}
                                    onChange={(event) =>
                                        setEditSkill({
                                            ...editSkill,
                                            listingType: event.target.value,
                                        })
                                    }
                                >
                                    <option value="Teaching">Teaching</option>
                                    <option value="Learning">Learning</option>
                                </select>
                            </label>

                            <br />
                            {editError && <p style={{ color: 'red' }}>{editError}</p>}
                            {/* Display validation error for editing skills */}
                            <button type="button" onClick={handleSaveEdit}>
                                Save Changes
                            </button>

                            <button
                                type="button"
                                onClick={() => setEditingSkillId(null)}
                            >
                                Cancel
                            </button>
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
                                <strong>Listing Type:</strong> {skill.listingType}
                            </p>

                            <button
                                type="button"
                                onClick={() => handleEditSkill(skill)}
                            >
                                Edit
                            </button>

                            <button type="button" onClick={() => handleRemoveSkill(skill.id)}>
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