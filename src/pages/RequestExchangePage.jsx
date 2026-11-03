import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import { useListingRefresh } from '../utils/useListingRefresh'
import { parseTags } from '../utils/skillUtils'
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
    <main id="main-content" className="community-page request-exchange" tabIndex={-1}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Request</p>
          <h1>
            Teacher listings <span className="count">{skills.length}</span>
          </h1>
          <p>
            Scroll posted teacher skills and request the one you want to learn.
          </p>
        </div>
        <div className="request-exchange__heading-tools">
          <p className="request-exchange__credits">
            Credits
            <strong>{credits === null ? '…' : credits}</strong>
          </p>
          <button
            type="button"
            onClick={refreshListings}
            disabled={loadingListings || loading}
          >
            Refresh listings
          </button>
        </div>
      </div>

      {loadingListings && (
        <p role="status" className="panel">
          Loading listings…
        </p>
      )}

      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="notice success">
          {success}
        </p>
      )}

      {!loadingListings && !error && skills.length === 0 && (
        <div className="panel empty-state">
          <span className="empty-icon" aria-hidden="true">
            ✦
          </span>
          <h3>No teacher listings yet</h3>
          <p>No teacher listings from other users are available yet.</p>
        </div>
      )}

      {skills.length > 0 && (
        <ul className="skills-grid request-exchange__results">
          {skills.map((skill) => {
            const tags = parseTags(skill.tags)
            const isOpen = openSkillId === skill.id

            return (
              <li id={`skill-${skill.id}`} key={skill.id}>
                <article className={`skill-card${isOpen ? ' request-exchange__card--open' : ''}`}>
                  <div className="card-labels">
                    {skill.category && <span className="badge">{skill.category}</span>}
                    <span className="listing-label listing-teaching">Teacher</span>
                  </div>
                  <h3>{skill.title}</h3>
                  <p className="skill-description">{skill.description}</p>
                  <dl className="skill-details">
                    {[
                      ['Experience', skill.experience_level],
                      ['Format', skill.format],
                      ['Language', skill.language],
                      ['Location', skill.location],
                    ]
                      .filter(([, value]) => value)
                      .map(([label, value]) => (
                        <div key={label}>
                          <div>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        </div>
                      ))}
                  </dl>
                  {tags.length > 0 && (
                    <ul className="skill-tags" aria-label="Skill tags">
                      {tags.map((tag) => (
                        <li key={tag}>#{tag}</li>
                      ))}
                    </ul>
                  )}
                  <div className="card-actions">
                    {isOpen ? (
                      <div className="request-exchange__compose">
                        <label htmlFor={`message-${skill.id}`}>
                          Message
                          <textarea
                            id={`message-${skill.id}`}
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder="Say what you want to learn and when you are free"
                            required
                          />
                        </label>
                        <div className="request-exchange__actions">
                          <button
                            type="button"
                            className="primary-button"
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
                        className="primary-button"
                        onClick={() => openRequestForm(skill.id)}
                        disabled={loading || loadingListings || credits === null || credits < 1}
                      >
                        Request Exchange
                      </button>
                    )}
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

export default RequestExchangePage
