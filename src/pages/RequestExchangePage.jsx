import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import { useListingRefresh } from '../utils/useListingRefresh'
import {
  createExchangeRequest,
  getCreditsBalance,
  getRequestableSkills,
} from '../services/exchangeService'
import './RequestExchangePage.css'

function RequestExchangePage() {
  const [searchParams] = useSearchParams()
  const requestedSkillId = searchParams.get('skill')
  const [userId, setUserId] = useState(null)
  const [credits, setCredits] = useState(null)
  const [skills, setSkills] = useState([])
  const [selection, setSelection] = useState(null)
  const selectedSkillId = selection?.requestedSkillId === requestedSkillId
    ? selection.id
    : requestedSkillId
  const openSkillId = skills.some((skill) => skill.id === selectedSkillId)
    ? selectedSkillId
    : null
  const setOpenSkillId = (id) => setSelection({ requestedSkillId, id })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingListings, setLoadingListings] = useState(true)
  const [revision, refreshListings] = useListingRefresh()

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoadingListings(true)
      setError('')
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (!active) return

        if (userError) {
          setError(userError.message)
          return
        }

        if (!user) {
          return
        }

        setUserId(user.id)

        const [balance, listings] = await Promise.all([
          getCreditsBalance(user.id),
          getRequestableSkills(user.id),
        ])
        if (!active) return
        setCredits(balance)
        setSkills(listings)
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoadingListings(false)
      }
    }

    load()
    return () => { active = false }
  }, [revision])

  useEffect(() => {
    if (!openSkillId) {
      return
    }

    document
      .getElementById(`skill-${openSkillId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [openSkillId])

  const openRequestForm = (skillId) => {
    setError('')
    setSuccess('')
    setMessage('')
    setOpenSkillId(skillId)
  }

  const handleRequest = async (skill) => {
    if (loading || loadingListings || !userId) return
    setError('')
    setSuccess('')

    if (credits !== null && credits < 1) {
      setError('You need at least 1 credit to request an exchange.')
      return
    }

    setLoading(true)

    try {
      await createExchangeRequest({
        learnerId: userId,
        teacherId: skill.user_id,
        skillId: skill.id,
        message,
      })

      setSuccess(`Request sent for ${skill.title}.`)
      setMessage('')
      setOpenSkillId(null)
    } catch (submitError) {
      if (submitError.code === 'LISTING_UNAVAILABLE') {
        setSkills(current => current.filter(item => item.id !== skill.id))
        setOpenSkillId(null)
      }
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="request-exchange">
      <h1>Teacher listings</h1>
      <p>Credits: {credits === null ? '…' : credits}</p>
      <p>Scroll posted teacher skills and request the one you want to learn.</p>
      <button type="button" onClick={refreshListings} disabled={loadingListings || loading}>
        Refresh listings
      </button>
      {loadingListings && <p>Loading listings…</p>}

      {error && <p className="request-exchange-error">{error}</p>}
      {success && <p className="request-exchange-success">{success}</p>}

      {!loadingListings && !error && skills.length === 0 && (
        <p>No teacher listings from other users are available yet.</p>
      )}

      <ul className="request-exchange-feed">
        {skills.map((skill) => (
          <li id={`skill-${skill.id}`} key={skill.id} className="request-exchange-card">
            <h2>{skill.title}</h2>
            <p>{skill.description}</p>
            <p>
              {skill.category}
              {skill.experience_level ? ` · ${skill.experience_level}` : ''}
              {skill.format ? ` · ${skill.format}` : ''}
            </p>
            {skill.location && <p>{skill.location}</p>}

            {openSkillId === skill.id ? (
              <div className="request-exchange-compose">
                <label>
                  Message
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Say what you want to learn and when you are free"
                    required
                  />
                </label>
                <div className="request-exchange-actions">
                  <button
                    type="button"
                    onClick={() => handleRequest(skill)}
                    disabled={loading || loadingListings || credits === null || credits < 1}
                  >
                    {loading ? 'Sending…' : 'Send request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenSkillId(null)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openRequestForm(skill.id)}
                disabled={loading || loadingListings || credits === null || credits < 1}
              >
                Request Exchange
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default RequestExchangePage
