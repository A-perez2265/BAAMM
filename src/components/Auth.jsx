// src/components/Auth.jsx
import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import Register from './Register';
import Footer from './Footer';
import './Auth.css';
import BrandLogo from './BrandLogo';

export default function Auth({ children, onAuthSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();

  // User and session verification tracking
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Form states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Synchronize user on mount & subscribe to auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setCheckingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setCheckingSession(false);

      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
        return;
      }

      if (event === 'SIGNED_OUT') {
        resetForm();
        navigate('/login');
      } else if (event === 'SIGNED_IN') {
        resetForm();
        if (location.pathname === '/login') {
          navigate('/');
        }
      }

      if (session && onAuthSuccess) {
        onAuthSuccess(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [onAuthSuccess, navigate, location.pathname]);

  // Automatic URL rerouting:
  // - Unauthenticated users attempting to visit any protected page (like /profile) are rerouted to /login
  // - Authenticated users on /login are rerouted to their intended page (or /)
  useEffect(() => {
    if (!checkingSession) {
      if (!user && location.pathname !== '/login') {
        navigate('/login', { replace: true, state: { from: location.pathname } });
      } else if (user && location.pathname === '/login') {
        const destination = location.state?.from || '/';
        navigate(destination, { replace: true });
      }
    }
  }, [checkingSession, user, location.pathname, location.state, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      setSuccessMessage('Signed in successfully!');
      resetForm();
      const destination = location.state?.from || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    resetForm();
    navigate('/login');
  };

  // Initial session verification loader
  if (checkingSession) {
    return (
      <div className="auth-loading">
        <p>Verifying session...</p>
      </div>
    );
  }

  // If user is authenticated, render session bar + children
  if (user) {
    const userDisplayName = user.user_metadata?.display_name || user.email;
    const userHandle = user.user_metadata?.username;

    return (
      <div className="auth-authenticated-container">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <header className="auth-session-bar">
          <Link to="/profile" className="community-brand" aria-label="SkillSwap — my profile">
            <BrandLogo variant="header" decorative />
          </Link>
          <nav className="auth-session-nav" aria-label="Main navigation">
            <NavLink to="/search" className="auth-nav-link">
              Search
            </NavLink>
            <NavLink to="/request" className="auth-nav-link">
              Request
            </NavLink>
            <NavLink to="/incoming" className="auth-nav-link">
              Incoming
            </NavLink>
            <NavLink to="/confirm" className="auth-nav-link">
              Confirm
            </NavLink>
            <NavLink to="/skills" className="auth-nav-link">
              My Skills
            </NavLink>
            <NavLink to="/profile" className="auth-nav-link">
              Profile
            </NavLink>
          </nav>

          <div className="auth-user-info">
            <span className="auth-user-greeting">
              Signed in as <strong>{userDisplayName}</strong>
            </span>
            {userHandle && <span className="auth-user-handle">@{userHandle}</span>}
            <button onClick={handleSignOut} className="auth-btn-signout" type="button">
              Sign Out
            </button>
          </div>
        </header>

        {children ? (
          <div className="auth-protected-content">{children}</div>
        ) : (
          <div className="auth-container auth-logged-in-card">
            <h2>Account Status</h2>
            <div className="auth-alert-success">You are currently signed in.</div>
            <p>
              <strong>Display Name:</strong> {userDisplayName}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
          </div>
        )}

        <Footer />
      </div>
    );
  }

  // If not authenticated, render Login or Register inside a single layout wrapper
  return (
    <div className="auth-page-wrapper">
      <div className="auth-page-content">
        {isSignUp ? (
          <Register
            onSwitchToLogin={() => {
              setIsSignUp(false);
              resetForm();
            }}
            onRegisterSuccess={() => {
              setIsSignUp(false);
              setSuccessMessage('Registration successful! Please sign in with your credentials.');
            }}
          />
        ) : (
          <div className="auth-container">
            <BrandLogo />
            <h2 className="auth-title">Sign In</h2>

            {errorMessage && <div className="auth-alert-error">{errorMessage}</div>}
            {successMessage && <div className="auth-alert-success">{successMessage}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-form-group">
                <label className="auth-label" htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  autoComplete="email"
                  type="email"
                  required
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="auth-form-group">
                <label className="auth-label" htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  autoComplete="current-password"
                  type="password"
                  required
                  minLength={6}
                  className="auth-input"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" disabled={loading} className="auth-btn-submit">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="auth-toggle-container"><Link to="/forgot-password">Forgot password?</Link></p>

            <div className="auth-toggle-container">
              <p>
                Need an account?{' '}
                <button
                  type="button"
                  className="auth-btn-link"
                  onClick={() => {
                    setIsSignUp(true);
                    resetForm();
                  }}
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}