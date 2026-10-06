# SkillSwap password recovery

Users can choose **Forgot password?** on sign-in to request an email. The email redirects to `/reset-password`, where Supabase verifies the session before enabling the password form. A signed-in user can also use that route to set a password (including after magic-link sign-in). Password updates are made using `supabase.auth.updateUser`, without an admin key.

## Required Supabase configuration

In **Authentication → URL Configuration**, add these exact local Redirect URLs for the current development server:

- `http://127.0.0.1:5175/reset-password`
- `http://localhost:5175/reset-password` (only if the team uses this hostname)

Preserve other team/deployment URLs. Add each teammate's actual origin and port as necessary. Do not replace a working deployed Site URL just to support one developer's localhost server. The form sends its current origin explicitly as `redirectTo`; that destination must be allowed in Supabase or it can fall back to the Site URL, which currently appears to point to `localhost:3000`.

For reset emails sent directly from the Supabase dashboard, verify their destination separately; those may use the project's Site URL. Prefer the app's Forgot password flow for local testing. The Auth listener also forwards recovery events that reach ordinary app routes to `/reset-password`.

If the team customized the Reset Password email template, ensure it uses Supabase's confirmation URL and does not hard-code an obsolete localhost address. If using Supabase's default email service, check its delivery restrictions; real-user rollout may need custom SMTP.

## Verification

- `node tests/password-recovery.mjs` uses an isolated client to verify redirects, validation, update payloads, API errors, and missing-user handling. It sends no email and changes no actual password.
- Request a fresh email with an approved test account, then open it in the browser where you intend to use the app. Leave the local server running.
- Enter and confirm a new password yourself. Verify success, sign out, and sign in with the new password. Confirm the old password fails.
- Verify expired/invalid links show a recovery action; check matching-password validation, rate-limit feedback, keyboard navigation, and screen-reader announcements.

The local UI and mocked service checks do not confirm live email delivery or the Supabase redirect allowlist. Those require the project dashboard and an approved account.
