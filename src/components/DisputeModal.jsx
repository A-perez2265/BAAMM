// src/components/DisputeModal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import './DisputeModal.css';

const DISPUTE_REASONS = [
  'No-show / Missed scheduled session',
  'Unprepared or misrepresented skill offering',
  'Unprofessional / inappropriate conduct',
  'Credit balance or exchange finalization dispute',
  'Technical failure during session',
  'Other violation of platform terms',
];

export default function DisputeModal({
  isOpen,
  onClose,
  exchange,
  currentUser,
  onDisputeSubmitted,
}) {
  const [reason, setReason] = useState(DISPUTE_REASONS[0]);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !exchange) return null;

  // Display labels only; the RPC derives reporter identity from the session.
  const reporterEmail = currentUser?.email || '';
  const reporterUsername = currentUser?.user_metadata?.username || 'you';
  const isLearner = currentUser?.id === exchange.learner_id;
  const reportedUsername = (isLearner ? exchange.teacher?.username : exchange.learner?.username) || 'exchange partner';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!reason) {
      setErrorMessage('Please select a dispute reason.');
      return;
    }

    if (!additionalDetails.trim() || additionalDetails.trim().length < 15) {
      setErrorMessage('Please provide a detailed explanation (at least 15 characters).');
      return;
    }

    setLoading(true);

    try {
      const disputable = ['accepted', 'session_completed', 'awaiting_confirmation']
      if (!disputable.includes(exchange.status)) {
        throw new Error(
          'This exchange can no longer be disputed. Refresh and try another unsettled lesson.'
        )
      }

      const { data: disputeData, error: disputeError } = await supabase.rpc('submit_skill_dispute', {
        p_exchange_id: exchange.id,
        p_reason: reason,
        p_details: additionalDetails.trim(),
      });
      if (disputeError) throw disputeError;

      setSuccessMessage(
        'Dispute submitted. Confirmation is blocked while an administrator reviews the report.'
      );
      
      setTimeout(() => {
        if (onDisputeSubmitted) {
          onDisputeSubmitted(disputeData);
        }
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Error submitting dispute:', err);
      setErrorMessage(err.message || 'Failed to lodge dispute. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="dispute-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="dispute-modal-container">
        <header className="dispute-modal-header">
          <div>
            <h2 id="dispute-modal-title" className="dispute-modal-heading">
              Report Exchange Issue
            </h2>
            <span className="dispute-modal-subheading">
              File a formal dispute for mediation by SkillSwap administrators.
            </span>
          </div>
          <button
            type="button"
            className="dispute-btn-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
          >
            ✕
          </button>
        </header>

        {errorMessage && (
          <div className="dispute-alert-error" role="alert">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="dispute-alert-success" role="status">
            <span>✅ {successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="dispute-form">
          {/* Exchange Context Information */}
          <div className="dispute-meta-panel">
            <div className="dispute-meta-row">
              <span className="dispute-meta-label">Exchange ID:</span>
              <code className="dispute-meta-code">{exchange.id}</code>
            </div>
            <div className="dispute-meta-row">
              <span className="dispute-meta-label">Filing As:</span>
              <span className="dispute-meta-val">
                @{reporterUsername} ({reporterEmail})
              </span>
            </div>
            <div className="dispute-meta-row">
              <span className="dispute-meta-label">Reported User:</span>
              <span className="dispute-meta-val">@{reportedUsername}</span>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="dispute-form-group">
            <label htmlFor="dispute-reason" className="dispute-label">
              Reason for Dispute <span className="required-star">*</span>
            </label>
            <select
              id="dispute-reason"
              className="dispute-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
            >
              {DISPUTE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Explanation */}
          <div className="dispute-form-group">
            <div className="dispute-label-with-counter">
              <label htmlFor="dispute-details" className="dispute-label">
                Detailed Explanation <span className="required-star">*</span>
              </label>
              <span className="dispute-char-counter">
                {additionalDetails.length} / 1000
              </span>
            </div>
            <textarea
              id="dispute-details"
              rows={4}
              maxLength={1000}
              className="dispute-textarea"
              placeholder="Describe what occurred, any missed commitments, or why the exchange should be closed without payment..."
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Admin Resolution Email Notice */}
          <div className="dispute-notice-box">
            <span className="dispute-notice-icon" aria-hidden="true">✉️</span>
            <p className="dispute-notice-text">
              An administrator can close this exchange without payment. Neither participant receives or loses credits when a dispute is closed.
            </p>
          </div>

          <footer className="dispute-modal-actions">
            <button
              type="button"
              className="dispute-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dispute-btn-submit"
              disabled={loading || additionalDetails.trim().length < 15}
            >
              {loading ? 'Submitting Dispute...' : 'Submit Formal Dispute'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
