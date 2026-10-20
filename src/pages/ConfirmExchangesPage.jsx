import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import DisputeModal from '../components/DisputeModal'
import { EXCHANGE_STATUS } from '../constants/exchangeStatus'
import {
  confirmExchange,
  getAwaitingLearnerConfirmation,
} from '../services/exchangeService'
import './ConfirmExchangesPage.css'

function canLearnerConfirm(status) {
  return (
    status === EXCHANGE_STATUS.SESSION_COMPLETED ||
    status === EXCHANGE_STATUS.AWAITING_CONFIRMATION
  )
}

function ConfirmExchangesPage() {
  const [user, setUser] = useState(null)
  const [exchanges, setExchanges] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loadingId, setLoadingId] = useState(null)
  const [disputeExchange, setDisputeExchange] = useState(null)

  useEffect(() => {
    const load = async (currentUser) => {
      if (!currentUser) {
        return
      }

      setUser(currentUser)
      setError('')

      try {
        const waiting = await getAwaitingLearnerConfirmation(currentUser.id)
        setExchanges(waiting)
      } catch (loadError) {
        setError(loadError.message)
      }
    }

    supabase.auth.getUser().then(({ data: { user: currentUser }, error: userError }) => {
      if (userError) {
        setError(userError.message)
        return
      }
      load(currentUser)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleConfirm = async (exchange) => {
    if (!canLearnerConfirm(exchange.status)) {
      setError('Wait until the teacher marks this lesson complete before confirming.')
      return
    }

    setError('')
    setSuccess('')
    setLoadingId(exchange.id)

    try {
      await confirmExchange({
        exchangeId: exchange.id,
        learnerId: user.id,
      })
      setExchanges((current) => current.filter((item) => item.id !== exchange.id))
      setSuccess('Exchange confirmed.')
    } catch (confirmError) {
      setError(confirmError.message)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <main className="confirm-exchanges">
      <h1>Confirm exchanges</h1>
      <p>
        Confirm after the teacher marks a lesson complete, or report a problem
        on any accepted lesson that has not been settled.
      </p>

      {error && <p className="confirm-exchanges-error">{error}</p>}
      {success && <p className="confirm-exchanges-success">{success}</p>}

      {exchanges.length === 0 && <p>No exchanges waiting on your confirmation.</p>}

      <ul className="confirm-exchanges-feed">
        {exchanges.map((exchange) => {
          const teacherName =
            exchange.teacher?.display_name ||
            exchange.teacher?.username ||
            'the teacher'
          const skillTitle = exchange.skill?.title || 'a skill'

          return (
            <li key={exchange.id} className="confirm-exchanges-card">
              <h2>{skillTitle}</h2>
              <p>Teacher: {teacherName}</p>
              <p>{exchange.message}</p>
              {exchange.status === EXCHANGE_STATUS.ACCEPTED && (
                <p>Waiting for the teacher to mark this complete.</p>
              )}
              <div className="confirm-exchanges-actions">
                {canLearnerConfirm(exchange.status) && (
                  <button
                    type="button"
                    onClick={() => handleConfirm(exchange)}
                    disabled={loadingId === exchange.id}
                  >
                    Confirm
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDisputeExchange(exchange)}
                  disabled={loadingId === exchange.id}
                >
                  Dispute
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <DisputeModal
        isOpen={Boolean(disputeExchange)}
        onClose={() => setDisputeExchange(null)}
        exchange={disputeExchange}
        currentUser={user}
        onDisputeSubmitted={() => {
          setExchanges((current) =>
            current.filter((item) => item.id !== disputeExchange.id)
          )
          setSuccess('Dispute submitted for admin review.')
        }}
      />
    </main>
  )
}

export default ConfirmExchangesPage
