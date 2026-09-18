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
    // Adds a new skill to the user's skill list
    const handleAddSkill = () => {
        const title = newSkill.title.trim()
        const description = newSkill.description.trim()
        const category = newSkill.category.trim()

        // Require the main skill fields before saving
        if (!title || !description || !category) {
            return
        }

        const skillToAdd = {
            ...newSkill,
            id: Date.now(),
            title,
            description,
            category,
        }

        // Add the new skill to the existing list
        setSkills([...skills, skillToAdd])

        // Clear the form after saving
        setNewSkill({
            title: '',
            description: '',
            category: '',
            listingType: 'Teaching',
        })

        // Close the add-skill form
        setShowAddForm(false)
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

                    <button
                        type="button"
                        onClick={handleAddSkill}
                    >
                        Save Skill
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                    >
                        Cancel
                    </button>
                </div>
            )}


            <h2>Skill Portfolio</h2>

            {skills.map((skill) => (
                <div key={skill.id}>
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

                    <button type="button">
                        Edit
                    </button>

                    <button type="button">
                        Remove
                    </button>
                </div>
            ))}
        </main>
    )
}

export default SkillManagementPage