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
  const fetchDisputes = useCallback(async () => {
    setLoadingDisputes(true);
    setActionError('');
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
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

  // 3. Update dispute status
  const handleUpdateStatus = async (disputeId, newStatus) => {
    setActionError('');
    setActionSuccess('');

    try {
      const { error } = await supabase
        .from('disputes')
        .update({ status: newStatus })
        .eq('id', disputeId);

      if (error) throw error;

      setActionSuccess(`Ticket status updated to "${newStatus.replace('_', ' ')}".`);
      
      // Update local state
      setDisputes((prev) =>
        prev.map((d) => (d.id === disputeId ? { ...d, status: newStatus } : d))
      );
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
              </div>

              {/* Status Action Controls */}
              <footer className="dispute-card-actions">
                <span className="actions-label">Change Status:</span>
                <div className="action-button-group">
                  {dispute.status !== 'under_review' && (
                    <button
                      type="button"
                      className="btn-status btn-review"
                      onClick={() => handleUpdateStatus(dispute.id, 'under_review')}
                    >
                      Mark Under Review
                    </button>
                  )}

                  {dispute.status !== 'resolved' && (
                    <button
                      type="button"
                      className="btn-status btn-resolve"
                      onClick={() => handleUpdateStatus(dispute.id, 'resolved')}
                    >
                      Resolve Dispute
                    </button>
                  )}

                  {dispute.status !== 'open' && (
                    <button
                      type="button"
                      className="btn-status btn-reopen"
                      onClick={() => handleUpdateStatus(dispute.id, 'open')}
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
