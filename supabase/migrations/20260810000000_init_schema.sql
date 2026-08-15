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

CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'admin'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

CREATE TABLE public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  device_identifier text,
  board_type text,
  baud_rate integer NOT NULL DEFAULT 9600 CHECK (baud_rate > 0),
  protocol text NOT NULL DEFAULT 'json'::text CHECK (protocol = ANY (ARRAY['json'::text, 'csv'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_connected_at timestamp with time zone,
  CONSTRAINT devices_pkey PRIMARY KEY (id),
  CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.telemetry_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id uuid NOT NULL,
  name text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running'::text CHECK (status = ANY (ARRAY['running'::text, 'completed'::text, 'stopped'::text, 'disconnected'::text, 'emergency_stopped'::text])),
  protocol text NOT NULL CHECK (protocol = ANY (ARRAY['json'::text, 'csv'::text])),
  sample_rate numeric,
  total_frames bigint NOT NULL DEFAULT 0,
  invalid_frames bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT telemetry_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT telemetry_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT telemetry_sessions_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE
);

CREATE TABLE public.alert_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id uuid NOT NULL,
  session_id uuid,
  sensor text NOT NULL CHECK (sensor = ANY (ARRAY['temp_carburant'::text, 'temp_echap'::text, 'temp_admission'::text, 'rpm'::text, 'vitesse'::text, 'vibration'::text])),
  warning_min numeric,
  warning_max numeric,
  danger_min numeric,
  danger_max numeric,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT alert_configs_pkey PRIMARY KEY (id),
  CONSTRAINT alert_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT alert_configs_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE,
  CONSTRAINT alert_configs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE
);

CREATE TABLE public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id uuid NOT NULL,
  session_id uuid NOT NULL,
  sensor text NOT NULL CHECK (sensor = ANY (ARRAY['temp_carburant'::text, 'temp_echap'::text, 'temp_admission'::text, 'rpm'::text, 'vitesse'::text, 'vibration'::text])),
  level text NOT NULL CHECK (level = ANY (ARRAY['warning'::text, 'danger'::text])),
  value numeric NOT NULL,
  threshold numeric,
  triggered_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT alerts_pkey PRIMARY KEY (id),
  CONSTRAINT alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT alerts_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE,
  CONSTRAINT alerts_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE
);

CREATE TABLE public.exports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['full_session'::text, 'last_10_minutes'::text, 'alerts'::text])),
  file_name text NOT NULL,
  storage_path text,
  file_size_bytes bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT exports_pkey PRIMARY KEY (id),
  CONSTRAINT exports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT exports_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE
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
