// test-auth.js
import { createClient } from '@supabase/supabase-js';

// Read directly from your .env.local values
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runAuthTests() {
  const timestamp = Date.now();
  const testEmail = `testuser_${timestamp}@gmail.com`;
  const testPassword = 'Password123!';
  const testUsername = `testuser_${timestamp}`;
  const testDisplayName = 'Test User';

  console.log('--- Starting Supabase Auth Verification ---');

  // Test 1: User Registration
  console.log(`\n[1/3] Testing Sign Up with ${testEmail}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        username: testUsername,
        display_name: testDisplayName,
      },
    },
  });

  if (signUpError) {
    console.error('❌ Sign Up Failed:', signUpError.message);
    process.exit(1);
  }

  console.log('✅ Sign Up Succeeded!');
  console.log('   User ID:', signUpData.user?.id);
  console.log('   User Metadata:', signUpData.user?.user_metadata);

  // Test 2: Sign In with Password
  console.log(`\n[2/3] Testing Sign In with password...`);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) {
    console.error('❌ Sign In Failed:', signInError.message);
    process.exit(1);
  }

  console.log('✅ Sign In Succeeded!');
  console.log('   Session Token (JWT) acquired:', !!signInData.session?.access_token);
  console.log('   Logged-in User UID matches:', signInData.user?.id === signUpData.user?.id);

  // Test 3: Sign Out
  console.log(`\n[3/3] Testing Sign Out...`);
  const { error: signOutError } = await supabase.auth.signOut();

  if (signOutError) {
    console.error('❌ Sign Out Failed:', signOutError.message);
    process.exit(1);
  }

  console.log('✅ Sign Out Succeeded!');
  console.log('\n--- All Backend Auth Tests Passed Successfully! ---');
}

runAuthTests();