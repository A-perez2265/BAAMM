/* global process, Buffer */
// test-security-suite.js
// SkillSwap Automated Security, Validation, & Concurrency Verification Suite
// Usage: node --env-file=.env.local test-security-suite.js

import { createClient } from '@supabase/supabase-js';

// Visual reporting constants
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const CHECK = `${GREEN}✔${RESET}`;
const CROSS = `${RED}✘${RESET}`;
const WARN = `${YELLOW}⚠${RESET}`;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    `\n${RED}[FATAL CONFIG ERROR]${RESET} Missing Supabase environment variables.`
  );
  console.error('Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present in .env.local');
  console.error('Run via: node --env-file=.env.local test-security-suite.js\n');
  process.exit(1);
}

// Client Factory
function makeClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const anonClient = makeClient();
const clientA = makeClient();
const clientB = makeClient();
const clientC = makeClient();

const testRunTimestamp = Date.now();
const testPassword = 'SecTest_Pass!987';

// Test Account Descriptors
const userConfigA = {
  email: `sec_test_a_${testRunTimestamp}@testdomain.org`,
  password: testPassword,
  username: `seca_${testRunTimestamp.toString().slice(-6)}`,
  displayName: 'Security User Alpha',
};

const userConfigB = {
  email: `sec_test_b_${testRunTimestamp}@testdomain.org`,
  password: testPassword,
  username: `secb_${testRunTimestamp.toString().slice(-6)}`,
  displayName: 'Security User Beta',
};

const userConfigC = {
  email: `sec_test_c_${testRunTimestamp}@testdomain.org`,
  password: testPassword,
  username: `secc_${testRunTimestamp.toString().slice(-6)}`,
  displayName: 'Security User Charlie (Third Party)',
};

let userA = null;
let userB = null;
let userC = null;

// Helper: Provision and authenticate test user
async function provisionAndLogin(client, config) {
  const { error: signUpError } = await client.auth.signUp({
    email: config.email,
    password: config.password,
    options: {
      data: {
        username: config.username,
        display_name: config.displayName,
      },
    },
  });

  if (signUpError) {
    throw new Error(`Failed to create ${config.email}: ${signUpError.message}`);
  }

  // Attempt login to acquire session
  const { data: signInData, error: signInError } =
    await client.auth.signInWithPassword({
      email: config.email,
      password: config.password,
    });

  if (signInError) {
    throw new Error(`Failed to sign in ${config.email}: ${signInError.message}`);
  }

  return {
    id: signInData.user.id,
    email: config.email,
    username: config.username,
    session: signInData.session,
  };
}

// ==============================================================================
// TEST DEFINITIONS
// ==============================================================================

/**
 * SEC-01: Multi-Tenancy Isolation
 * Authenticate as User A and attempt an UPDATE on User B's profile row.
 * Verify it fails or affects 0 rows under RLS.
 */
async function testSEC01() {
  console.log(`\n${BOLD}[SEC-01] Multi-Tenancy Profile Isolation${RESET}`);
  console.log('  Testing User A unauthorized mutation of User B profile row...');

  // User A tries to overwrite User B's display_name and balance
  const { data, error } = await clientA
    .from('profiles')
    .update({
      display_name: 'ATTACKER_OVERWRITE',
      credits_balance: 9999,
    })
    .eq('id', userB.id)
    .select();

  // Inspect User B profile to verify unchanged state
  const { data: profileB } = await clientB
    .from('profiles')
    .select('display_name, credits_balance')
    .eq('id', userB.id)
    .single();

  const isMutationBlocked =
    error !== null || !data || data.length === 0;
  const isProfileUnchanged =
    profileB &&
    profileB.display_name !== 'ATTACKER_OVERWRITE' &&
    profileB.credits_balance !== 9999;

  if (isMutationBlocked && isProfileUnchanged) {
    console.log(`  ${CHECK} User A write attempt denied or affected 0 rows by RLS.`);
    console.log(`  ${CHECK} User B's profile remains intact (${profileB.display_name}).`);
    return true;
  } else {
    console.error(`  ${CROSS} MULTI-TENANCY BREACH: User A modified User B profile!`);
    return false;
  }
}

/**
 * SEC-02: Storage Authorization
 * Verify User A cannot upload into or overwrite User B's storage folder.
 */
async function testSEC02() {
  console.log(`\n${BOLD}[SEC-02] Storage Directory Authorization${RESET}`);
  console.log(`  Attempting unauthorized upload: User A -> verification-videos/${userB.id}/*`);

  const fakeVideoBytes = Buffer.from(
    '00000018667479706d703432000000006d70343269736f6d',
    'hex'
  );
  const maliciousPath = `${userB.id}/exploit_injection_${Date.now()}.mp4`;

  const { error } = await clientA.storage
    .from('verification-videos')
    .upload(maliciousPath, fakeVideoBytes, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (error) {
    console.log(`  ${CHECK} Storage correctly rejected cross-user upload: "${error.message}"`);
    
    // Positive verification: verify User A can upload to own directory
    const legitimatePath = `${userA.id}/legitimate_proof_${Date.now()}.mp4`;
    const { error: ownUploadError } = await clientA.storage
      .from('verification-videos')
      .upload(legitimatePath, fakeVideoBytes, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (!ownUploadError) {
      console.log(`  ${CHECK} User A verified able to upload into own directory (${userA.id}/*).`);
      // Cleanup legitimate test file
      await clientA.storage.from('verification-videos').remove([legitimatePath]);
    }

    return true;
  } else {
    console.error(`  ${CROSS} STORAGE VULNERABILITY: User A uploaded to User B directory!`);
    await clientB.storage.from('verification-videos').remove([maliciousPath]);
    return false;
  }
}

/**
 * SEC-03: Unauthenticated Block
 * Verify an unauthenticated client cannot upload files or insert into
 * public.skills, public.exchanges, or public.disputes.
 */
async function testSEC03() {
  console.log(`\n${BOLD}[SEC-03] Anonymous / Unauthenticated Block${RESET}`);
  let allBlocked = true;

  // 1. Unauthenticated Storage Upload
  const { error: storageError } = await anonClient.storage
    .from('verification-videos')
    .upload('unauth_video.mp4', Buffer.from('data'), { contentType: 'video/mp4' });
  if (storageError) {
    console.log(`  ${CHECK} Storage upload by anonymous client blocked.`);
  } else {
    console.error(`  ${CROSS} Anonymous upload permitted!`);
    allBlocked = false;
  }

  // 2. Unauthenticated Skills Insert
  const { error: skillsError } = await anonClient.from('skills').insert([
    {
      title: 'Malicious Injected Skill',
      listing_type: 'Teacher',
      category: 'Hacking',
      description: 'Unauthorized insertion test',
    },
  ]);
  if (skillsError) {
    console.log(`  ${CHECK} Insertion into public.skills blocked.`);
  } else {
    console.error(`  ${CROSS} Anonymous insert to public.skills permitted!`);
    allBlocked = false;
  }

  // 3. Unauthenticated Exchanges Insert
  const { error: exchangeError } = await anonClient.from('exchanges').insert([
    {
      learner_id: userA.id,
      teacher_id: userB.id,
      status: 'pending',
    },
  ]);
  if (exchangeError) {
    console.log(`  ${CHECK} Insertion into public.exchanges blocked.`);
  } else {
    console.error(`  ${CROSS} Anonymous insert to public.exchanges permitted!`);
    allBlocked = false;
  }

  // 4. Unauthenticated Disputes Insert
  const { error: disputeError } = await anonClient.from('disputes').insert([
    {
      reporter_id: userA.id,
      reported_user_id: userB.id,
      reporter_email: 'attacker@evil.com',
      reporter_username: 'attacker',
      reported_username: userB.username,
      reason: 'Malicious unauth dispute',
    },
  ]);
  if (disputeError) {
    console.log(`  ${CHECK} Insertion into public.disputes blocked.`);
  } else {
    console.error(`  ${CROSS} Anonymous insert to public.disputes permitted!`);
    allBlocked = false;
  }

  return allBlocked;
}

/**
 * SEC-04: Frontend Credential Audit
 * Assert that only VITE_SUPABASE_ANON_KEY is present and no service_role secrets are exposed.
 */
async function testSEC04() {
  console.log(`\n${BOLD}[SEC-04] Frontend Credential Audit & Leaked Secret Defense${RESET}`);

  // 1. Verify Anon key existence
  if (!SUPABASE_ANON_KEY) {
    console.error(`  ${CROSS} Anon public key not found.`);
    return false;
  }
  console.log(`  ${CHECK} Public anon key is defined in runtime environment.`);

  // 2. Assert no service_role key exists in process.env
  const dangerousEnvKeys = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'VITE_SERVICE_ROLE_KEY',
  ];

  let hasLeakedKey = false;
  for (const k of dangerousEnvKeys) {
    if (process.env[k]) {
      console.error(`  ${CROSS} LEAK DETECTED: ${k} is present in environment!`);
      hasLeakedKey = true;
    }
  }

  if (!hasLeakedKey) {
    console.log(`  ${CHECK} Zero service_role or admin secrets exposed in client environment.`);
  }

  // 3. Inspect JWT payload of anon key
  try {
    const parts = SUPABASE_ANON_KEY.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload.role === 'anon') {
        console.log(`  ${CHECK} Decoded JWT role confirmed as "${payload.role}" (safe).`);
      } else {
        console.error(`  ${CROSS} JWT role is not "anon" (found "${payload.role}")!`);
        return false;
      }
    }
  } catch (err) {
    console.log(`  ${WARN} Note: Could not decode anon key as JWT (${err.message}).`);
  }

  return !hasLeakedKey;
}

/**
 * SEC-05: RPC Concurrency & Double-Spend Defense
 * Simulate parallel requests against complete_exchange RPC using Promise.all()
 * to prove that PostgreSQL's FOR UPDATE lock guarantees atomicity.
 */
async function testSEC05() {
  console.log(`\n${BOLD}[SEC-05] RPC Concurrency & Double-Spend Defense${RESET}`);
  console.log('  Setting up test exchange and checking initial balances...');

  // Ensure User A has 3 credits
  await clientA
    .from('profiles')
    .update({ credits_balance: 3 })
    .eq('id', userA.id);

  const { data: profAInit } = await clientA
    .from('profiles')
    .select('credits_balance')
    .eq('id', userA.id)
    .single();

  const { data: profBInit } = await clientB
    .from('profiles')
    .select('credits_balance')
    .eq('id', userB.id)
    .single();

  const initBalanceA = profAInit.credits_balance;
  const initBalanceB = profBInit.credits_balance;

  console.log(`  Initial Balances -> Learner (User A): ${initBalanceA}, Teacher (User B): ${initBalanceB}`);

  // Create test exchange in confirmable status ('accepted')
  const { data: exchange, error: exError } = await clientA
    .from('exchanges')
    .insert([
      {
        learner_id: userA.id,
        teacher_id: userB.id,
        status: 'accepted',
      },
    ])
    .select()
    .single();

  if (exError) {
    console.error(`  ${CROSS} Failed to prepare test exchange: ${exError.message}`);
    return false;
  }

  console.log(`  Test exchange created (ID: ${exchange.id}, Status: ${exchange.status}).`);
  console.log('  Firing 5 concurrent complete_exchange RPC calls via Promise.all()...');

  const CONCURRENCY_COUNT = 5;
  const calls = Array.from({ length: CONCURRENCY_COUNT }).map(() =>
    clientA.rpc('complete_exchange', { p_exchange_id: exchange.id })
  );

  const settled = await Promise.allSettled(calls);

  let successCount = 0;
  let failureCount = 0;

  for (const res of settled) {
    if (res.status === 'fulfilled' && !res.value.error) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(`  Results -> Succeeded: ${successCount}, Rejected: ${failureCount}`);

  // Verify final balances
  const { data: profAFinal } = await clientA
    .from('profiles')
    .select('credits_balance')
    .eq('id', userA.id)
    .single();

  const { data: profBFinal } = await clientB
    .from('profiles')
    .select('credits_balance')
    .eq('id', userB.id)
    .single();

  const { data: finalExchange } = await clientA
    .from('exchanges')
    .select('status')
    .eq('id', exchange.id)
    .single();

  const finalBalanceA = profAFinal.credits_balance;
  const finalBalanceB = profBFinal.credits_balance;

  console.log(`  Final Balances   -> Learner (User A): ${finalBalanceA}, Teacher (User B): ${finalBalanceB}`);
  console.log(`  Final Exchange Status: "${finalExchange.status}"`);

  const exactlyOneSucceeded = successCount === 1;
  const correctBalanceShift =
    finalBalanceA === initBalanceA - 1 && finalBalanceB === initBalanceB + 1;
  const isFinalized = finalExchange.status === 'completed';

  if (exactlyOneSucceeded && correctBalanceShift && isFinalized) {
    console.log(`  ${CHECK} Row lock (FOR UPDATE) prevented double-spending.`);
    console.log(`  ${CHECK} Platform currency conserved atomically (exactly 1 credit transferred).`);
    return true;
  } else {
    console.error(`  ${CROSS} CONCURRENCY DEFECT: Race condition occurred or balance desynchronized!`);
    return false;
  }
}

/**
 * SEC-06: Dispute Insertion & Isolation
 * Verify an authenticated participant can lodge a dispute for their own exchange,
 * but cannot read or alter arbitrary disputes logged by unrelated parties.
 */
async function testSEC06() {
  console.log(`\n${BOLD}[SEC-06] Dispute Insertion & Multi-Party RLS Isolation${RESET}`);

  // 1. Create exchange between User A and User B
  const { data: exchange, error: exError } = await clientA
    .from('exchanges')
    .insert([
      {
        learner_id: userA.id,
        teacher_id: userB.id,
        status: 'accepted',
      },
    ])
    .select()
    .single();

  if (exError) {
    console.error(`  ${CROSS} Failed to setup exchange for dispute: ${exError.message}`);
    return false;
  }

  // 2. User A lodges a dispute for their exchange
  const { data: dispute, error: disputeError } = await clientA
    .from('disputes')
    .insert([
      {
        exchange_id: exchange.id,
        reporter_id: userA.id,
        reported_user_id: userB.id,
        reporter_email: userA.email,
        reporter_username: userA.username,
        reported_username: userB.username,
        reason: 'No-show / Missed scheduled session',
        additional_details: 'SEC-06 automated audit test ticket.',
        status: 'open',
      },
    ])
    .select()
    .single();

  if (disputeError) {
    console.error(`  ${CROSS} User A failed to insert dispute: ${disputeError.message}`);
    return false;
  }
  console.log(`  ${CHECK} Participant (User A) successfully filed dispute (ID: ${dispute.id}).`);

  // 3. User A can read their own dispute
  const { data: ownDispute } = await clientA
    .from('disputes')
    .select('*')
    .eq('id', dispute.id);

  if (ownDispute && ownDispute.length === 1) {
    console.log(`  ${CHECK} Reporter (User A) is authorized to view their dispute record.`);
  } else {
    console.error(`  ${CROSS} User A could not view their own dispute!`);
    return false;
  }

  // 4. User C (unrelated third party) attempts to READ User A's dispute
  console.log('  Testing User C (unrelated third party) read isolation...');
  const { data: cReadData } = await clientC
    .from('disputes')
    .select('*')
    .eq('id', dispute.id);

  const isReadIsolated = !cReadData || cReadData.length === 0;
  if (isReadIsolated) {
    console.log(`  ${CHECK} Unrelated User C returned 0 records when selecting dispute.`);
  } else {
    console.error(`  ${CROSS} PRIVACY LEAK: Unrelated User C read User A's dispute!`);
    return false;
  }

  // 5. User C attempts to MUTATE (resolve) User A's dispute
  console.log('  Testing User C (unrelated third party) mutation isolation...');
  const { data: cUpdateData, error: cUpdateError } = await clientC
    .from('disputes')
    .update({ status: 'resolved' })
    .eq('id', dispute.id)
    .select();

  const isUpdateBlocked =
    cUpdateError !== null || !cUpdateData || cUpdateData.length === 0;

  // Verify dispute remains 'open'
  const { data: verifyDispute } = await clientA
    .from('disputes')
    .select('status')
    .eq('id', dispute.id)
    .single();

  if (isUpdateBlocked && verifyDispute?.status === 'open') {
    console.log(`  ${CHECK} Unauthorized dispute mutation blocked by RLS (status remains "open").`);
    return true;
  } else {
    console.error(`  ${CROSS} SECURITY BREACH: User C tampered with dispute status!`);
    return false;
  }
}

// ==============================================================================
// MAIN RUNNER
// ==============================================================================
async function runSuite() {
  console.log(`\n${CYAN}==================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   SkillSwap Automated Security & Concurrency Verification Suite   ${RESET}`);
  console.log(`${CYAN}==================================================================${RESET}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Target:    ${SUPABASE_URL}`);

  try {
    console.log(`\n${BOLD}[SETUP] Provisioning isolated test fixtures...${RESET}`);
    userA = await provisionAndLogin(clientA, userConfigA);
    console.log(`  ${CHECK} User A: @${userA.username} (${userA.id.slice(0, 8)}...)`);

    userB = await provisionAndLogin(clientB, userConfigB);
    console.log(`  ${CHECK} User B: @${userB.username} (${userB.id.slice(0, 8)}...)`);

    userC = await provisionAndLogin(clientC, userConfigC);
    console.log(`  ${CHECK} User C: @${userC.username} (${userC.id.slice(0, 8)}...)`);

    const results = [];

    results.push({ name: 'SEC-01: Multi-Tenancy Isolation', pass: await testSEC01() });
    results.push({ name: 'SEC-02: Storage Authorization', pass: await testSEC02() });
    results.push({ name: 'SEC-03: Unauthenticated Block', pass: await testSEC03() });
    results.push({ name: 'SEC-04: Frontend Credential Audit', pass: await testSEC04() });
    results.push({ name: 'SEC-05: RPC Concurrency & Double-Spend Defense', pass: await testSEC05() });
    results.push({ name: 'SEC-06: Dispute Insertion & Multi-Party RLS Isolation', pass: await testSEC06() });

    console.log(`\n${CYAN}==================================================================${RESET}`);
    console.log(`${BOLD}                    FINAL TEST SUMMARY                           ${RESET}`);
    console.log(`${CYAN}==================================================================${RESET}`);

    let allPassed = true;
    for (const r of results) {
      const statusIcon = r.pass ? `${GREEN}[PASS]${RESET}` : `${RED}[FAIL]${RESET}`;
      console.log(`  ${statusIcon} ${r.name}`);
      if (!r.pass) allPassed = false;
    }

    console.log(`${CYAN}==================================================================${RESET}`);
    if (allPassed) {
      console.log(`\n${GREEN}${BOLD}🎉 ALL 6 SECURITY AND CONCURRENCY VERIFICATIONS PASSED!${RESET}\n`);
      process.exit(0);
    } else {
      console.error(`\n${RED}${BOLD}❌ ONE OR MORE SECURITY VERIFICATIONS FAILED.${RESET}\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n${RED}[SUITE EXECUTION ERROR]${RESET} ${err.message}`);
    console.error(err.stack);
    console.log(`\n${YELLOW}NOTE: If tables or columns are reported missing, run the SQL script in`);
    console.log(`'supabase/disputes_and_verification.sql' inside your Supabase SQL Editor.${RESET}\n`);
    process.exit(1);
  }
}

runSuite();
