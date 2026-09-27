import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { getSkills } from '../services/skillService'

function ProfilePage() {
  // Saved profile information currently displayed to the user
  const [profile, setProfile] = useState({
    displayName: '',
    username: '',
    bio: '',
    location: '',
  })
  // Stores skills belonging to the signed-in user
  const [skills, setSkills] = useState([])

  // Temporary copy used while the user edits their profile
  const [editProfile, setEditProfile] = useState(profile)

  // Controls whether the page is in view mode or edit mode
  const [isEditing, setIsEditing] = useState(false)

  // Stores profile validation errors
  const [error, setError] = useState('')

  // Stores the ID of the currently signed-in user
  const [userId, setUserId] = useState(null)


  // Gets the currently signed-in user
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        console.error('Error loading user:', error)
        return
      }

      if (user) {
        setUserId(user.id)
      }
    }

    loadUser()
  }, [])
  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        return
      }

      setProfile({
        displayName: data.display_name || '',
        username: data.username || '',
        bio: data.bio || '',
        location: data.location || '',
      })
    }

    loadProfile()
  }, [userId])
  // Loads skills belonging to the signed-in user
  useEffect(() => {
    const loadSkills = async () => {
      if (!userId) {
        return
      }

      try {
        const skillData = await getSkills(userId)
        setSkills(skillData)
      } catch (error) {
        console.error('Error loading user skills:', error)
      }
    }

    loadSkills()
  }, [userId])

  // Opens edit mode and copies the current saved profile
  const handleEdit = () => {
    setEditProfile(profile)
    setError('')
    setIsEditing(true)
  }

  // Saves the temporary edits to the main profile
  const handleSave = () => {
    const displayName = editProfile.displayName.trim()
    const username = editProfile.username.trim()
    const location = editProfile.location.trim()

    if (!displayName || !username || !location) {
      setError('Display name, username, and location are required.')
      return
    }

    if (username.includes(' ')) {
      setError('Username cannot contain spaces.')
      return
    }

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
    setError('')
    setIsEditing(false)
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

      {skills.length === 0 ? (
        <p>No skills added yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {skills.map((skill) => (
            <li key={skill.id}>
              {skill.title}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default ProfilePage