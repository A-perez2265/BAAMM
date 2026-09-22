// src/components/Auth.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import './Auth.css';

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
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setDisplayName('');
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
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
              display_name: displayName.trim(),
            },
          },
        });

        if (error) throw error;
        setSuccessMessage('Account registered! Check your email or sign in.');
        setPassword('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        setSuccessMessage('Signed in successfully!');
        resetForm();
        const destination = location.state?.from || '/';
        navigate(destination, { replace: true });
      }
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
        <header className="auth-session-bar">
          <nav className="auth-session-nav">
            <Link to="/skills" className="auth-nav-link">
              My Skills
            </Link>
            <Link to="/profile" className="auth-nav-link">
              Profile
            </Link>
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
      </div>
    );
  }

  // If not authenticated, render login / signup card
  return (
    <div className="auth-container">
      <h2 className="auth-title">{isSignUp ? 'Create a Skill Swap Account' : 'Sign In'}</h2>

      {errorMessage && <div className="auth-alert-error">{errorMessage}</div>}
      {successMessage && <div className="auth-alert-success">{successMessage}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        {isSignUp && (
          <>
            <div className="auth-form-group">
              <label className="auth-label">Username</label>
              <input
                type="text"
                required
                className="auth-input"
                placeholder="e.g. alexsmith"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="auth-form-group">
              <label className="auth-label">Display Name</label>
              <input
                type="text"
                required
                className="auth-input"
                placeholder="e.g. Alex Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="auth-form-group">
          <label className="auth-label">Email Address</label>
          <input
            type="email"
            required
            className="auth-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="auth-form-group">
          <label className="auth-label">Password</label>
          <input
            type="password"
            required
            minLength={6}
            className="auth-input"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading} className="auth-btn-submit">
          {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>

      <div className="auth-toggle-container">
        {isSignUp ? (
          <p>
            Already have an account?{' '}
            <button
              type="button"
              className="auth-btn-link"
              onClick={() => {
                setIsSignUp(false);
                setPassword('');
                setErrorMessage('');
                setSuccessMessage('');
              }}
            >
              Sign In
            </button>
          </p>
        ) : (
          <p>
            Need an account?{' '}
            <button
              type="button"
              className="auth-btn-link"
              onClick={() => {
                setIsSignUp(true);
                setPassword('');
                setErrorMessage('');
                setSuccessMessage('');
              }}
            >
              Sign Up
            </button>
          </p>
        )}
      </div>
    </div>
  );
}