import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { EXCHANGE_STATUS } from '../constants/exchangeStatus'
import {
  getIncomingPendingRequests,
  respondToIncomingRequest,
} from '../services/exchangeService'
import './IncomingRequestsPage.css'

function IncomingRequestsPage() {
  const [userId, setUserId] = useState(null)
  const [requests, setRequests] = useState([])
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
        const incoming = await getIncomingPendingRequests(user.id)
        setRequests(incoming)
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
      setSuccess(
        nextStatus === EXCHANGE_STATUS.ACCEPTED
          ? 'Request accepted.'
          : 'Request declined.'
      )
    } catch (respondError) {
      setError(respondError.message)
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
        {requests.map((request) => {
          const learnerName =
            request.learner?.display_name ||
            request.learner?.username ||
            'A learner'
          const skillTitle = request.skill?.title || 'a skill'

          return (
            <li key={request.id} className="incoming-requests-card">
              <h2>{skillTitle}</h2>
              <p>
                From {learnerName}
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
          )
        })}
      </ul>
    </main>
  )
}

export default IncomingRequestsPage
