// src/components/Register.jsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import './Register.css';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_EXTENSIONS = ['.mp4', '.webm', '.mov'];

export default function Register({ onSwitchToLogin, onRegisterSuccess }) {
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);

  // Field validation and async states
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [serverUsernameStatus, setServerUsernameStatus] = useState(null); // { available: boolean, message: string }
  const [fileError, setFileError] = useState('');

  // Submission pipeline states
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef(null);

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

  // Clean up object URL when component unmounts or video changes
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

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

  // Validate and handle file input
  const handleFileChange = (e) => {
    setFileError('');
    const file = e.target.files?.[0];

    if (!file) {
      setVideoFile(null);
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
        setVideoPreviewUrl(null);
      }
      return;
    }

    // Check extension
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const isValidExt = ALLOWED_EXTENSIONS.includes(extension);
    const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);

    if (!isValidExt && !isValidMime) {
      setFileError('Invalid format. Please upload an MP4, WebM, or MOV video.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setVideoFile(null);
      return;
    }

    // Check file size (<= 25MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setFileError(`File is too large (${sizeMB} MB). Maximum allowed size is 25 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setVideoFile(null);
      return;
    }

    // Valid file
    setVideoFile(file);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveFile = () => {
    setVideoFile(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFileError('');
  };

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
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

    if (!videoFile) {
      setFileError('A verification video demo is required to complete onboarding.');
      setErrorMessage('Please attach your skill verification video.');
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

      // Step 2: Upload Video to verification-videos Storage Bucket
      setCurrentStep('Uploading skill verification video (this may take a few moments)...');
      const sanitizedName = videoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageFilePath = `${registeredUser.id}/${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-videos')
        .upload(storageFilePath, videoFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: videoFile.type || 'video/mp4',
        });

      if (uploadError) {
        console.warn('Storage upload encountered an issue:', uploadError);
        // Note: Profile was already created by trigger. Provide helpful message
        setErrorMessage(
          `Account created, but video upload failed: ${uploadError.message}. You can re-upload your verification video in your Profile settings.`
        );
        return;
      }

      // Step 3: Retrieve Public Storage URL
      setCurrentStep('Generating public verification link...');
      const { data: urlData } = supabase.storage
        .from('verification-videos')
        .getPublicUrl(storageFilePath);

      const publicVideoUrl = urlData?.publicUrl || '';

      // Step 4: Attach video link to Profile & Auth Metadata
      setCurrentStep('Finalizing profile verification...');
      if (publicVideoUrl) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ verification_video_link: publicVideoUrl })
          .eq('id', registeredUser.id);

        if (profileUpdateError) {
          console.warn('Profile video link update error:', profileUpdateError);
        }

        // Also update user metadata for consistency
        await supabase.auth.updateUser({
          data: { verification_video_link: publicVideoUrl },
        });
      }

      // Step 5: Success
      setSuccessMessage(
        'Account successfully registered! 3 Starter time-credits granted. You can now sign in.'
      );
      
      // Reset form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setUsername('');
      setDisplayName('');
      setLocation('');
      handleRemoveFile();

      if (onRegisterSuccess) {
        onRegisterSuccess(registeredUser);
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
        Join our decentralized skill exchange community. New accounts start with 3 free platform credits!
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

        {/* Video Upload Field */}
        <div className="register-form-group">
          <label className="register-label" htmlFor="reg-video-file">
            Instructor Skill Verification Video <span className="required-star">*</span>
          </label>
          <p className="field-hint">
            Upload a brief video demonstrating or introducing your skill (MP4 or WebM, max 25 MB). This video is viewable by community members to verify credibility.
          </p>

          <div className="file-upload-zone">
            <input
              id="reg-video-file"
              ref={fileInputRef}
              type="file"
              accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
              onChange={handleFileChange}
              disabled={loading}
              className="file-hidden-input"
            />
            {!videoFile ? (
              <label htmlFor="reg-video-file" className="file-drop-label">
                <span className="file-icon">📹</span>
                <span className="file-primary-text">Click to browse or drop verification video</span>
                <span className="file-sub-text">MP4 or WebM up to 25 MB</span>
              </label>
            ) : (
              <div className="file-selected-card">
                <div className="file-meta">
                  <span className="file-name">{videoFile.name}</span>
                  <span className="file-size">
                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>

                {videoPreviewUrl && (
                  <div className="video-preview-wrapper">
                    <video
                      src={videoPreviewUrl}
                      controls
                      className="video-player-preview"
                      preload="metadata"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={loading}
                  className="btn-remove-file"
                >
                  Remove Video
                </button>
              </div>
            )}
          </div>

          {fileError && (
            <div className="register-status-badge status-danger" role="alert">
              ✗ {fileError}
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
          {loading ? 'Processing Onboarding...' : 'Create Account & Claim Credit'}
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
