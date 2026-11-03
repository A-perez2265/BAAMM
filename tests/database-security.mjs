import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import process from 'node:process'
import { PGlite } from '@electric-sql/pglite'

// Executes repository SQL in disposable PostgreSQL. Auth claims/storage schemas
// are local fixtures; this does not exercise hosted Auth, Storage HTTP or races.
const db = new PGlite()
const startedAt = new Date().toISOString()
const cases = []
const migrations = ['base_schema.sql', 'exchanges.sql', 'profile_avatars.sql',
  'disputes_and_verification.sql', 'dispute_actions.sql', 'confirm_skill_exchange.sql',
  'profile_credit_transfers.sql', 'public_text_privacy.sql', 'admin_grant_credits.sql', 'mvp_security_hardening.sql']
const hashes = {}
const learner = '10000000-0000-4000-8000-000000000001'
const teacher = '10000000-0000-4000-8000-000000000002'
const outsider = '10000000-0000-4000-8000-000000000003'
const skill = '20000000-0000-4000-8000-000000000001'
let paid, disputed, rollbackExchange, disputeId

async function asUser(id, sql, args = [], admin = false, userMetadata = {}) {
  await db.exec('begin; set local role authenticated;')
  try {
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: id, app_metadata: admin ? { is_admin: true } : {}, user_metadata: userMetadata })])
    const result = await db.query(sql, args)
    await db.exec('commit;')
    return result.rows
  } catch (error) {
    await db.exec('rollback;')
    throw error
  }
}
async function check(id, expected, test) {
  try {
    const actual = await test()
    cases.push({ id, expected, actual: actual || 'All assertions passed', status: 'PASS' })
    console.log(`PASS ${id}: ${actual || expected}`)
  } catch (error) {
    cases.push({ id, expected, actual: error.message, status: 'FAIL' })
    console.error(`FAIL ${id}: ${error.message}`)
    throw error
  }
}
async function balances() {
  return (await db.query('select id, credits_balance from public.profiles order by id')).rows
}
async function makeExchange() {
  return (await asUser(learner, "insert into public.exchanges(learner_id,teacher_id,skill_id,message,status) values($1,$2,$3,'Please teach beginner chords.','pending') returning id", [learner, teacher, skill]))[0].id
}
async function rejectUser(id, sql, args = [], pattern = /permission|Unauthorized|Only|Insufficient|Teacher|dispute|transition|credit|Invalid|unavailable/i, admin = false) {
  await assert.rejects(asUser(id, sql, args, admin), pattern)
}

try {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema storage;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    grant usage on schema public, auth, storage to anon, authenticated;
    grant execute on all functions in schema auth, storage to anon, authenticated;
    grant select on storage.objects to anon, authenticated;
  `)
  await check('DB-SETUP', 'Fresh-project SQL applies in the documented order', async () => {
    for (const file of migrations) {
      const sql = await fs.readFile(new URL(`../supabase/${file}`, import.meta.url), 'utf8')
      hashes[file] = createHash('sha256').update(sql).digest('hex')
      try { await db.exec(sql) } catch (error) { throw new Error(`${file}: ${error.message}`, { cause: error }) }
    }
    return 'All 10 SQL files executed successfully'
  })
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'learner@example.test','{\"username\":\"learner\",\"is_admin\":true}'),($2,'teacher@example.test','{\"username\":\"teacher\"}'),($3,'other@example.test','{\"username\":\"other\"}')", [learner, teacher, outsider])
  await db.query("insert into public.skills(id,user_id,listing_type,title,description,category,experience_level,format,language) values($1,$2,'Teacher','Guitar Basics','Learn beginner chords.','Music','Beginner','Online','English')", [skill, teacher])
  await check('DB-SIGNUP', 'Signup grants three credits and ignores editable administrator metadata', async () => {
    const rows = (await db.query('select credits_balance,is_admin from public.profiles')).rows
    assert.equal(rows.length, 3); assert(rows.every(row => row.credits_balance === 3 && row.is_admin === false))
  })
  await check('DB-ADMIN', 'User metadata cannot make is_admin() true', async () => {
    assert.equal((await asUser(learner, 'select public.is_admin() as admin', [], false, { is_admin: true }))[0].admin, false)
    assert.equal((await asUser(outsider, 'select public.is_admin() as admin', [], true))[0].admin, true)
  })
  await check('DB-PRIVATE', 'Own private profile readable; another user’s balance hidden; safe portfolio visible', async () => {
    assert.equal((await asUser(learner, 'select * from public.profiles')).length, 1)
    assert.equal((await asUser(learner, 'select credits_balance from public.profiles where id=$1', [teacher])).length, 0)
    const rows = await asUser(learner, 'select * from public.public_profiles')
    assert.equal(rows.length, 3); assert.equal(Object.hasOwn(rows[0], 'credits_balance'), false); assert.equal(Object.hasOwn(rows[0], 'is_admin'), false)
  })
  await check('DB-PROFILE-WRITES', 'Own safe edit succeeds; direct credit/admin changes and cross-user edits fail', async () => {
    assert.equal((await asUser(learner, "update public.profiles set bio='Learning guitar.' where id=$1 returning id", [learner])).length, 1)
    assert.equal((await asUser(learner, "update public.profiles set bio='Unauthorized edit.' where id=$1 returning id", [teacher])).length, 0)
    await rejectUser(learner, 'update public.profiles set credits_balance=999 where id=$1', [learner])
    await rejectUser(learner, 'update public.profiles set is_admin=true where id=$1', [learner])
    await rejectUser(learner, "update public.profiles set bio='Email me at test@example.test' where id=$1", [learner], /PUBLIC_CONTACT_DETAILS/)
  })
  await check('DB-OWNERSHIP', 'Cross-user skill mutation and ownership reassignment are blocked', async () => {
    assert.equal((await asUser(learner, "update public.skills set title='Forged' where id=$1 returning id", [skill])).length, 0)
    await rejectUser(teacher, 'update public.skills set user_id=$1 where id=$2', [learner, skill])
  })
  await check('DB-REQUEST', 'Request requires funds and a real teacher listing owned by the named teacher', async () => {
    await rejectUser(learner, "insert into public.exchanges(learner_id,teacher_id,skill_id,message,status) values($1,$2,$3,'Please teach.','pending')", [learner, outsider, skill])
    await db.query('update public.profiles set credits_balance=0 where id=$1', [learner])
    await assert.rejects(makeExchange(), /credit/i)
    await db.query('update public.profiles set credits_balance=3 where id=$1', [learner])
    paid = await makeExchange()
  })
  await check('DB-STATES', 'Only teacher accepts/completes; direct settlement and participant changes fail', async () => {
    await rejectUser(learner, "update public.exchanges set status='accepted' where id=$1", [paid])
    assert.equal((await asUser(outsider, 'select * from public.exchanges where id=$1', [paid])).length, 0)
    await asUser(teacher, "update public.exchanges set status='accepted' where id=$1", [paid])
    await rejectUser(learner, 'select public.confirm_skill_exchange($1)', [paid])
    await rejectUser(teacher, "update public.exchanges set status='completed' where id=$1", [paid])
    await rejectUser(teacher, 'update public.exchanges set learner_id=$1 where id=$2', [outsider, paid])
    await asUser(teacher, "update public.exchanges set status='session_completed' where id=$1", [paid])
  })
  await check('DB-SETTLEMENT', 'Only learner settles; one credit moves; replay fails without balance changes', async () => {
    await rejectUser(teacher, 'select public.confirm_skill_exchange($1)', [paid])
    const before = await balances()
    const result = (await asUser(learner, 'select public.confirm_skill_exchange($1) as result', [paid]))[0].result
    assert.equal(result.transferred_credits, 1)
    const after = await balances()
    assert.equal(after[0].credits_balance, before[0].credits_balance - 1)
    assert.equal(after[1].credits_balance, before[1].credits_balance + 1)
    await rejectUser(learner, 'select public.confirm_skill_exchange($1)', [paid])
    assert.deepEqual(await balances(), after)
  })
  await check('DB-HISTORY', 'A skill with retained exchange history cannot be removed', async () => {
    await rejectUser(teacher, 'delete from public.skills where id=$1', [skill], /history|foreign key/i)
  })
  await check('DB-DISPUTE-ROLLBACK', 'Failure to block exchange rolls back dispute insertion', async () => {
    rollbackExchange = await makeExchange()
    await asUser(teacher, "update public.exchanges set status='accepted' where id=$1", [rollbackExchange])
    await db.exec("create function public.fail_issue_update() returns trigger language plpgsql as $$ begin if new.status='issue_reported' then raise exception 'Injected update failure'; end if; return new; end $$; create trigger test_issue_failure before update on public.exchanges for each row execute function public.fail_issue_update();")
    await rejectUser(learner, "select public.submit_skill_dispute($1,'Missed session','The scheduled lesson did not take place.')", [rollbackExchange], /Injected update failure/)
    assert.equal((await db.query('select id from public.disputes where exchange_id=$1', [rollbackExchange])).rows.length, 0)
    assert.equal((await db.query('select status from public.exchanges where id=$1', [rollbackExchange])).rows[0].status, 'accepted')
    await db.exec('drop trigger test_issue_failure on public.exchanges; drop function public.fail_issue_update();')
  })
  await check('DB-DISPUTE', 'Either participant reports once; confirmation is blocked without changing balances', async () => {
    disputed = rollbackExchange
    const before = await balances()
    await rejectUser(outsider, "select public.submit_skill_dispute($1,'Missed session','The scheduled lesson did not take place.')", [disputed], /not available/)
    disputeId = (await asUser(teacher, "select public.submit_skill_dispute($1,'Missed session','The scheduled lesson did not take place.') as result", [disputed]))[0].result.id
    await rejectUser(learner, "select public.submit_skill_dispute($1,'Missed session','The scheduled lesson did not take place.')", [disputed], /unsettled/)
    await rejectUser(learner, 'select public.confirm_skill_exchange($1)', [disputed])
    assert.deepEqual(await balances(), before)
    assert.equal((await asUser(learner, 'select id from public.disputes where id=$1', [disputeId])).length, 1)
    assert.equal((await asUser(outsider, 'select id from public.disputes where id=$1', [disputeId])).length, 0)
  })
  await check('DB-AUDIT-ROLLBACK', 'Audit insertion failure rolls back administrator resolution', async () => {
    await db.exec("create function public.fail_audit() returns trigger language plpgsql as $$ begin raise exception 'Injected audit failure'; end $$; create trigger test_audit_failure before insert on public.dispute_actions for each row execute function public.fail_audit();")
    await rejectUser(outsider, "select public.review_skill_dispute($1,'resolved','The session is closed without payment.')", [disputeId], /Injected audit failure/, true)
    assert.equal((await db.query('select status from public.disputes where id=$1', [disputeId])).rows[0].status, 'open')
    await db.exec('drop trigger test_audit_failure on public.dispute_actions; drop function public.fail_audit();')
  })
  await check('DB-RESOLUTION', 'Admin explanation required; closure audited once with no credit transfer or reopening', async () => {
    const before = await balances()
    await rejectUser(learner, "select public.review_skill_dispute($1,'resolved','The session is closed without payment.')", [disputeId], /Administrator/)
    await rejectUser(outsider, "select public.review_skill_dispute($1,'resolved','short')", [disputeId], /explanation/, true)
    await asUser(outsider, "select public.review_skill_dispute($1,'under_review','Reviewing the missed lesson report.')", [disputeId], true)
    await asUser(outsider, "select public.review_skill_dispute($1,'resolved','The session is closed without payment.')", [disputeId], true)
    await rejectUser(outsider, "select public.review_skill_dispute($1,'under_review','Trying to reopen the closed report.')", [disputeId], /transition/, true)
    assert.deepEqual(await balances(), before)
    assert.equal((await db.query('select count(*)::int as count from public.dispute_actions where dispute_id=$1', [disputeId])).rows[0].count, 2)
    await rejectUser(outsider, "update public.disputes set status='open' where id=$1", [disputeId], /permission/, true)
  })
  await check('DB-VIDEO', 'Bucket private; uploader/admin reads allowed; other users and anonymous RPC denied', async () => {
    assert.equal((await db.query("select public from storage.buckets where id='verification-videos'")).rows[0].public, false)
    await db.query("insert into storage.objects(bucket_id,name) values('verification-videos',$1)", [`${teacher}/existing.mp4`])
    assert.equal((await asUser(teacher, 'select * from storage.objects')).length, 1)
    assert.equal((await asUser(learner, 'select * from storage.objects')).length, 0)
    assert.equal((await asUser(outsider, 'select * from storage.objects', [], true)).length, 1)
    await db.exec('begin; set local role anon;')
    await assert.rejects(db.query('select public.confirm_skill_exchange($1)', [paid]), /permission/)
    await db.exec('rollback;')
  })
} catch (error) {
  if (!cases.some(row => row.status === 'FAIL')) cases.push({ id: 'SETUP', expected: 'Fixture setup succeeds', actual: error.message, status: 'FAIL' })
  process.exitCode = 1
} finally {
  await db.close()
  await fs.mkdir('test-results', { recursive: true })
  const report = { startedAt, finishedAt: new Date().toISOString(), scope: 'Disposable PostgreSQL with fixture Auth/Storage schemas. No hosted configuration, real authentication, HTTP storage access, or concurrent-session verification.', migrations: hashes, cases }
  await fs.writeFile('test-results/database-matrix.json', JSON.stringify(report, null, 2) + '\n')
  const escape = text => text.replaceAll('|', '\\|').replaceAll('\n', ' ')
  await fs.writeFile('test-results/database-matrix.md', ['# Local database execution evidence', '', report.scope, '', `Started: ${startedAt}`, '', '| Scenario | Expected | Actual | Status |', '| --- | --- | --- | --- |', ...cases.map(row => `| ${row.id} | ${escape(row.expected)} | ${escape(row.actual)} | ${row.status} |`), ''].join('\n'))
  console.log(`${cases.filter(row => row.status === 'PASS').length}/${cases.length} local database cases passed`)
}
