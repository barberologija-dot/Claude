-- Termini: multi-barbershop appointment booking.
-- Run once in the Supabase SQL editor (Stage 1).
--
-- Two rules live in the database itself, not only in the app:
--   1. No double booking: the "no_double_booking" constraint on appointments.
--   2. Shop separation: row level security on every table.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- ============================================================ tables

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  locale text not null default 'sl',
  notify_email boolean not null default false,       -- consent for reminders and change notices
  notify_consent_at timestamptz,
  is_platform_owner boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name text not null check (length(name) between 2 and 80),
  description text not null default '',
  logo_url text,
  phone text not null default '',
  email text not null default '',
  -- booking rules
  max_days_ahead int not null default 30 check (max_days_ahead between 1 and 365),
  min_notice_minutes int not null default 60 check (min_notice_minutes between 0 and 10080),
  cancel_deadline_hours int not null default 2 check (cancel_deadline_hours between 0 and 720),
  slot_minutes int not null default 15 check (slot_minutes in (5, 10, 15, 20, 30, 60)),
  max_active_per_customer int not null default 3 check (max_active_per_customer between 1 and 20),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.shop_members (
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  address text not null default '',
  city text not null default '',
  phone text not null default '',
  timezone text not null default 'Europe/Ljubljana',
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, shop_id)
);

-- weekday: 0 = Sunday ... 6 = Saturday. No row for a weekday means closed.
create table public.location_hours (
  location_id uuid not null,
  shop_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null,
  primary key (location_id, weekday),
  foreign key (location_id, shop_id) references public.locations(id, shop_id) on delete cascade,
  check (opens < closes)
);

create table public.location_breaks (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  shop_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts time not null,
  ends time not null,
  foreign key (location_id, shop_id) references public.locations(id, shop_id) on delete cascade,
  check (starts < ends)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  description text not null default '',
  image_url text,
  duration_min int not null check (duration_min between 5 and 480),
  price numeric(8, 2) not null default 0 check (price >= 0),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, shop_id)
);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null,
  location_id uuid not null,
  name text not null check (length(name) between 1 and 80),
  photo_url text,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, shop_id),
  foreign key (location_id, shop_id) references public.locations(id, shop_id) on delete restrict
);

-- A barber's own hours. No row for a weekday means "same as the location".
create table public.barber_hours (
  barber_id uuid not null,
  shop_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  works boolean not null default true,
  starts time,
  ends time,
  primary key (barber_id, weekday),
  foreign key (barber_id, shop_id) references public.barbers(id, shop_id) on delete cascade,
  check (not works or (starts is not null and ends is not null and starts < ends))
);

create table public.barber_services (
  barber_id uuid not null,
  service_id uuid not null,
  shop_id uuid not null,
  primary key (barber_id, service_id),
  foreign key (barber_id, shop_id) references public.barbers(id, shop_id) on delete cascade,
  foreign key (service_id, shop_id) references public.services(id, shop_id) on delete cascade
);

-- Days off. barber_id empty = the whole location is closed.
create table public.days_off (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null,
  location_id uuid not null,
  barber_id uuid,
  date_from date not null,
  date_to date not null,
  note text not null default '',
  foreign key (location_id, shop_id) references public.locations(id, shop_id) on delete cascade,
  foreign key (barber_id, shop_id) references public.barbers(id, shop_id) on delete cascade,
  check (date_from <= date_to)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  location_id uuid not null,
  barber_id uuid not null,
  service_id uuid not null,
  customer_id uuid references auth.users(id) on delete set null,  -- empty when the shop added it by hand
  customer_name text not null default '',
  customer_phone text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'completed', 'no_show', 'cancelled')),
  price numeric(8, 2) not null,   -- price at the time of booking (filled from the service when empty)
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by in ('customer', 'shop')),
  foreign key (location_id, shop_id) references public.locations(id, shop_id) on delete restrict,
  foreign key (barber_id, shop_id) references public.barbers(id, shop_id) on delete restrict,
  foreign key (service_id, shop_id) references public.services(id, shop_id) on delete restrict,
  check (starts_at < ends_at),
  -- The same barber can never have two overlapping appointments, even when
  -- two people press "confirm" at the same moment.
  constraint no_double_booking exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);
create index appointments_shop_time on public.appointments (shop_id, starts_at);
create index appointments_customer on public.appointments (customer_id, starts_at);

-- Emails waiting to be sent (processed by the /api/notify function).
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  shop_id uuid not null references public.shops(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text
);
create index email_outbox_pending on public.email_outbox (created_at) where sent_at is null;

-- ============================================================ helpers

create or replace function public.is_shop_member(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from shop_members where shop_id = p_shop and user_id = auth.uid());
$$;

create or replace function public.is_platform_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_platform_owner from profiles where id = auth.uid()), false);
$$;

-- Create a profile row for every new login.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare consent boolean := coalesce((new.raw_user_meta_data ->> 'notify_email')::boolean, false);
begin
  insert into profiles (id, full_name, phone, notify_email, notify_consent_at)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80),
    left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 30),
    consent,
    case when consent then now() end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Fill in end time and price when the shop adds an appointment by hand.
create or replace function public.appointments_defaults() returns trigger
language plpgsql set search_path = public as $$
declare sv services;
begin
  select * into sv from services where id = new.service_id;
  if new.ends_at is null then
    new.ends_at := new.starts_at + make_interval(mins => sv.duration_min);
  end if;
  if new.price is null then new.price := sv.price; end if;
  if new.status = 'cancelled' and new.cancelled_at is null then new.cancelled_at := now(); end if;
  return new;
end $$;

create trigger appointments_defaults before insert or update on public.appointments
  for each row execute function public.appointments_defaults();

-- ============================================================ free slots

-- Free start times for one day. Returns one row per (time, barber) so the
-- app can offer "any barber". Never returns customer data.
create or replace function public.get_slots(
  p_location uuid, p_service uuid, p_barber uuid, p_date date, p_ignore uuid default null
) returns table (slot timestamptz, barber uuid)
language plpgsql stable security definer set search_path = public as $$
declare
  l locations; s shops; sv services; lh location_hours;
  dow int; today date; dur interval;
begin
  select * into l from locations where id = p_location and active;
  if not found then return; end if;
  select * into s from shops where id = l.shop_id and active;
  if not found then return; end if;
  select * into sv from services where id = p_service and shop_id = s.id and active;
  if not found then return; end if;

  today := (now() at time zone l.timezone)::date;
  if p_date < today or p_date > today + s.max_days_ahead then return; end if;

  dow := extract(dow from p_date);
  select * into lh from location_hours where location_id = l.id and weekday = dow;
  if not found then return; end if;

  if exists (select 1 from days_off d where d.location_id = l.id and d.barber_id is null
             and p_date between d.date_from and d.date_to) then
    return;
  end if;

  -- When moving an appointment, its own time must not block the new one.
  if p_ignore is not null and not exists (
    select 1 from appointments a where a.id = p_ignore
      and (a.customer_id = auth.uid() or is_shop_member(a.shop_id))
  ) then
    p_ignore := null;
  end if;

  dur := make_interval(mins => sv.duration_min);

  return query
  select (g.ts at time zone l.timezone), b.id
  from barbers b
  join barber_services bs on bs.barber_id = b.id and bs.service_id = sv.id
  left join barber_hours bh on bh.barber_id = b.id and bh.weekday = dow
  cross join lateral (
    select greatest(lh.opens, coalesce(bh.starts, lh.opens)) as w_start,
           least(lh.closes, coalesce(bh.ends, lh.closes)) as w_end
  ) w
  cross join lateral generate_series(
    p_date + w.w_start, p_date + w.w_end - dur, make_interval(mins => s.slot_minutes)
  ) as g(ts)
  where b.location_id = l.id and b.active
    and (p_barber is null or b.id = p_barber)
    and coalesce(bh.works, true)
    and (g.ts at time zone l.timezone) >= now() + make_interval(mins => s.min_notice_minutes)
    and not exists (
      select 1 from days_off d where d.barber_id = b.id and p_date between d.date_from and d.date_to)
    and not exists (
      select 1 from location_breaks br where br.location_id = l.id and br.weekday = dow
        and g.ts::time < br.ends and (g.ts + dur)::time > br.starts)
    and not exists (
      select 1 from appointments a where a.barber_id = b.id and a.status <> 'cancelled'
        and a.id is distinct from p_ignore
        and a.starts_at < (g.ts at time zone l.timezone) + dur
        and a.ends_at > (g.ts at time zone l.timezone))
  order by 1, 2;
end $$;

-- Which of the next days have at least one free slot (to grey out full days).
create or replace function public.get_free_days(
  p_location uuid, p_service uuid, p_barber uuid, p_from date, p_days int default 30
) returns setof date
language plpgsql stable security definer set search_path = public as $$
declare i int;
begin
  for i in 0 .. least(greatest(p_days, 1), 62) - 1 loop
    if exists (select 1 from get_slots(p_location, p_service, p_barber, p_from + i)) then
      return next p_from + i;
    end if;
  end loop;
end $$;

-- ============================================================ customer actions

create or replace function public.book_appointment(
  p_location uuid, p_service uuid, p_barber uuid, p_start timestamptz
) returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  l locations; s shops; sv services; p profiles; a appointments;
  d date; cand uuid;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from auth.users where id = uid and email_confirmed_at is not null) then
    raise exception 'email_not_verified';
  end if;

  select * into l from locations where id = p_location and active;
  if not found then raise exception 'not_found'; end if;
  select * into s from shops where id = l.shop_id and active;
  if not found then raise exception 'not_found'; end if;
  select * into sv from services where id = p_service and shop_id = s.id and active;
  if not found then raise exception 'not_found'; end if;
  select * into p from profiles where id = uid;

  -- Rate limits: bookings per hour, and open appointments per shop.
  if (select count(*) from appointments
      where customer_id = uid and created_at > now() - interval '1 hour') >= 6 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from appointments
      where customer_id = uid and shop_id = s.id and status = 'booked' and starts_at > now())
     >= s.max_active_per_customer then
    raise exception 'too_many_active';
  end if;

  d := (p_start at time zone l.timezone)::date;

  -- Try each barber who is free at that time, least busy first.
  for cand in
    select gs.barber from get_slots(p_location, p_service, p_barber, d) gs
    where gs.slot = p_start
    order by (select count(*) from appointments x
              where x.barber_id = gs.barber and x.status <> 'cancelled'
                and (x.starts_at at time zone l.timezone)::date = d),
             random()
  loop
    begin
      insert into appointments (shop_id, location_id, barber_id, service_id, customer_id,
                                customer_name, customer_phone, starts_at, ends_at, price, created_by)
      values (s.id, l.id, cand, sv.id, uid, coalesce(p.full_name, ''), coalesce(p.phone, ''),
              p_start, p_start + make_interval(mins => sv.duration_min), sv.price, uid)
      returning * into a;
      insert into email_outbox (kind, shop_id, appointment_id, user_id)
      values ('booking_confirmed', s.id, a.id, uid);
      return a;
    exception when exclusion_violation then
      null;  -- someone else got this barber a moment earlier; try the next one
    end;
  end loop;

  raise exception 'slot_taken';
end $$;

create or replace function public.cancel_my_appointment(p_id uuid) returns public.appointments
language plpgsql security definer set search_path = public as $$
declare a appointments; s shops;
begin
  select * into a from appointments where id = p_id and customer_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if a.status <> 'booked' then raise exception 'not_bookable'; end if;
  select * into s from shops where id = a.shop_id;
  if a.starts_at - make_interval(hours => s.cancel_deadline_hours) < now() then
    raise exception 'too_late';
  end if;
  update appointments set status = 'cancelled', cancelled_at = now(), cancelled_by = 'customer'
  where id = a.id returning * into a;
  return a;
end $$;

create or replace function public.reschedule_my_appointment(p_id uuid, p_start timestamptz)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare a appointments; s shops; l locations; d date;
begin
  select * into a from appointments where id = p_id and customer_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if a.status <> 'booked' then raise exception 'not_bookable'; end if;
  select * into s from shops where id = a.shop_id;
  select * into l from locations where id = a.location_id;
  if a.starts_at - make_interval(hours => s.cancel_deadline_hours) < now() then
    raise exception 'too_late';
  end if;
  d := (p_start at time zone l.timezone)::date;
  if not exists (select 1 from get_slots(a.location_id, a.service_id, a.barber_id, d, a.id) gs
                 where gs.slot = p_start) then
    raise exception 'slot_taken';
  end if;
  begin
    update appointments
    set starts_at = p_start, ends_at = p_start + (a.ends_at - a.starts_at)
    where id = a.id returning * into a;
  exception when exclusion_violation then
    raise exception 'slot_taken';
  end;
  insert into email_outbox (kind, shop_id, appointment_id, user_id)
  values ('booking_confirmed', a.shop_id, a.id, a.customer_id);
  return a;
end $$;

-- GDPR: the customer removes their account and personal data.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from shop_members where user_id = uid) then
    raise exception 'owns_shop';
  end if;
  update appointments
  set status = 'cancelled', cancelled_at = now(), cancelled_by = 'customer'
  where customer_id = uid and status = 'booked' and starts_at > now();
  update appointments
  set customer_name = '', customer_phone = '', customer_id = null
  where customer_id = uid;
  delete from auth.users where id = uid;
end $$;

-- ============================================================ shop registration

create or replace function public.register_shop(
  p_name text, p_slug text, p_phone text default '', p_email text default ''
) returns public.shops
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s shops;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from auth.users where id = uid and email_confirmed_at is not null) then
    raise exception 'email_not_verified';
  end if;
  if (select count(*) from shops where created_by = uid) >= 3 then
    raise exception 'rate_limited';
  end if;
  p_slug := lower(trim(p_slug));
  if p_slug !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then raise exception 'bad_slug'; end if;
  if p_slug in ('admin', 'api', 'platform', 'prijava', 'registracija', 'moji-termini', 'racun',
                'zasebnost', 'pogoji', 'novo-geslo', 'assets', 'static', 'app', 'www',
                'login', 'signup', 'vrsta', 'shop', 'trgovina') then
    raise exception 'slug_taken';
  end if;
  begin
    insert into shops (slug, name, phone, email, created_by)
    values (p_slug, trim(p_name), coalesce(p_phone, ''), coalesce(p_email, ''), uid)
    returning * into s;
  exception when unique_violation then
    raise exception 'slug_taken';
  end;
  insert into shop_members (shop_id, user_id, role) values (s.id, uid, 'owner');
  return s;
end $$;

-- ============================================================ email outbox (server only)

create or replace function public.claim_outbox(p_limit int default 20) returns setof jsonb
language plpgsql security definer set search_path = public as $$
begin
  return query
  with picked as (
    select o.id from email_outbox o
    where o.sent_at is null and o.attempts < 5
      and (o.claimed_at is null or o.claimed_at < now() - interval '5 minutes')
    order by o.created_at
    limit least(greatest(p_limit, 1), 50)
    for update skip locked
  ), upd as (
    update email_outbox o set claimed_at = now(), attempts = o.attempts + 1
    from picked where o.id = picked.id
    returning o.*
  )
  select jsonb_build_object(
    'id', u.id, 'kind', u.kind, 'email', au.email, 'locale', coalesce(p.locale, 'sl'),
    'customer_name', a.customer_name, 'starts_at', a.starts_at, 'ends_at', a.ends_at,
    'timezone', l.timezone, 'status', a.status, 'price', a.price,
    'shop_name', s.name, 'shop_slug', s.slug, 'shop_phone', s.phone,
    'location_name', l.name, 'address', l.address, 'city', l.city,
    'service_name', sv.name, 'barber_name', b.name)
  from upd u
  join appointments a on a.id = u.appointment_id
  join shops s on s.id = a.shop_id
  join locations l on l.id = a.location_id
  join services sv on sv.id = a.service_id
  join barbers b on b.id = a.barber_id
  left join auth.users au on au.id = u.user_id
  left join profiles p on p.id = u.user_id;
end $$;

create or replace function public.finish_outbox(p_id uuid, p_ok boolean, p_error text default null)
returns void language sql security definer set search_path = public as $$
  update email_outbox
  set sent_at = case when p_ok then now() end, last_error = p_error, claimed_at = case when p_ok then claimed_at end
  where id = p_id;
$$;

-- ============================================================ row level security

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.locations enable row level security;
alter table public.location_hours enable row level security;
alter table public.location_breaks enable row level security;
alter table public.services enable row level security;
alter table public.barbers enable row level security;
alter table public.barber_hours enable row level security;
alter table public.barber_services enable row level security;
alter table public.days_off enable row level security;
alter table public.appointments enable row level security;
alter table public.email_outbox enable row level security;   -- no policies: server only

-- profiles: only your own
create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- shops: active shops are public; a deactivated shop is visible to its admins and the platform owner
create policy shops_select on public.shops for select
  using (active or public.is_shop_member(id) or public.is_platform_owner());
create policy shops_update on public.shops for update
  using (public.is_shop_member(id)) with check (public.is_shop_member(id));

create policy shop_members_select on public.shop_members for select using (user_id = auth.uid());

-- public catalogue of a visible shop; only its admins can change it
create policy locations_select on public.locations for select
  using (exists (select 1 from public.shops s where s.id = shop_id));
create policy locations_write on public.locations for all
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));

create policy location_hours_select on public.location_hours for select
  using (exists (select 1 from public.shops s where s.id = shop_id));
create policy location_hours_write on public.location_hours for all
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));

create policy services_select on public.services for select
  using (exists (select 1 from public.shops s where s.id = shop_id));
create policy services_write on public.services for all
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));

create policy barbers_select on public.barbers for select
  using (exists (select 1 from public.shops s where s.id = shop_id));
create policy barbers_write on public.barbers for all
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));

create policy barber_services_select on public.barber_services for select
  using (exists (select 1 from public.shops s where s.id = shop_id));
create policy barber_services_write on public.barber_services for all
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));

-- internal schedule details: shop admins only
create policy location_breaks_all on public.location_breaks for all
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));
create policy barber_hours_all on public.barber_hours for all
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));
create policy days_off_all on public.days_off for all
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));

-- appointments: a customer sees only their own; a shop admin sees only their shop's.
-- Customers can only book, cancel and move through the functions above.
create policy appointments_select on public.appointments for select
  using (customer_id = auth.uid() or public.is_shop_member(shop_id));
create policy appointments_insert on public.appointments for insert
  with check (public.is_shop_member(shop_id));
create policy appointments_update on public.appointments for update
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));

-- ============================================================ permissions

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;

grant select on public.shops, public.locations, public.location_hours, public.services,
  public.barbers, public.barber_services to anon, authenticated;

grant select on public.profiles, public.shop_members, public.location_breaks,
  public.barber_hours, public.days_off, public.appointments to authenticated;

grant update (full_name, phone, locale, notify_email, notify_consent_at) on public.profiles to authenticated;
grant update (name, description, logo_url, phone, email, max_days_ahead, min_notice_minutes,
  cancel_deadline_hours, slot_minutes, max_active_per_customer) on public.shops to authenticated;

grant insert, update, delete on public.locations, public.location_hours, public.location_breaks,
  public.services, public.barbers, public.barber_hours, public.barber_services, public.days_off
  to authenticated;

grant insert on public.appointments to authenticated;
grant update (location_id, barber_id, service_id, customer_name, customer_phone, starts_at, ends_at,
  status, price, note, cancelled_at, cancelled_by) on public.appointments to authenticated;

grant all on all tables in schema public to service_role;

grant execute on function public.is_shop_member(uuid), public.is_platform_owner() to anon, authenticated, service_role;
grant execute on function public.get_slots(uuid, uuid, uuid, date, uuid),
  public.get_free_days(uuid, uuid, uuid, date, int) to anon, authenticated, service_role;
grant execute on function public.book_appointment(uuid, uuid, uuid, timestamptz),
  public.cancel_my_appointment(uuid), public.reschedule_my_appointment(uuid, timestamptz),
  public.delete_my_account(), public.register_shop(text, text, text, text) to authenticated;
grant execute on function public.claim_outbox(int), public.finish_outbox(uuid, boolean, text) to service_role;
