# Admin Auth Security Fix

**Date:** 2026-10-20  
**Severity:** Critical — privilege escalation, any authenticated user could access the admin dashboard

---

## The Bug

### Root cause: `COALESCE` fallthrough in `is_admin()` SQL function

The `public.is_admin()` function used three-arm `COALESCE` logic to determine admin status:

```sql
-- OLD (vulnerable)
select coalesce(
  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'),   -- arm 1
  (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, -- arm 2 ← exploit
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true), -- arm 3
  false
);
```

`COALESCE` returns the **first non-NULL value**. For any user without `app_metadata.role` set (i.e., everyone except accounts provisioned with the old `role = 'admin'` convention), arm 1 evaluates to `NULL` — not `false` — so evaluation falls through to arm 2: `user_metadata.is_admin`.

`user_metadata` is fully writable by the authenticated user themselves via:

```js
await supabase.auth.updateUser({ data: { is_admin: true } })
```

Any user could run this one line in the browser console and `is_admin()` would return `true`, granting full admin dashboard access.

Arm 3 (the `public.profiles` table fallback) was also insecure — that table's `is_admin` column has no write protection preventing a user from updating their own row under certain RLS configurations.

### Frontend also read metadata client-side

Before the fix, `AdminDashboard.jsx` also checked `user.user_metadata?.is_admin === true` directly on the session object, bypassing the RPC entirely for the fast path. Client-side session data is fully attacker-controlled and must never be used for authorization decisions.

---

## The Fix

### 1. SQL — `public.is_admin()` rewritten

`app_metadata` is the only Supabase JWT claim that **cannot be written by an authenticated user**. It requires a service-role key (backend only). The function now checks only that:

```sql
-- NEW (secure)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  );
$$;
```

All fallbacks to `user_metadata` and `public.profiles.is_admin` were removed.

### 2. Frontend — route-level guard added in `App.jsx`

A new `AdminRoute` component wraps the `/admin` route and calls `supabase.rpc('is_admin')` before mounting any admin content. Non-admin results (including RPC errors) immediately redirect to `/`:

```jsx
function AdminRoute() {
  const [status, setStatus] = useState('checking');
  useEffect(() => {
    supabase.rpc('is_admin').then(({ data, error }) => {
      setStatus(error || data !== true ? 'unauthorized' : 'authorized');
    });
  }, []);
  if (status === 'checking') return null;
  if (status === 'unauthorized') return <Navigate to="/" replace />;
  return <AdminDashboard />;
}
```

### 3. Frontend — `AdminDashboard.jsx` internal check updated

The internal `checkAdminStatus` function was also rewritten to call `supabase.rpc('is_admin')` exclusively, removing the `user_metadata` check and the `profiles` table fallback. On failure or non-admin result it calls `navigate('/', { replace: true })`.

---

## How to Grant Admin Access

Since `user_metadata` is no longer used, admin status must be set via `app_metadata` using the Supabase service-role key or the SQL editor:

```sql
-- Run in Supabase SQL Editor (replace UUID with the target user's ID)
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'::jsonb
where id = '<admin-user-uuid>';
```

The user must sign out and back in for the updated JWT claim to take effect.

---

## Files Changed

| File | Change |
|---|---|
| `supabase/disputes_and_verification.sql` | Rewrote `public.is_admin()` to read only `app_metadata.is_admin` |
| `src/App.jsx` | Added `AdminRoute` guard component; `/admin` route now uses it |
| `src/pages/AdminDashboard.jsx` | Removed `user_metadata` / `profiles` checks; uses `rpc('is_admin')` only; redirects on denial |
