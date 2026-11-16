-- Supabase exposes the `public` schema through its Data API (PostgREST) to the `anon` and
-- `authenticated` roles, and by default grants them access to new tables. KlusMatch never uses
-- that API (all access goes through the server), so revoke it completely; otherwise anyone with
-- the public anon key could read tables such as `users`. Functions expose no data and are left as is.
-- No-op on plain PostgreSQL.
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all sequences in schema public from %I', r);
      execute format('revoke usage on schema public from %I', r);
      execute format('alter default privileges in schema public revoke all on tables from %I', r);
      execute format('alter default privileges in schema public revoke all on sequences from %I', r);
    end if;
  end loop;
end $$;
