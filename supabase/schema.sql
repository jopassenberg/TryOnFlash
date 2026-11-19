-- Stencit: Konten, gesicherte Stencils und Motiv-Kontingent.
-- Einmal im Supabase-Dashboard unter „SQL Editor → New query“ einfügen und ausführen.
-- Grundsatz: jede Zeile gehört genau einem Nutzer; Zugriffsregeln (Row Level Security) erlauben nur eigene Daten.

-- ---------- Profil: Name, Profilbild, Tarif, Tokens ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text,
  avatar_path text,                                   -- Pfad im Speicher-Bucket „avatars“
  plan        text not null default 'free' check (plan in ('free', 'unlimited')),
  plan_until  timestamptz,                            -- Ende des bezahlten Zeitraums (Abo)
  tokens      integer not null default 0 check (tokens >= 0),
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "eigenes Profil lesen" on public.profiles;
create policy "eigenes Profil lesen" on public.profiles for select using (auth.uid() = id);
drop policy if exists "eigenes Profil aendern" on public.profiles;
create policy "eigenes Profil aendern" on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id);
-- Tarif und Tokens darf der Nutzer nicht selbst ändern (nur Server/Bezahl-Webhook):
revoke update on public.profiles from authenticated, anon;
grant update (name, avatar_path) on public.profiles to authenticated;

-- neues Konto → Profil automatisch anlegen
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Gesicherte Stencils ----------
create table if not exists public.stencils (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name         text not null default 'Flash',
  w            integer, h integer,
  image_path   text not null,                         -- Ergebnis (PNG) im Bucket „stencils“
  sticker_path text,                                  -- Sticker für die Galerie
  src_path     text, mask_path text,                  -- Original + Auswahl zum späteren Bearbeiten
  style        text, bg boolean,
  pos          jsonb,                                 -- Platz in der Collage
  motif_hash   text,                                  -- Fingerabdruck des Motivs
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists stencils_user on public.stencils (user_id);
alter table public.stencils enable row level security;
drop policy if exists "eigene Stencils lesen" on public.stencils;
create policy "eigene Stencils lesen" on public.stencils for select using (auth.uid() = user_id);
drop policy if exists "eigene Stencils anlegen" on public.stencils;
create policy "eigene Stencils anlegen" on public.stencils for insert with check (auth.uid() = user_id);
drop policy if exists "eigene Stencils aendern" on public.stencils;
create policy "eigene Stencils aendern" on public.stencils for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "eigene Stencils loeschen" on public.stencils;
create policy "eigene Stencils loeschen" on public.stencils for delete using (auth.uid() = user_id);

-- Free-Konto: höchstens 3 gesicherte Stencils (die Datenbank setzt das durch, nicht nur die App)
create or replace function public.is_paid(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select plan = 'unlimited' and (plan_until is null or plan_until > now()) from profiles where id = uid), false)
      or coalesce((select tokens > 0 from profiles where id = uid), false)
$$;
create or replace function public.limit_free_stencils() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_paid(new.user_id) and (select count(*) from stencils where user_id = new.user_id) >= 3 then
    raise exception 'free_limit' using hint = 'Im Free-Konto sind 3 Stencils gesichert.';
  end if;
  return new;
end $$;
drop trigger if exists stencils_free_limit on public.stencils;
create trigger stencils_free_limit before insert on public.stencils for each row execute function public.limit_free_stencils();

-- ---------- Motiv-Kontingent ----------
-- Ein Motiv zählt einmal pro Monat und Nutzer (gleicher Fingerabdruck = gleiches Motiv, beliebig oft anprobieren).
create table if not exists public.motif_uses (
  user_id    uuid not null references auth.users (id) on delete cascade,
  motif_hash text not null,
  period     date not null,                          -- erster Tag des Monats
  source     text not null check (source in ('free', 'unlimited', 'token')),
  created_at timestamptz not null default now(),
  primary key (user_id, motif_hash, period)
);
alter table public.motif_uses enable row level security;
drop policy if exists "eigene Nutzung lesen" on public.motif_uses;
create policy "eigene Nutzung lesen" on public.motif_uses for select using (auth.uid() = user_id);
-- schreiben nur über use_motif()

-- Vor dem ersten Stechen eines Motivs: bucht es (Free → Unlimited → Token) oder lehnt ab.
-- Antwort: { ok, source, free_left, tokens }
create or replace function public.use_motif(hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  p   date := date_trunc('month', now())::date;
  prof profiles;
  used_free int; used_unl int;
  src text;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  select * into prof from profiles where id = uid for update;
  if exists (select 1 from motif_uses where user_id = uid and motif_hash = hash and period = p) then
    return jsonb_build_object('ok', true, 'source', 'known');            -- schon gezählt: frei anprobieren
  end if;
  select count(*) filter (where source = 'free'), count(*) filter (where source = 'unlimited')
    into used_free, used_unl from motif_uses where user_id = uid and period = p;
  if used_free < 3 then src := 'free';
  elsif prof.plan = 'unlimited' and (prof.plan_until is null or prof.plan_until > now()) and used_unl < 100 then src := 'unlimited';
  elsif prof.tokens > 0 then src := 'token'; update profiles set tokens = tokens - 1 where id = uid;
  else return jsonb_build_object('ok', false, 'reason', 'quota', 'free_left', 0, 'tokens', prof.tokens);
  end if;
  insert into motif_uses (user_id, motif_hash, period, source) values (uid, hash, p, src);
  return jsonb_build_object('ok', true, 'source', src,
    'free_left', greatest(0, 3 - used_free - (src = 'free')::int),
    'tokens', (select tokens from profiles where id = uid));
end $$;
revoke all on function public.use_motif(text) from public;
grant execute on function public.use_motif(text) to authenticated;

-- ---------- Konto löschen (Einstellungen → Konto löschen) ----------
-- Die App löscht zuerst die eigenen Dateien im Speicher (die darf nur die Speicher-Schnittstelle löschen),
-- dann ruft sie das hier auf. really = false prüft nur, ob die Funktion da ist.
-- Profil, Stencils und Motiv-Nutzung fallen per „on delete cascade“ mit weg.
create or replace function public.delete_account(really boolean default false) returns boolean
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'login'; end if;
  if really then delete from auth.users where id = auth.uid(); end if;
  return true;
end $$;
revoke all on function public.delete_account(boolean) from public, anon;
grant execute on function public.delete_account(boolean) to authenticated;

-- ---------- Zugriffsrechte für die App (angemeldete Nutzer); welche Zeilen, regeln die Policies oben ----------
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.stencils to authenticated;
grant select on public.motif_uses to authenticated;

-- ---------- Bildspeicher ----------
-- Private Buckets; jeder Nutzer schreibt/liest nur unter „<seine-id>/…“.
insert into storage.buckets (id, name, public) values ('stencils', 'stencils', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false) on conflict (id) do nothing;
drop policy if exists "eigene Dateien lesen" on storage.objects;
create policy "eigene Dateien lesen" on storage.objects for select using (bucket_id in ('stencils', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "eigene Dateien anlegen" on storage.objects;
create policy "eigene Dateien anlegen" on storage.objects for insert with check (bucket_id in ('stencils', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "eigene Dateien aendern" on storage.objects;
create policy "eigene Dateien aendern" on storage.objects for update using (bucket_id in ('stencils', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "eigene Dateien loeschen" on storage.objects;
create policy "eigene Dateien loeschen" on storage.objects for delete using (bucket_id in ('stencils', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
