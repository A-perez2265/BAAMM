-- Read-only post-deployment checks for the hardened existing-project schema.
-- Run in the Supabase SQL Editor as the project database owner.
-- These catalog checks do not establish authenticated browser or HTTP behavior.
select jsonb_build_object(
'data_integrity',(jsonb_build_object('profiles',(select count(*) from public.profiles),'skills',(select count(*) from public.skills),'exchanges',(select count(*) from public.exchanges),'disputes',(select count(*) from public.disputes),'dispute_actions',(select count(*) from public.dispute_actions),'credit_total',(select sum(credits_balance) from public.profiles),'balance_digest',(select md5(string_agg(id::text || ':' || coalesce(credits_balance::text,'NULL'), ',' order by id)) from public.profiles))),
'checks',jsonb_build_object(
'video_bucket_private',(select not public from storage.buckets where id='verification-videos'),
'storage_rls',(select relrowsecurity from pg_class where oid='storage.objects'::regclass),
'feature_rls',(select bool_and(relrowsecurity) from pg_class where oid in ('public.profiles'::regclass,'public.skills'::regclass,'public.exchanges'::regclass,'public.disputes'::regclass,'public.dispute_actions'::regclass)),
'safe_profile_projection',(select array_agg(column_name::text order by ordinal_position)=array['id','display_name','username','bio','location','avatar_id'] from information_schema.columns where table_schema='public' and table_name='public_profiles'),
'no_anon_profiles',not has_table_privilege('anon','public.profiles','select'),
'no_anon_public_profiles',not has_table_privilege('anon','public.public_profiles','select'),
'authenticated_public_profiles',has_table_privilege('authenticated','public.public_profiles','select'),
'no_direct_credit_update',not has_column_privilege('authenticated','public.profiles','credits_balance','update'),
'no_direct_admin_update',not has_column_privilege('authenticated','public.profiles','is_admin','update'),
'profile_display_update',has_column_privilege('authenticated','public.profiles','display_name','update'),
'no_direct_dispute_insert',not has_any_column_privilege('authenticated','public.disputes','insert'),
'no_direct_dispute_update',not has_any_column_privilege('authenticated','public.disputes','update'),
'no_direct_audit_write',not has_any_column_privilege('authenticated','public.dispute_actions','insert'),
'no_exchange_identity_update',not has_column_privilege('authenticated','public.exchanges','teacher_id','update'),
'exchange_status_update',has_column_privilege('authenticated','public.exchanges','status','update'),
'skill_history_fk',exists(select 1 from pg_constraint where conrelid='public.exchanges'::regclass and conname='exchanges_skill_history_fk' and convalidated),
'active_dispute_unique_index',exists(select 1 from pg_index where indexrelid=to_regclass('public.disputes_one_active_per_exchange') and indisunique and indisvalid),
'guard_triggers',(select count(*)=3 from pg_trigger where not tgisinternal and tgenabled='O' and tgname in ('guard_exchange_write','protect_exchange_skill_history','protect_profile_sensitive_columns')),
'rpc_owners_definer',(select count(*)=3 and bool_and(prosecdef and pg_get_userbyid(proowner)='postgres') from pg_proc where oid in ('public.confirm_skill_exchange(uuid)'::regprocedure,'public.submit_skill_dispute(uuid,text,text)'::regprocedure,'public.review_skill_dispute(uuid,text,text)'::regprocedure)),
'rpc_permissions',(select bool_and(has_function_privilege('authenticated',oid,'execute') and not has_function_privilege('anon',oid,'execute')) from pg_proc where oid in ('public.confirm_skill_exchange(uuid)'::regprocedure,'public.submit_skill_dispute(uuid,text,text)'::regprocedure,'public.review_skill_dispute(uuid,text,text)'::regprocedure)),
'legacy_storage_writes_removed',not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname in ('verification_videos_auth_insert','verification_videos_auth_update','verification_videos_auth_delete')),
'private_storage_policy',exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='verification_videos_private_select'),
'admin_trusted_metadata',position('app_metadata' in pg_get_functiondef('public.is_admin()'::regprocedure))>0 and position('user_metadata' in pg_get_functiondef('public.is_admin()'::regprocedure))=0
),
'profile_policies',(select jsonb_agg(jsonb_build_object('name',policyname,'command',cmd,'using',qual,'check',with_check)) from pg_policies where schemaname='public' and tablename='profiles'),
'storage_policies',(select jsonb_agg(jsonb_build_object('name',policyname,'command',cmd,'using',qual,'check',with_check)) from pg_policies where schemaname='storage' and tablename='objects')
) as deployment_verification;
