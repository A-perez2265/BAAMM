// src/pages/AdminDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [disputes, setDisputes] = useState([]);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // 1. Verify Admin Access
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setCurrentUser(null);
          setIsAdmin(false);
          setCheckingAuth(false);
          return;
        }

        const user = session.user;
        setCurrentUser(user);

        // Check JWT user/app metadata
        const hasJwtAdmin =
          user.app_metadata?.role === 'admin' ||
          user.user_metadata?.is_admin === true;

        if (hasJwtAdmin) {
          setIsAdmin(true);
          setCheckingAuth(false);
          return;
        }

        // Query public.profiles is_admin column
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && profile?.is_admin === true) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Admin status verification failed:', err);
        setIsAdmin(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAdminStatus();
  }, []);

  // 2. Load disputes
  const fetchDisputes = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoadingDisputes(true);
      setActionError('');
    }
    try {
      let { data, error } = await supabase
        .from('disputes')
        .select('*, dispute_actions(*)')
        .order('created_at', { ascending: false });

      if (error) {
        const historyMissing =
          /dispute_actions/i.test(error.message || '') ||
          error.code === 'PGRST200' ||
          error.code === '42P01';
        if (!historyMissing) throw error;

        const fallback = await supabase
          .from('disputes')
          .select('*')
          .order('created_at', { ascending: false });
        if (fallback.error) throw fallback.error;
        data = (fallback.data || []).map((row) => ({
          ...row,
          dispute_actions: [],
        }));
      }

      setDisputes(data || []);
    } catch (err) {
      console.error('Error fetching disputes:', err);
      setActionError('Failed to load dispute records: ' + err.message);
    } finally {
      setLoadingDisputes(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    if (isAdmin) {
      Promise.resolve().then(() => {
        if (!ignore) {
          fetchDisputes();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [isAdmin, fetchDisputes]);

  const actorLabel = currentUser?.email || 'admin';

  const logDisputeAction = async (disputeId, action, detail) => {
    if (!currentUser?.id) {
      throw new Error('Not signed in');
    }

    const { error } = await supabase.from('dispute_actions').insert({
      dispute_id: disputeId,
      actor_id: currentUser.id,
      actor_label: actorLabel,
      action,
      detail,
    });

    if (error) throw error;
  };

  const handleGrantCredits = async (dispute) => {
    setActionError('');
    setActionSuccess('');

    if (!dispute.reporter_id) {
      setActionError('Cannot grant credits: missing reporter user id.');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('admin_grant_credits', {
        p_user_id: dispute.reporter_id,
        p_amount: 1,
      });

      if (error) throw error;

      const balance = data?.credits_balance;
      const username = dispute.reporter_username || 'user';
      const detail = `Granted 1 credit to @${username}${
        balance != null ? ` (new balance: ${balance})` : ''
      }.`;

      let historyNote = '';
      try {
        await logDisputeAction(dispute.id, 'credits_granted', detail);
        await fetchDisputes({ silent: true });
      } catch (historyError) {
        console.error('Ticket history was not saved:', historyError);
        historyNote =
          ' History was not saved — run the dispute_actions SQL if you have not yet.';
      }

      setActionSuccess(detail + historyNote);
    } catch (err) {
      console.error('Credit grant failed:', err);
      setActionError('Failed to grant credits: ' + err.message);
    }
  };

  const handleUpdateStatus = async (dispute, newStatus) => {
    setActionError('');
    setActionSuccess('');

    try {
      const { error } = await supabase
        .from('disputes')
        .update({ status: newStatus })
        .eq('id', dispute.id);

      if (error) throw error;

      const fromLabel = (dispute.status || 'open').replace('_', ' ');
      const toLabel = newStatus.replace('_', ' ');
      const detail = `Changed status from ${fromLabel} to ${toLabel}.`;

      let historyNote = '';
      try {
        await logDisputeAction(dispute.id, 'status_changed', detail);
        await fetchDisputes({ silent: true });
      } catch (historyError) {
        console.error('Ticket history was not saved:', historyError);
        historyNote =
          ' History was not saved — run the dispute_actions SQL if you have not yet.';
        setDisputes((prev) =>
          prev.map((d) =>
            d.id === dispute.id ? { ...d, status: newStatus } : d
          )
        );
      }

      setActionSuccess(`Ticket status updated to "${toLabel}".` + historyNote);
    } catch (err) {
      console.error('Status update failed:', err);
      setActionError('Failed to update status: ' + err.message);
    }
  };

  // Filtered & Searched disputes
  const filteredDisputes = disputes.filter((d) => {
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      d.id.toLowerCase().includes(q) ||
      d.reporter_username?.toLowerCase().includes(q) ||
      d.reported_username?.toLowerCase().includes(q) ||
      d.reporter_email?.toLowerCase().includes(q) ||
      d.reason?.toLowerCase().includes(q) ||
      d.additional_details?.toLowerCase().includes(q)
    );
  });

  // Dispute counts
  const counts = {
    all: disputes.length,
    open: disputes.filter((d) => d.status === 'open').length,
    under_review: disputes.filter((d) => d.status === 'under_review').length,
    resolved: disputes.filter((d) => d.status === 'resolved').length,
  };

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (checkingAuth) {
    return (
      <div className="admin-loading-container">
        <div className="admin-spinner" />
        <p>Verifying administrative privileges...</p>
      </div>
    );
  }

  // Unauthorized State
  if (!isAdmin) {
    return (
      <div className="admin-unauthorized-card">
        <div className="admin-unauthorized-icon">🔒</div>
        <h2>Access Restricted</h2>
        <p>
          You must be signed in with an authorized Administrator account to view
          the SkillSwap Dispute Mediation Center.
        </p>
        <div className="admin-unauthorized-meta">
          <span>
            Current User:{' '}
            <strong>{currentUser ? currentUser.email : 'Not logged in'}</strong>
          </span>
        </div>
        <div className="admin-unauthorized-actions">
          <Link to="/" className="admin-btn-back">
            Return to Dashboard
          </Link>
          <Link to="/profile" className="admin-btn-back">
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      {/* Header */}
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Dispute Mediation Center</h1>
          <p className="admin-subtitle">
            Review reported disputes.
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-btn-refresh"
            onClick={fetchDisputes}
            disabled={loadingDisputes}
          >
            {loadingDisputes ? 'Refreshing...' : 'Refresh Records'}
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <section className="admin-metrics-grid" aria-label="Dispute statistics">
        <div className="admin-metric-card" onClick={() => setFilterStatus('all')}>
          <span className="metric-label">Total Disputes</span>
          <span className="metric-val">{counts.all}</span>
        </div>
        <div
          className="admin-metric-card metric-open"
          onClick={() => setFilterStatus('open')}
        >
          <span className="metric-label">Open / Action Required</span>
          <span className="metric-val">{counts.open}</span>
        </div>
        <div
          className="admin-metric-card metric-review"
          onClick={() => setFilterStatus('under_review')}
        >
          <span className="metric-label">Under Investigation</span>
          <span className="metric-val">{counts.under_review}</span>
        </div>
        <div
          className="admin-metric-card metric-resolved"
          onClick={() => setFilterStatus('resolved')}
        >
          <span className="metric-label">Resolved</span>
          <span className="metric-val">{counts.resolved}</span>
        </div>
      </section>

      {/* Feedback Messages */}
      {actionError && (
        <div className="admin-alert-error" role="alert">
          <span>⚠️ {actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="admin-alert-success" role="status">
          <span>✅ {actionSuccess}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <div className="admin-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filterStatus === 'all'}
            className={`admin-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterStatus === 'open'}
            className={`admin-tab ${filterStatus === 'open' ? 'active' : ''}`}
            onClick={() => setFilterStatus('open')}
          >
            Open ({counts.open})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterStatus === 'under_review'}
            className={`admin-tab ${filterStatus === 'under_review' ? 'active' : ''}`}
            onClick={() => setFilterStatus('under_review')}
          >
            Under Review ({counts.under_review})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterStatus === 'resolved'}
            className={`admin-tab ${filterStatus === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilterStatus('resolved')}
          >
            Resolved ({counts.resolved})
          </button>
        </div>

        <div className="admin-search-wrapper">
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by ticket ID, username, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="admin-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Dispute Records Table / List */}
      {loadingDisputes ? (
        <div className="admin-loading-indicator">Loading disputes...</div>
      ) : filteredDisputes.length === 0 ? (
        <div className="admin-empty-card">
          <p>No dispute tickets found matching the selected filter criteria.</p>
        </div>
      ) : (
        <div className="admin-disputes-list">
          {filteredDisputes.map((dispute) => (
            <article key={dispute.id} className="admin-dispute-card">
              <header className="dispute-card-top">
                <div className="dispute-id-group">
                  <span className="dispute-id-label">Ticket ID:</span>
                  <code className="dispute-ticket-code" title={dispute.id}>
                    {dispute.id.slice(0, 8)}...{dispute.id.slice(-4)}
                  </code>
                  <span className="dispute-date">{formatDate(dispute.created_at)}</span>
                </div>
                <div className="dispute-status-wrap">
                  <span className={`dispute-badge badge-${dispute.status}`}>
                    {dispute.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </header>

              <div className="dispute-card-body">
                {/* Reporter & Reported Info */}
                <div className="dispute-parties-grid">
                  <div className="party-box reporter-box">
                    <span className="party-role">Reporter:</span>
                    <strong className="party-name">@{dispute.reporter_username}</strong>
                    <a
                      href={`mailto:${dispute.reporter_email}?subject=SkillSwap Dispute Case ${dispute.id.slice(0, 8)}`}
                      className="party-contact-link"
                      title="Email reporter directly"
                    >
                      ✉️ {dispute.reporter_email}
                    </a>
                  </div>

                  <div className="party-divider">vs</div>

                  <div className="party-box reported-box">
                    <span className="party-role">Reported User:</span>
                    <strong className="party-name">@{dispute.reported_username}</strong>
                    <span className="party-id-sub">UID: {dispute.reported_user_id?.slice(0, 8)}...</span>
                  </div>
                </div>

                {/* Exchange Reference */}
                <div className="dispute-exchange-ref">
                  <span className="ref-label">Target Exchange:</span>
                  <code className="ref-code">{dispute.exchange_id}</code>
                </div>

                {/* Reason & Narrative */}
                <div className="dispute-narrative">
                  <div className="narrative-reason">
                    <strong>Reason:</strong> {dispute.reason}
                  </div>
                  {dispute.additional_details && (
                    <div className="narrative-details">
                      <strong>Details:</strong>
                      <p className="narrative-text">{dispute.additional_details}</p>
                    </div>
                  )}
                </div>

                <details className="dispute-history">
                  <summary className="dispute-history-toggle">
                    See details
                    {(dispute.dispute_actions?.length || 0) > 0
                      ? ` (${dispute.dispute_actions.length})`
                      : ''}
                  </summary>
                  <ol className="dispute-history-list">
                    <li>
                      <time className="history-time">
                        {formatDate(dispute.created_at)}
                      </time>
                      <span className="history-text">
                        Ticket opened by @{dispute.reporter_username}
                      </span>
                    </li>
                    {(dispute.dispute_actions || [])
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(a.created_at) - new Date(b.created_at)
                      )
                      .map((entry) => (
                        <li key={entry.id}>
                          <time className="history-time">
                            {formatDate(entry.created_at)}
                          </time>
                          <span className="history-text">{entry.detail}</span>
                          <span className="history-actor">
                            {entry.actor_label}
                          </span>
                        </li>
                      ))}
                  </ol>
                </details>
              </div>

              {/* Status Action Controls */}
              <footer className="dispute-card-actions">
                <span className="actions-label">Change Status:</span>
                <div className="action-button-group">
                  <button
                    type="button"
                    className="btn-status btn-resolve"
                    onClick={() => handleGrantCredits(dispute)}
                  >
                    Grant 1 credit to reporter
                  </button>
                  {dispute.status !== 'under_review' && (
                    <button
                      type="button"
                      className="btn-status btn-review"
                      onClick={() => handleUpdateStatus(dispute, 'under_review')}
                    >
                      Mark Under Review
                    </button>
                  )}

                  {dispute.status !== 'resolved' && (
                    <button
                      type="button"
                      className="btn-status btn-resolve"
                      onClick={() => handleUpdateStatus(dispute, 'resolved')}
                    >
                      Resolve Dispute
                    </button>
                  )}

                  {dispute.status !== 'open' && (
                    <button
                      type="button"
                      className="btn-status btn-reopen"
                      onClick={() => handleUpdateStatus(dispute, 'open')}
                    >
                      Reopen Ticket
                    </button>
                  )}
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
