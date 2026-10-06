import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import { requestPasswordReset, updatePassword, validateNewPassword } from '../services/passwordRecoveryService'
import BrandLogo from '../components/BrandLogo'
import '../components/Auth.css'

export default function PasswordRecoveryPage({ mode }) {
  const isReset = mode === 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [checking, setChecking] = useState(isReset)
  const [hasSession, setHasSession] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef(null)
  const successRef = useRef(null)

  useEffect(() => {
    if (!isReset) return
    let active = true
    async function check() {
      const fragment = new URLSearchParams(window.location.hash.slice(1))
      const query = new URLSearchParams(window.location.search)
      if (fragment.has('error') || fragment.has('error_code') || query.has('error') || query.has('error_code')) {
        if (active) { setError('This reset link has expired or is invalid. Request a new link below.'); setChecking(false) }
        return
      }
      try {
        // The client processes the email tokens before this call; verify the user with Auth.
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('No valid session')
        if (active) setHasSession(true)
      } catch {
        if (active) setError('This reset link has expired or is invalid. Request a new link below.')
      } finally { if (active) setChecking(false) }
    }
    check()
    return () => { active = false }
  }, [isReset])

  function showError(message) {
    setError(message)
    requestAnimationFrame(() => errorRef.current?.focus())
  }
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    if (isReset) {
      const validation = validateNewPassword(password, confirmation)
      if (validation) { showError(validation); return }
      if (!hasSession) { showError('Request a new reset link to continue.'); return }
    }
    setError('')
    setBusy(true)
    try {
      if (isReset) await updatePassword(password)
      else await requestPasswordReset(email, window.location.origin)
      setPassword('')
      setConfirmation('')
      setDone(true)
      requestAnimationFrame(() => successRef.current?.focus())
    } catch (requestError) {
      if (requestError.code === 'same_password') showError('Choose a password different from your current password.')
      else if (requestError.code === 'weak_password') showError('Choose a stronger password. Your team may require a mix of letters, numbers, and symbols.')
      else if (requestError.status === 429 || requestError.code === 'over_email_send_rate_limit') showError('Too many attempts. Wait a few minutes, then try again.')
      else showError(isReset ? 'Unable to update your password. Try again, or request a new reset link.' : 'Unable to send a reset email. Please try again in a few minutes.')
    } finally { setBusy(false) }
  }

  return (
    <main id="main-content" className="auth-container recovery-card">
      <BrandLogo />
      <h1 className="auth-title">{isReset ? ('Set a new password') : 'Forgot your password?'}</h1>
      <p className="recovery-intro">{isReset ? 'Choose a new password to get back to sharing and learning.' : 'It happens. Enter your account email and we’ll send you a reset link.'}</p>
      {error && <p ref={errorRef} role="alert" tabIndex={-1} className="notice error">{error}</p>}
      {checking ? <p role="status">Checking your reset link…</p> : done ? (
        <div ref={successRef} tabIndex={-1}>
          <p role="status" className="notice success">{isReset ? 'Your password has been updated. Use your new password next time you sign in.' : 'If an account exists for that email, you’ll receive a reset link. Check your inbox and spam folder.'}</p>
          <Link className="button-link" to={isReset ? '/profile' : '/login'}>{isReset ? 'Back to SkillSwap' : 'Back to sign in'}</Link>
        </div>
      ) : isReset && !hasSession ? <Link className="button-link" to="/forgot-password">Request a new reset link</Link> : (
        <form onSubmit={submit} className="auth-form" aria-busy={busy}>
          <fieldset disabled={busy} className="recovery-fields">
            <legend className="sr-only">{isReset ? ('New password') : 'Account email'}</legend>
            {isReset ? <>
              <label className="auth-label" htmlFor="new-password">New password</label>
              <input id="new-password" type="password" className="auth-input" required minLength={8} autoComplete="new-password" aria-describedby="password-help" value={password} onChange={event => setPassword(event.target.value)} />
              <p id="password-help" className="field-help">Use at least 8 characters. A longer, unique passphrase works well.</p>
              <label className="auth-label" htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" type="password" className="auth-input" required minLength={8} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} />
            </> : <>
              <label className="auth-label" htmlFor="recovery-email">Email address</label>
              <input id="recovery-email" type="email" className="auth-input" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
            </>}
          </fieldset>
          <button className="auth-btn-submit" disabled={busy}>{busy ? (isReset ? 'Updating…' : 'Sending…') : (isReset ? ('Update password') : 'Send reset link')}</button>
        </form>
      )}
      {!done && <p className="auth-toggle-container"><Link to="/login">Back to sign in</Link>{isReset && hasSession && <> · <Link to="/forgot-password">Request a new link</Link></>}</p>}
    </main>
  )
}
