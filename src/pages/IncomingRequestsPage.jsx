import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { EXCHANGE_STATUS } from '../constants/exchangeStatus'
import {
  getAcceptedTeachingExchanges,
  getIncomingPendingRequests,
  markExchangeComplete,
  respondToIncomingRequest,
} from '../services/exchangeService'
import './IncomingRequestsPage.css'

function learnerLabel(exchange) {
  return (
    exchange.learner?.display_name ||
    exchange.learner?.username ||
    'A learner'
  )
}

function skillLabel(exchange) {
  return exchange.skill?.title || 'a skill'
}

function IncomingRequestsPage() {
  const [userId, setUserId] = useState(null)
  const [requests, setRequests] = useState([])
  const [accepted, setAccepted] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loadingId, setLoadingId] = useState(null)

  useEffect(() => {
    const load = async (user) => {
      if (!user) {
        return
      }

      setUserId(user.id)
      setError('')

      try {
        const [incoming, active] = await Promise.all([
          getIncomingPendingRequests(user.id),
          getAcceptedTeachingExchanges(user.id),
        ])
        setRequests(incoming)
        setAccepted(active)
      } catch (loadError) {
        setError(loadError.message)
      }
    }

    supabase.auth.getUser().then(({ data: { user }, error: userError }) => {
      if (userError) {
        setError(userError.message)
        return
      }
      load(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleRespond = async (exchange, nextStatus) => {
    setError('')
    setSuccess('')
    setLoadingId(exchange.id)

    try {
      await respondToIncomingRequest({
        exchangeId: exchange.id,
        teacherId: userId,
        nextStatus,
      })

      setRequests((current) =>
        current.filter((request) => request.id !== exchange.id)
      )

      if (nextStatus === EXCHANGE_STATUS.ACCEPTED) {
        setAccepted((current) => [
          { ...exchange, status: EXCHANGE_STATUS.ACCEPTED },
          ...current,
        ])
        setSuccess('Request accepted. Mark it complete after the lesson.')
      } else {
        setSuccess('Request declined.')
      }
    } catch (respondError) {
      setError(respondError.message)
    } finally {
      setLoadingId(null)
    }
  }

  const handleMarkComplete = async (exchange) => {
    setError('')
    setSuccess('')
    setLoadingId(exchange.id)

    try {
      await markExchangeComplete({
        exchangeId: exchange.id,
        teacherId: userId,
      })

      setAccepted((current) =>
        current.filter((item) => item.id !== exchange.id)
      )
      setSuccess('Marked complete. Waiting for the learner to confirm.')
    } catch (completeError) {
      setError(completeError.message)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <main className="incoming-requests">
      <h1>Incoming requests</h1>
      <p>Accept or decline pending requests for your teacher listings.</p>

      {error && <p className="incoming-requests-error">{error}</p>}
      {success && <p className="incoming-requests-success">{success}</p>}

      {requests.length === 0 && (
        <p>No pending requests right now.</p>
      )}

      <ul className="incoming-requests-feed">
        {requests.map((request) => (
          <li key={request.id} className="incoming-requests-card">
            <h2>{skillLabel(request)}</h2>
            <p>
              From {learnerLabel(request)}
              {request.skill?.category ? ` · ${request.skill.category}` : ''}
            </p>
            <p>{request.message}</p>
            <div className="incoming-requests-actions">
              <button
                type="button"
                onClick={() =>
                  handleRespond(request, EXCHANGE_STATUS.ACCEPTED)
                }
                disabled={loadingId === request.id}
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() =>
                  handleRespond(request, EXCHANGE_STATUS.DECLINED)
                }
                disabled={loadingId === request.id}
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="incoming-requests-section">Accepted lessons</h2>
      <p>After you teach the session, mark it complete.</p>

      {accepted.length === 0 && <p>No accepted lessons right now.</p>}

      <ul className="incoming-requests-feed">
        {accepted.map((exchange) => (
          <li key={exchange.id} className="incoming-requests-card">
            <h2>{skillLabel(exchange)}</h2>
            <p>With {learnerLabel(exchange)}</p>
            <p>{exchange.message}</p>
            <div className="incoming-requests-actions">
              <button
                type="button"
                onClick={() => handleMarkComplete(exchange)}
                disabled={loadingId === exchange.id}
              >
                Mark as Complete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default IncomingRequestsPage
