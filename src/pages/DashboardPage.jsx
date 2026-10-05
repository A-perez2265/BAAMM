import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import { EXCHANGE_STATUS } from '../constants/exchangeStatus'
import {
  getActiveExchangesForUser,
  getCompletedCreditCounts,
  getCreditsBalance,
  getIncomingPendingRequests,
  getRequestableSkills,
  respondToIncomingRequest,
} from '../services/exchangeService'
import ActivityFeed from '../components/ActivityFeed'
import Alerts from '../components/Alerts'
import './DashboardPage.css'

function personLabel(profile) {
  return profile?.display_name || profile?.username || 'Someone'
}

function formatLabel(item) {
  return item?.skill?.format || item?.format || ''
}

function skillTitle(item) {
  return item.skill?.title || item.title || 'a skill'
}

function statusLabel(status) {
  if (status === EXCHANGE_STATUS.SESSION_COMPLETED) return 'Awaiting confirm'
  if (status === EXCHANGE_STATUS.AWAITING_CONFIRMATION) return 'Awaiting confirm'
  if (!status) return 'Unknown'
  return status.replace('_', ' ')
}

export default function DashboardPage() {
  const [displayName, setDisplayName] = useState('there')
  const [credits, setCredits] = useState(null)
  const [earned, setEarned] = useState(0)
  const [spent, setSpent] = useState(0)
  const [incoming, setIncoming] = useState([])
  const [exchanges, setExchanges] = useState([])
  const [listings, setListings] = useState([])
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        setError(userError.message)
        setLoading(false)
        return
      }

      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('id', user.id)
          .maybeSingle()

        setDisplayName(
          profile?.display_name ||
            profile?.username ||
            user.user_metadata?.display_name ||
            user.user_metadata?.username ||
            user.email ||
            'there'
        )

        const [balance, counts, pending, active, skills] = await Promise.all([
          getCreditsBalance(user.id),
          getCompletedCreditCounts(user.id),
          getIncomingPendingRequests(user.id),
          getActiveExchangesForUser(user.id),
          getRequestableSkills(user.id),
        ])

        const teacherIds = [
          ...new Set(skills.map((skill) => skill.user_id).filter(Boolean)),
        ]
        const { data: teachers } = teacherIds.length
          ? await supabase
              .from('profiles')
              .select('id, username, display_name')
              .in('id', teacherIds)
          : { data: [] }

        const teachersById = Object.fromEntries(
          (teachers ?? []).map((profile) => [profile.id, profile])
        )

        setCredits(balance)
        setEarned(counts.earned)
        setSpent(counts.spent)
        setIncoming(pending)
        setExchanges(active)
        setListings(
          skills.slice(0, 5).map((skill) => ({
            ...skill,
            teacher: teachersById[skill.user_id] ?? null,
          }))
        )
        setError('')
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleRespond = async (request, nextStatus) => {
    setActionId(request.id)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('You need to be signed in to respond.')
      }

      await respondToIncomingRequest({
        exchangeId: request.id,
        teacherId: user.id,
        nextStatus,
      })

      setIncoming((current) => current.filter((item) => item.id !== request.id))

      if (nextStatus === EXCHANGE_STATUS.ACCEPTED) {
        setExchanges((current) => [
          { ...request, status: EXCHANGE_STATUS.ACCEPTED },
          ...current.filter((item) => item.id !== request.id),
        ])
      }
    } catch (respondError) {
      setError(respondError.message)
    } finally {
      setActionId(null)
    }
  }

  const waitingToConfirm = exchanges.filter(
    (exchange) =>
      exchange.learner_id === userId &&
      (exchange.status === EXCHANGE_STATUS.SESSION_COMPLETED ||
        exchange.status === EXCHANGE_STATUS.AWAITING_CONFIRMATION)
  )

  const activityItems = [
    ...incoming.slice(0, 2).map((request) => ({
      id: `in-${request.id}`,
      category: 'Incoming',
      message: `${personLabel(request.learner)} requested ${skillTitle(request)}.`,
      to: '/incoming',
    })),
    ...waitingToConfirm.slice(0, 2).map((exchange) => ({
      id: `cf-${exchange.id}`,
      category: 'Confirm',
      message: `Confirm ${skillTitle(exchange)} with ${personLabel(exchange.teacher)}.`,
      to: '/confirm',
    })),
  ]

  const alerts = []
  if (incoming.length > 0) {
    alerts.push(`${incoming.length} incoming request(s) waiting on you.`)
  }
  if (waitingToConfirm.length > 0) {
    alerts.push(`${waitingToConfirm.length} lesson(s) ready to confirm.`)
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#000' }}>
            Welcome back, {displayName}!
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            {loading
              ? 'Loading your exchanges…'
              : 'Open your exchange pages from these tiles. Credits move when a learner confirms.'}
          </p>
        </div>
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '12px 24px',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#64748b',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.5px',
              display: 'block',
            }}
          >
            Available Balance
          </span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#803b4e', marginTop: 2 }}>
            {credits === null ? '…' : credits}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>
              Credits
            </span>
          </div>
        </div>
      </div>

      {error && <p className="dashboard-error">{error}</p>}

      <div className="dashboard-grid">
        <div className="dashboard-column">
          <section className="dashboard-card">
            <div className="dashboard-card-head">
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#000' }}>
                Incoming Requests
              </h3>
              <Link to="/incoming" className="dashboard-link">
                Open inbox →
              </Link>
            </div>
            <span
              style={{
                fontSize: '12px',
                backgroundColor: '#fde8ef',
                color: '#803b4e',
                padding: '4px 10px',
                borderRadius: '12px',
                fontWeight: 600,
                display: 'inline-block',
                marginBottom: '12px',
              }}
            >
              {loading ? '…' : incoming.length} Pending
            </span>

            {loading ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Loading incoming requests…
              </p>
            ) : incoming.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                No pending requests for your teacher listings.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {incoming.slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #f1f5f9',
                      borderRadius: '12px',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                        {skillTitle(req)}
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        Requested by <strong>{personLabel(req.learner)}</strong>
                        {' • 1 Credit'}
                        {formatLabel(req) ? ` (${formatLabel(req)})` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        disabled={actionId === req.id}
                        onClick={() =>
                          handleRespond(req, EXCHANGE_STATUS.ACCEPTED)
                        }
                        style={{
                          backgroundColor: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={actionId === req.id}
                        onClick={() =>
                          handleRespond(req, EXCHANGE_STATUS.DECLINED)
                        }
                        style={{
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-card">
            <div className="dashboard-card-head">
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#000' }}>
                Active Exchanges
              </h3>
              <Link to="/confirm" className="dashboard-link">
                Confirm lessons →
              </Link>
            </div>
            {loading ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Loading active exchanges…
              </p>
            ) : exchanges.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                No open exchanges yet. Request a skill or wait for an incoming
                request.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {exchanges.map((ex) => {
                  const isTeacher = ex.teacher_id === userId
                  const partner = isTeacher ? ex.learner : ex.teacher
                  const href =
                    ex.status === EXCHANGE_STATUS.PENDING && isTeacher
                      ? '/incoming'
                      : ex.status === EXCHANGE_STATUS.ACCEPTED && isTeacher
                        ? '/incoming'
                        : '/confirm'

                  return (
                    <Link
                      key={ex.id}
                      to={href}
                      style={{
                        padding: '16px',
                        border: '1px solid #f1f5f9',
                        borderRadius: '12px',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textDecoration: 'none',
                        color: 'inherit',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px',
                          }}
                        >
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {ex.skill?.category || 'Skill'}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontWeight: 600,
                              backgroundColor: isTeacher ? '#fde8ef' : '#e0f2fe',
                              color: isTeacher ? '#803b4e' : '#0369a1',
                            }}
                          >
                            {isTeacher ? 'Teacher' : 'Learner'}
                          </span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#000' }}>
                          {skillTitle(ex)}
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                          Partner: <strong>{personLabel(partner)}</strong>
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          backgroundColor:
                            ex.status === EXCHANGE_STATUS.PENDING
                              ? '#fef3c7'
                              : ex.status === EXCHANGE_STATUS.ACCEPTED
                                ? '#dbeafe'
                                : '#dcfce7',
                          color:
                            ex.status === EXCHANGE_STATUS.PENDING
                              ? '#b45309'
                              : ex.status === EXCHANGE_STATUS.ACCEPTED
                                ? '#1d4ed8'
                                : '#15803d',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {statusLabel(ex.status)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          <section className="dashboard-card">
            <div className="dashboard-card-head">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#000' }}>
                  Teacher Listings
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Skills you can request with 1 credit
                </p>
              </div>
              <Link to="/request" className="dashboard-link">
                Browse all →
              </Link>
            </div>
            {loading ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Loading teacher listings…
              </p>
            ) : listings.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                No other teacher listings yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #f1f5f9',
                      borderRadius: '12px',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                          {listing.title}
                        </h4>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#64748b' }}>
                          {listing.category || 'Skill'}
                          {listing.experience_level ? ` • ${listing.experience_level}` : ''}
                          {listing.format ? ` • ${listing.format}` : ''}
                          {' • '}
                          {personLabel(listing.teacher)}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#803b4e',
                          backgroundColor: '#fde8ef',
                          padding: '4px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        1 Credit
                      </span>
                    </div>
                    <Link
                      to={{
                        pathname: '/request',
                        search: `skill=${listing.id}`,
                      }}
                      style={{
                        display: 'inline-block',
                        marginTop: '10px',
                        backgroundColor: '#803b4e',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Request Exchange
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="dashboard-column">
          <Alerts items={alerts} />
          <ActivityFeed items={activityItems} />

          <section
            className="dashboard-card"
            style={{ padding: '20px' }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>
              Credit Ledger
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #dcfce7',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>
                  EARNED (TEACHING)
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a' }}>
                  +{earned} credits
                </span>
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fee2e2',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 700 }}>
                  SPENT (LEARNING)
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#dc2626' }}>
                  -{spent} credits
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
