// src/components/Register.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import './Register.css';

export default function Register({ onSwitchToLogin, onRegisterSuccess }) {
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');

  // Field validation and async states
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [serverUsernameStatus, setServerUsernameStatus] = useState(null); // { available: boolean, message: string }

  // Submission pipeline states
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Live password strength criteria derived directly during render
  const passwordCriteria = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  // Synchronous username format check derived directly during render
  const trimmedUsername = username.trim();
  const formatError = !trimmedUsername
    ? null
    : trimmedUsername.length < 3
    ? 'Username must be at least 3 characters.'
    : !/^[a-zA-Z0-9_]+$/.test(trimmedUsername)
    ? 'Alphanumeric characters and underscores only.'
    : null;

  const usernameStatus = formatError
    ? { available: false, message: formatError }
    : serverUsernameStatus;

  // Debounced username availability checker against database
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 3 || !/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .ilike('username', trimmed)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          // If error occurs (e.g. table not found), clear warning to not block user
          setServerUsernameStatus(null);
        } else if (data) {
          setServerUsernameStatus({
            available: false,
            message: 'Username is already taken.',
          });
        } else {
          setServerUsernameStatus({
            available: true,
            message: 'Username is available!',
          });
        }
      } catch (err) {
        console.error('Username check error:', err);
      } finally {
        if (isMounted) setUsernameChecking(false);
      }
    }, 450);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [username]);

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorMessage('');
    setSuccessMessage('');

    // Pre-submission client-side validation
    if (!username.trim() || username.trim().length < 3) {
      setErrorMessage('Please enter a valid username (at least 3 characters).');
      return;
    }

    if (usernameStatus && !usernameStatus.available) {
      setErrorMessage(usernameStatus.message || 'Please choose a different username.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Please satisfy all password security criteria.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: User Registration via Supabase Auth
      setCurrentStep('Creating your account...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: username.trim(),
            display_name: displayName.trim() || username.trim(),
            general_location: location.trim(),
          },
        },
      });

      if (authError) throw authError;

      const registeredUser = authData?.user;
      if (!registeredUser) {
        throw new Error('Sign up could not be completed. Please try again.');
      }

      const message = authData.session
        ? 'Account created. Your profile starts with 3 platform credits.'
        : 'Account created. Check your email to confirm your address, then sign in. Your profile starts with 3 platform credits.';
      setSuccessMessage(message);

      // Reset form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setUsername('');
      setDisplayName('');
      setLocation('');

      if (onRegisterSuccess) {
        onRegisterSuccess(registeredUser, message);
      }
    } catch (err) {
      console.error('Registration pipeline error:', err);
      setErrorMessage(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="register-card" role="region" aria-label="Registration Form">
      <h2 className="register-title">Create your SkillSwap Account</h2>
      <p className="register-subtitle">
        Learn and teach with our skill exchange community. New accounts start with 3 free platform credits!
      </p>

      {errorMessage && (
        <div className="register-badge-error" role="alert">
          <span className="badge-icon">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="register-badge-success" role="status">
          <span className="badge-icon">✅</span>
          <span>{successMessage}</span>
          {onSwitchToLogin && (
            <div className="register-success-action">
              <button
                type="button"
                className="register-btn-secondary"
                onClick={onSwitchToLogin}
              >
                Proceed to Sign In
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="register-form" noValidate>
        {/* Username */}
        <div className="register-form-group">
          <label className="register-label" htmlFor="reg-username">
            Username <span className="required-star">*</span>
          </label>
          <div className="register-input-wrapper">
            <input
              id="reg-username"
              type="text"
              required
              className={`register-input ${
                usernameStatus
                  ? usernameStatus.available
                    ? 'input-valid'
                    : 'input-invalid'
                  : ''
              }`}
              placeholder="e.g. janesmith"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
            {usernameChecking && (
              <span className="input-spinner" aria-label="Checking username availability">
                Checking...
              </span>
            )}
          </div>
          {usernameStatus && (
            <div
              className={`register-status-badge ${
                usernameStatus.available ? 'status-success' : 'status-danger'
              }`}
            >
              {usernameStatus.available ? '✓' : '✗'} {usernameStatus.message}
            </div>
          )}
        </div>

        {/* Display Name */}
        <div className="register-form-group">
          <label className="register-label" htmlFor="reg-display-name">
            Display Name
          </label>
          <input
            id="reg-display-name"
            type="text"
            className="register-input"
            placeholder="e.g. Jane Smith"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Location */}
        <div className="register-form-group">
          <label className="register-label" htmlFor="reg-location">
            General Location
          </label>
          <input
            id="reg-location"
            type="text"
            className="register-input"
            placeholder="e.g. Austin, TX or Remote"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Email */}
        <div className="register-form-group">
          <label className="register-label" htmlFor="reg-email">
            Email Address <span className="required-star">*</span>
          </label>
          <input
            id="reg-email"
            type="email"
            required
            className="register-input"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
          />
        </div>

        {/* Password */}
        <div className="register-form-group">
          <label className="register-label" htmlFor="reg-password">
            Password <span className="required-star">*</span>
          </label>
          <input
            id="reg-password"
            type="password"
            required
            className="register-input"
            placeholder="Choose a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />

          {/* Password strength verification checklist */}
          <div className="password-criteria-box">
            <span className="criteria-title">Password must include:</span>
            <ul className="criteria-list">
              <li className={passwordCriteria.minLength ? 'met' : 'unmet'}>
                {passwordCriteria.minLength ? '✓' : '○'} At least 8 characters
              </li>
              <li className={passwordCriteria.hasUpper ? 'met' : 'unmet'}>
                {passwordCriteria.hasUpper ? '✓' : '○'} At least 1 uppercase letter (A-Z)
              </li>
              <li className={passwordCriteria.hasLower ? 'met' : 'unmet'}>
                {passwordCriteria.hasLower ? '✓' : '○'} At least 1 lowercase letter (a-z)
              </li>
              <li className={passwordCriteria.hasNumber ? 'met' : 'unmet'}>
                {passwordCriteria.hasNumber ? '✓' : '○'} At least 1 number (0-9)
              </li>
              <li className={passwordCriteria.hasSpecial ? 'met' : 'unmet'}>
                {passwordCriteria.hasSpecial ? '✓' : '○'} At least 1 special character (!@#$%^&*)
              </li>
            </ul>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="register-form-group">
          <label className="register-label" htmlFor="reg-confirm-password">
            Confirm Password <span className="required-star">*</span>
          </label>
          <input
            id="reg-confirm-password"
            type="password"
            required
            className={`register-input ${
              confirmPassword && confirmPassword !== password ? 'input-invalid' : ''
            }`}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
          {confirmPassword && confirmPassword !== password && (
            <div className="register-status-badge status-danger">
              ✗ Passwords do not match
            </div>
          )}
        </div>

        {/* Progress Pipeline Indicator */}
        {loading && (
          <div className="register-pipeline-progress">
            <div className="pipeline-spinner" />
            <span className="pipeline-text">{currentStep || 'Processing registration...'}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || (usernameStatus && !usernameStatus.available)}
          className="register-btn-submit"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      {/* Switch to login toggle */}
      <div className="register-footer">
        <p>
          Already have an account?{' '}
          <button
            type="button"
            className="register-btn-link"
            onClick={onSwitchToLogin}
            disabled={loading}
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
