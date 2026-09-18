import { useState } from 'react'

function ProfilePage() {
  const [profile, setProfile] = useState({
    displayName: 'Mallory Sorola',
    username: 'mallorysorola',
    bio: 'Computer Science student',
    location: 'San Antonio, TX',
    skills: ['Web Development', 'Python'],
  })

  const [isEditing, setIsEditing] = useState(false)

  return (
    <main>
      <h1>User Profile</h1>

      {isEditing ? (
        <div>
          <label>
            Display Name:
            <input
              type="text"
              value={profile.displayName}
              onChange={(event) =>
                setProfile({
                  ...profile,
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
              value={profile.username}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  username: event.target.value,
                })
              }
            />
          </label>

          <br />

          <label>
            Bio:
            <textarea
              value={profile.bio}
              onChange={(event) =>
                setProfile({
                  ...profile,
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
              value={profile.location}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  location: event.target.value,
                })
              }
            />
          </label>

          <br />

          <button onClick={() => setIsEditing(false)}>
            Save Profile
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

          <button onClick={() => setIsEditing(true)}>
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