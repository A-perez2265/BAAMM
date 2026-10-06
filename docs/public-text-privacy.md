# Public profile and skill text privacy

The local app rejects recognizable email addresses, phone numbers (7 or more digits with common separators), numbered street addresses, and PO boxes in saved public profile and skill fields. The checks run in form validation and again in save services. Normalization also handles full-width characters, invisible separators, hashtags, and common [at]/[dot] disguises.

Apply `supabase/public_text_privacy.sql` in the team's Supabase SQL editor to enforce the same policy on database inserts and updates. This migration has not been applied or tested against the live database. It does not alter ownership policies or inspect private authentication email fields. Test ordinary-user direct inserts and updates after applying it, including contact details in tags. Existing records are not automatically cleaned; an existing record containing blocked text must be cleaned before it can be updated.

This is best-effort pattern detection. Spelled-out numbers, unusual/international address formats, and deliberate disguises can evade it. Long numeric identifiers and address-like harmless text can produce false positives. Do not describe it as a guarantee that personal information cannot be shared. User-entered text across multiple fields can also disguise contact information.

Verification: `node tests/profile-and-skills.mjs` includes blocked and allowed examples, and verifies rejected service calls never reach the database client. Tests use a mock client and do not establish live trigger enforcement.
