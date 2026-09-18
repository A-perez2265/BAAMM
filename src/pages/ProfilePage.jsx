import { useState } from 'react'

function ProfilePage() {
  // Saved profile information currently displayed to the user
  const [profile, setProfile] = useState({
    displayName: 'Mallory Sorola',
    username: 'mallorysorola',
    bio: 'Computer Science student',
    location: 'San Antonio, TX',
    skills: ['Web Development', 'Python'],
  })

  // Temporary copy used while the user edits their profile
  const [editProfile, setEditProfile] = useState(profile)

  // Controls whether the page is in view mode or edit mode
  const [isEditing, setIsEditing] = useState(false)

  const [error, setError] = useState('')

  // Opens edit mode and copies the current saved profile
  const handleEdit = () => {
    setEditProfile(profile)
    setError('')
    setIsEditing(true)
  }

  // Saves the temporary edits to the main profile
  const handleSave = () => {
    // Remove extra spaces before validating
    const displayName = editProfile.displayName.trim()
    const username = editProfile.username.trim()
    const location = editProfile.location.trim()
    // Check required fields
    if (!displayName || !username || !location) {
        setError('Display name, username, and location are required.')
        return
    }
    // Usernames should not contain spaces
    if (username.includes(' ')) {
        setError('Username cannot contain spaces.')
        return
    }
    // Save cleaned profile information
    setProfile({
        ...editProfile,
        displayName,
        username,
        location,
    })
    setError('')
    setIsEditing(false)
}

  // Discards any unsaved changes
  const handleCancel = () => {
    setEditProfile(profile)
    setIsEditing(false)
    setError('')
  }

  return (
    <main>
      <h1>User Profile</h1>

      {isEditing ? (
        <div>
          <label>
            Display Name:
            <input
              type="text"
              value={editProfile.displayName}
              onChange={(event) =>
                setEditProfile({
                  ...editProfile,
                  displayName: event.target.value,
                })
              }
            />
          </label>

          <br />

          <label>
            Username:
            <input
              type="text"
              value={editProfile.username}
              onChange={(event) =>
                setEditProfile({
                  ...editProfile,
                  username: event.target.value,
                })
              }
            />
          </label>

          <br />

          <label>
            Bio:
            <textarea
              value={editProfile.bio}
              onChange={(event) =>
                setEditProfile({
                  ...editProfile,
                  bio: event.target.value,
                })
              }
            />
          </label>

          <br />

          <label>
            Location:
            <input
              type="text"
              value={editProfile.location}
              onChange={(event) =>
                setEditProfile({
                  ...editProfile,
                  location: event.target.value,
                })
              }
            />
          </label>

          <br />

          {/* Display error message if there is an error*/}
          {error && <p style={{ color: 'red' }}>{error}</p>}

          {/* // Buttons to save or cancel edits */}
          <button onClick={handleSave}>
            Save Profile
          </button>

          <button onClick={handleCancel}>
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <p>
            <strong>Display Name:</strong> {profile.displayName}
          </p>

          <p>
            <strong>Username:</strong> {profile.username}
          </p>

          <p>
            <strong>Bio:</strong> {profile.bio}
          </p>

          <p>
            <strong>Location:</strong> {profile.location}
          </p>

          <button onClick={handleEdit}>
            Edit Profile
          </button>
        </div>
      )}

      <h2>Skills</h2>

      <ul>
        {profile.skills.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
    </main>
  )
}

export default ProfilePage