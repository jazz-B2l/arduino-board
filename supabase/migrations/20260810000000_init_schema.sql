-- 1. EXTENSIONS & PROCEDURES
create extension if not exists "pgcrypto";

-- Function to check if the current requester is an administrator
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  return exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
end;
$$;

-- 2. PUBLIC TABLES

-- Public User Profiles
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Public User Roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  
  constraint user_roles_user_id_role_key unique (user_id, role),
  constraint user_roles_role_check check (role in ('user', 'admin'))
);

-- Public Devices (Arduino / USB Boards)
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  device_identifier text,
  board_type text,
  baud_rate integer not null default 9600,
  protocol text not null default 'json',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_connected_at timestamptz,
  
  constraint devices_baud_rate_check check (baud_rate > 0),
  constraint devices_protocol_check check (protocol in ('json', 'csv'))
);

-- Public Telemetry Acquisition Sessions (Metadata only, no raw frames)
create table public.telemetry_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  name text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'running',
  protocol text not null,
  sample_rate numeric,
  total_frames bigint not null default 0,
  invalid_frames bigint not null default 0,
  created_at timestamptz not null default now(),
  
  constraint telemetry_sessions_status_check check (status in ('running', 'completed', 'stopped', 'disconnected', 'emergency_stopped')),
  constraint telemetry_sessions_protocol_check check (protocol in ('json', 'csv'))
);

-- Public Alert Configurations (Threshold limits)
create table public.alert_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  session_id uuid references public.telemetry_sessions(id) on delete cascade,
  sensor text not null,
  warning_min numeric,
  warning_max numeric,
  danger_min numeric,
  danger_max numeric,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint alert_configs_sensor_check check (sensor in ('temp_carburant', 'temp_echap', 'temp_admission', 'rpm', 'vitesse', 'vibration'))
);

-- Public Alert Log Events (Edge-triggered anomalies)
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  session_id uuid not null references public.telemetry_sessions(id) on delete cascade,
  sensor text not null,
  level text not null,
  value numeric not null,
  threshold numeric,
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz,
  message text,
  created_at timestamptz not null default now(),
  
  constraint alerts_sensor_check check (sensor in ('temp_carburant', 'temp_echap', 'temp_admission', 'rpm', 'vitesse', 'vibration')),
  constraint alerts_level_check check (level in ('warning', 'danger'))
);

-- Public Exports Metadata (CSV Storage pointer)
create table public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.telemetry_sessions(id) on delete cascade,
  type text not null,
  file_name text not null,
  storage_path text,
  file_size_bytes bigint,
  created_at timestamptz not null default now(),
  
  constraint exports_type_check check (type in ('full_session', 'last_10_minutes', 'alerts'))
);

-- 3. TRIGGERS & IDEMPOTENT SIGNUP HANDLER

-- Reusable trigger function to update updated_at
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_devices_updated_at
  before update on public.devices
  for each row execute procedure public.update_updated_at_column();

create trigger update_alert_configs_updated_at
  before update on public.alert_configs
  for each row execute procedure public.update_updated_at_column();

-- Safe, idempotent signup handler to generate profile and role
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  -- Safely create profile
  insert into public.user_profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  -- Safely assign default role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- Trigger to execute when a new auth user signup occurs
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. DATABASE INDEXES FOR PERFORMANCE
create index if not exists devices_user_id_idx on public.devices(user_id);

create index if not exists telemetry_sessions_user_id_idx on public.telemetry_sessions(user_id);
create index if not exists telemetry_sessions_device_id_idx on public.telemetry_sessions(device_id);
create index if not exists telemetry_sessions_started_at_idx on public.telemetry_sessions(started_at);
create index if not exists telemetry_sessions_status_idx on public.telemetry_sessions(status);

create index if not exists alert_configs_user_id_idx on public.alert_configs(user_id);
create index if not exists alert_configs_device_id_idx on public.alert_configs(device_id);
create index if not exists alert_configs_session_id_idx on public.alert_configs(session_id);

create index if not exists alerts_user_id_idx on public.alerts(user_id);
create index if not exists alerts_device_id_idx on public.alerts(device_id);
create index if not exists alerts_session_id_idx on public.alerts(session_id);
create index if not exists alerts_triggered_at_idx on public.alerts(triggered_at);

create index if not exists exports_user_id_idx on public.exports(user_id);
create index if not exists exports_session_id_idx on public.exports(session_id);

-- 5. ROW LEVEL SECURITY (RLS) ACTIVATION
alter table public.user_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.devices enable row level security;
alter table public.telemetry_sessions enable row level security;
alter table public.alert_configs enable row level security;
alter table public.alerts enable row level security;
alter table public.exports enable row level security;

-- 6. SECURITY POLICIES

-- profiles
create policy "Users can view their own profile"
  on public.user_profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id or public.is_admin());

create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = id or public.is_admin());

-- roles (write actions restricted entirely to admins)
create policy "Users can view their own role"
  on public.user_roles for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Admins can manage user roles"
  on public.user_roles for all
  using (public.is_admin())
  with check (public.is_admin());

-- devices
create policy "Users can view their own devices"
  on public.devices for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert devices for themselves"
  on public.devices for insert
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can update their own devices"
  on public.devices for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can delete their own devices"
  on public.devices for delete
  using (auth.uid() = user_id or public.is_admin());

-- sessions
create policy "Users can view their own sessions"
  on public.telemetry_sessions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert sessions for themselves"
  on public.telemetry_sessions for insert
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can update their own sessions"
  on public.telemetry_sessions for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can delete their own sessions"
  on public.telemetry_sessions for delete
  using (auth.uid() = user_id or public.is_admin());

-- alert_configs
create policy "Users can view their own alert configs"
  on public.alert_configs for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert alert configs for themselves"
  on public.alert_configs for insert
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can update their own alert configs"
  on public.alert_configs for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can delete their own alert configs"
  on public.alert_configs for delete
  using (auth.uid() = user_id or public.is_admin());

-- alerts
create policy "Users can view their own alerts"
  on public.alerts for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert alerts for themselves"
  on public.alerts for insert
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can update their own alerts"
  on public.alerts for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can delete their own alerts"
  on public.alerts for delete
  using (auth.uid() = user_id or public.is_admin());

-- exports
create policy "Users can view their own exports"
  on public.exports for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert exports for themselves"
  on public.exports for insert
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can update their own exports"
  on public.exports for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can delete their own exports"
  on public.exports for delete
  using (auth.uid() = user_id or public.is_admin());

-- 7. SUPABASE STORAGE BUCKET REGISTRATION & POLICIES

-- Register the private session-exports bucket safely
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('session-exports', 'session-exports', false, null, null)
on conflict (id) do nothing;

-- storage policies
create policy "Users can view their own session files"
  on storage.objects for select
  using (bucket_id = 'session-exports' and (auth.uid()::text = split_part(name, '/', 1) or public.is_admin()));

create policy "Users can upload their own session files"
  on storage.objects for insert
  with check (bucket_id = 'session-exports' and (auth.uid()::text = split_part(name, '/', 1) or public.is_admin()));

create policy "Users can update their own session files"
  on storage.objects for update
  using (bucket_id = 'session-exports' and (auth.uid()::text = split_part(name, '/', 1) or public.is_admin()));

create policy "Users can delete their own session files"
  on storage.objects for delete
  using (bucket_id = 'session-exports' and (auth.uid()::text = split_part(name, '/', 1) or public.is_admin()));
