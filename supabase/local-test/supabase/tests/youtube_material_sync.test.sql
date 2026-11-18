-- Disposable two-account fixtures only; changes roll back. No production execution.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-000000001811', 'youtube-sync-a@example.test'),
  ('00000000-0000-0000-0000-000000001812', 'youtube-sync-b@example.test');
insert into public.songs(id, user_id, name) values
  ('40000000-0000-0000-0000-000000001811', '00000000-0000-0000-0000-000000001811', 'Owned song'),
  ('40000000-0000-0000-0000-000000001812', '00000000-0000-0000-0000-000000001812', 'Other song');
create function pg_temp.yt_payload() returns jsonb language sql stable as $$
  select '{"block_key":"learning","video_id":"abcdefghijk","name":"  My video  ","created_at":"2026-01-02T12:00:00Z"}'::jsonb || jsonb_build_object('user_id',auth.uid());
$$;

select has_table('public', 'youtube_materials', 'YouTube metadata table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.youtube_materials'::regclass), 'RLS enabled');
select ok(has_table_privilege('authenticated', 'public.youtube_materials', 'SELECT'), 'signed-in clients can select owned records');
select ok(not has_table_privilege('anon', 'public.youtube_materials', 'SELECT'), 'anonymous reads denied');
select ok(not has_table_privilege('authenticated', 'public.youtube_materials', 'INSERT'), 'direct insert cannot bypass CAS');
select ok(not has_table_privilege('authenticated', 'public.youtube_materials', 'UPDATE'), 'direct update cannot bypass CAS');
select ok(not has_table_privilege('authenticated', 'public.youtube_materials', 'DELETE'), 'direct delete cannot bypass tombstones');
select ok(not has_function_privilege('anon', 'public.save_youtube_material(text,bigint,jsonb,boolean)', 'EXECUTE'), 'anonymous RPC execution denied');
select ok(has_function_privilege('authenticated', 'public.save_youtube_material(text,bigint,jsonb,boolean)', 'EXECUTE'), 'authenticated RPC execution granted');
select ok(not has_schema_privilege('authenticated', 'youtube_material_private', 'USAGE'), 'validation helper is not a browser API');
select ok((select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.save_youtube_material(text,bigint,jsonb,boolean)'::regprocedure), 'definer has empty search path');

set local role authenticated;
select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select public.save_youtube_material('no-auth',0,pg_temp.yt_payload())$$, '42501','Authentication required','missing identity denied');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000001811","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000001811',true);
select lives_ok($$select public.save_youtube_material('video-a',0,pg_temp.yt_payload())$$,'first device creates metadata');
select is((select count(*)::int from public.youtube_materials),1,'owner reads own metadata');
select is((select revision from public.youtube_materials where material_id='video-a'),1::bigint,'create revision is one');
select is((select name from public.youtube_materials where material_id='video-a'),'My video','name is trimmed');
select is((select looper_open from public.youtube_materials where material_id='video-a'),false,'legacy missing looper state defaults off');
select is((select bookmarks from public.youtube_materials where material_id='video-a'),'[]'::jsonb,'legacy missing bookmarks default empty');
select is((select loops from public.youtube_materials where material_id='video-a'),'[]'::jsonb,'legacy missing loops default empty');
select is((select created_at from public.youtube_materials where material_id='video-a'),'2026-01-02T12:00:00Z'::timestamptz,'original creation date imported');
select is((select start_seconds from public.youtube_materials where material_id='video-a'),0,'legacy URL start defaults to zero');
select lives_ok($$select public.save_youtube_material('timestamped',0,pg_temp.yt_payload() || '{"start_seconds":125}')$$,'timestamped YouTube URL can be imported');
select is((select start_seconds from public.youtube_materials where material_id='timestamped'),125,'timestamped start retained exactly');
select throws_ok($$select public.save_youtube_material('bad-start',0,pg_temp.yt_payload() || '{"start_seconds":-1}')$$,'22023','Invalid YouTube material start','negative start rejected');
select throws_ok($$select public.save_youtube_material('bad-start',0,pg_temp.yt_payload() || '{"start_seconds":1.5}')$$,'22023','Invalid YouTube material start','fractional start rejected');
select throws_ok($$select public.save_youtube_material('bad-start',0,pg_temp.yt_payload() || '{"start_seconds":86401}')$$,'22023','Invalid YouTube material start','start bound matches existing URL parser');
select throws_ok($$select public.save_youtube_material('video-a',0,pg_temp.yt_payload())$$,'P0001','YOUTUBE_MATERIAL_CONFLICT','duplicate initial import does not overwrite');
select lives_ok($$select public.save_youtube_material('video-a',1,pg_temp.yt_payload() || '{"looper_open":true,"bookmarks":[3,{"seconds":10.5,"name":"Chorus"}],"loops":[{"id":"loop-a","name":"Solo","start":10.25,"end":20.5,"color":2,"order":0,"repeats":3}]}')$$,'bookmark loops order repeats and enabled state save together');
select is((select revision from public.youtube_materials where material_id='video-a'),2::bigint,'successful edit increments revision');
select is((select looper_open from public.youtube_materials where material_id='video-a'),true,'looper state persisted');
select is((select loops->0->>'repeats' from public.youtube_materials where material_id='video-a'),'3','ALL count persisted');
select is((select jsonb_array_length(bookmarks) from public.youtube_materials where material_id='video-a'),2,'legacy numeric bookmarks preserved with named entries');
select throws_ok($$select public.save_youtube_material('video-a',1,pg_temp.yt_payload() || '{"name":"Stale overwrite"}')$$,'P0001','YOUTUBE_MATERIAL_CONFLICT','second stale device cannot lose newer edits');
select is((select revision from public.youtube_materials where material_id='video-a'),2::bigint,'failed stale write leaves revision unchanged');
select lives_ok($$select public.save_youtube_material('move-me',0,pg_temp.yt_payload())$$,'create block scoped link');
select lives_ok($$select public.save_youtube_material('move-me',1,pg_temp.yt_payload() || '{"block_key":"song","song_id":"40000000-0000-0000-0000-000000001811"}')$$,'owner can assign legacy attachment to own song');
select is((select song_id from public.youtube_materials where material_id='move-me'),'40000000-0000-0000-0000-000000001811'::uuid,'owned song scope saved');
select throws_ok($$select public.save_youtube_material('foreign-song',0,pg_temp.yt_payload() || '{"block_key":"song","song_id":"40000000-0000-0000-0000-000000001812"}')$$,'42501','Song not found or not owned by user','cannot attach metadata to another users song');
select throws_ok($$select public.save_youtube_material('bad-scope',0,pg_temp.yt_payload() || '{"block_key":"song"}')$$,'22023','Invalid YouTube material scope','song scope requires a song');
select throws_ok($$select public.save_youtube_material('bad-scope',0,pg_temp.yt_payload() || '{"song_id":"40000000-0000-0000-0000-000000001811"}')$$,'22023','Invalid YouTube material scope','non-song scope rejects song ID');
select lives_ok($$select public.save_youtube_material('custom-block',0,pg_temp.yt_payload() || '{"block_key":"custom:riff"}')$$,'custom exercise key accepted');
select throws_ok($$select public.save_youtube_material('spoof-owner',0,pg_temp.yt_payload() || '{"user_id":"00000000-0000-0000-0000-000000001812"}')$$,'42501','YouTube material owner mismatch','payload owner cannot differ from current JWT identity');
select is((select count(*)::int from public.youtube_materials where material_id='spoof-owner'),0,'mismatched owner leaves no row');

select throws_ok($$insert into public.youtube_materials(user_id,material_id,block_key,video_id,name) values(auth.uid(),'direct','learning','abcdefghijk','No')$$,'42501','permission denied for table youtube_materials','direct insert denied');
select throws_ok($$update public.youtube_materials set name='No' where material_id='video-a'$$,'42501','permission denied for table youtube_materials','direct update denied');
select throws_ok($$delete from public.youtube_materials where material_id='video-a'$$,'42501','permission denied for table youtube_materials','direct delete denied');

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000001812","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000001812',true);
select is((select count(*)::int from public.youtube_materials),0,'second account cannot read first account metadata');
select throws_ok($$select public.save_youtube_material('video-a',2,pg_temp.yt_payload())$$,'P0001','YOUTUBE_MATERIAL_CONFLICT','known material ID and revision do not let another account overwrite');
select throws_ok($$select public.save_youtube_material('queued-under-old-account',0,pg_temp.yt_payload() || '{"user_id":"00000000-0000-0000-0000-000000001811"}')$$,'42501','YouTube material owner mismatch','old-account queued payload cannot upload under new-account JWT');
select is((select count(*)::int from public.youtube_materials where material_id='queued-under-old-account'),0,'queued auth race leaves no cross-account row');
select lives_ok($$select public.save_youtube_material('video-a',0,pg_temp.yt_payload() || '{"name":"Account B"}')$$,'same client ID is independently scoped per user');
select is((select count(*)::int from public.youtube_materials),1,'second account sees only its row');
select is((select name from public.youtube_materials where material_id='video-a'),'Account B','second account has independent metadata');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000001811","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000001811',true);
select is((select name from public.youtube_materials where material_id='video-a'),'My video','first account remained unchanged');
select lives_ok($$select public.save_youtube_material('video-a',2,pg_temp.yt_payload(),true)$$,'delete creates owned tombstone');
select is((select revision from public.youtube_materials where material_id='video-a'),3::bigint,'delete increments revision');
select ok((select deleted_at is not null from public.youtube_materials where material_id='video-a'),'tombstone available to other devices of same account');
select throws_ok($$select public.save_youtube_material('video-a',3,pg_temp.yt_payload())$$,'P0001','YOUTUBE_MATERIAL_CONFLICT','even current revision cannot resurrect tombstone');
select throws_ok($$select public.save_youtube_material('video-a',0,pg_temp.yt_payload())$$,'P0001','YOUTUBE_MATERIAL_CONFLICT','stale first import cannot resurrect tombstone');
select lives_ok($$select public.save_youtube_material('offline-deleted',0,pg_temp.yt_payload(),true)$$,'create-then-delete offline can publish tombstone without visible link');
select ok((select deleted_at is not null from public.youtube_materials where material_id='offline-deleted'),'offline delete recorded');

select throws_ok($$select public.save_youtube_material('../escape',0,pg_temp.yt_payload())$$,'22023','Invalid YouTube material','invalid material ID rejected');
select throws_ok($$select public.save_youtube_material('bad',-1,pg_temp.yt_payload())$$,'22023','Invalid YouTube material','negative revision rejected');
select throws_ok($$select public.save_youtube_material('bad',0,'[]')$$,'22023','Invalid YouTube material','nonobject payload rejected');
select throws_ok($$select public.save_youtube_material('bad',0,pg_temp.yt_payload()-'user_id')$$,'22023','Invalid YouTube material owner','original account binding is required');
select throws_ok($$select public.save_youtube_material('bad',0,pg_temp.yt_payload() || '{"video_id":"https://youtube.com"}')$$,'22023','Invalid YouTube material','video identity must be normalized 11-character ID');
select throws_ok($$select public.save_youtube_material('bad',0,pg_temp.yt_payload() || '{"looper_open":"true"}')$$,'22023','Invalid YouTube material','state must be boolean');
select throws_ok($$select public.save_youtube_material('bad',0,pg_temp.yt_payload() || '{"bookmarks":[-1]}')$$,'22023','Invalid YouTube material','negative bookmark rejected');
select throws_ok($$select public.save_youtube_material('bad',0,pg_temp.yt_payload() || '{"bookmarks":{}}')$$,'22023','Invalid YouTube material','bookmark metadata must be an array');
select throws_ok($$select public.save_youtube_material('bad',0,pg_temp.yt_payload() || '{"loops":[{"id":"bad","name":"Bad","start":2,"end":1,"color":0,"order":0}]}')$$,'22023','Invalid YouTube material','crossed loop rejected');
select throws_ok($$select public.save_youtube_material('bad',0,pg_temp.yt_payload() || '{"loops":[{"id":"same","name":"A","start":1,"end":2,"color":0,"order":0},{"id":"same","name":"B","start":3,"end":4,"color":1,"order":1}]}')$$,'22023','Invalid YouTube material','duplicate loop IDs rejected');
select throws_ok($$select public.save_youtube_material('bad',0,pg_temp.yt_payload() || '{"loops":[{"id":"bad","name":"Bad","start":1,"end":2,"color":0,"order":0,"repeats":1000}]}')$$,'22023','Invalid YouTube material','repeat count bounded');
select throws_ok($$select public.save_youtube_material('bad',0,pg_temp.yt_payload() || '{"created_at":"infinity"}')$$,'22023','Invalid YouTube material','infinite creation date rejected');
select throws_ok($$select public.save_youtube_material('bad',0,pg_temp.yt_payload() || jsonb_build_object('name',repeat('x',501)))$$,'22023','Invalid YouTube material','overlong title rejected');
select throws_ok($$select public.save_youtube_material('bad',0,pg_temp.yt_payload() || jsonb_build_object('unused',repeat('x',1048576)))$$,'22023','Invalid YouTube material','payload byte size bounded');
select is((select count(*)::int from public.youtube_materials where material_id='bad'),0,'invalid requests leave no rows');

select * from finish();
rollback;
