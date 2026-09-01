-- Centro de Trabajo — esquema del organizador.
--
-- Copiado del proyecto "niddo", donde convivía con la aplicación de rentas en
-- producción. Aquí vive solo, sin compartir base ni usuarios con nada más.
--
-- La regla que sostiene todo: un espacio solo es visible para sus miembros.
-- No es que la pantalla lo oculte; la base no entrega la fila.

-- ---------- Catálogos ----------

do $$ begin
  create type space_role as enum ('owner', 'socio', 'invitado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('activo', 'pausado', 'completado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum
    ('inbox', 'pendiente', 'en_progreso', 'bloqueada', 'completada', 'descartada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('baja', 'media', 'alta', 'urgente');
exception when duplicate_object then null; end $$;

-- ---------- Tablas ----------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  kind        text not null default 'persona' check (kind in ('persona', 'agente')),
  created_at  timestamptz not null default now()
);

create table if not exists public.spaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  kind        text not null default 'empresa' check (kind in ('empresa', 'persona', 'personal')),
  color       text not null default 'slate',
  owner_id    uuid not null references public.profiles (id) on delete restrict,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.space_members (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       space_role not null default 'invitado',
  created_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create table if not exists public.projects (
  id                  uuid primary key default gen_random_uuid(),
  space_id            uuid not null references public.spaces (id) on delete cascade,
  name                text not null check (length(trim(name)) > 0),
  description         text,
  status              project_status not null default 'activo',
  due_date            date,
  position            integer not null default 0,
  created_by          uuid not null references public.profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  archived_at         timestamptz,
  -- Vínculo con GitHub y Vercel: el proyecto guarda el último estado conocido
  -- para no depender de la API en cada carga.
  repo_url            text,
  vercel_project_id   text,
  last_commit_at      timestamptz,
  last_commit_message text,
  last_commit_url     text,
  last_commit_author  text,
  last_deploy_at      timestamptz,
  last_deploy_state   text,
  last_deploy_target  text,
  last_deploy_url     text,
  watched_at          timestamptz
);

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  space_id     uuid not null references public.spaces (id) on delete cascade,
  project_id   uuid references public.projects (id) on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  description  text,
  status       task_status not null default 'inbox',
  priority     task_priority not null default 'media',
  due_date     date,
  position     integer not null default 0,
  created_by   uuid not null references public.profiles (id),
  approved_by  uuid references public.profiles (id),
  approved_at  timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  origin       text not null default 'persona'
                 check (origin in ('persona', 'vigilante', 'agente'))
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.activity (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  task_id    uuid references public.tasks (id) on delete cascade,
  actor_id   uuid references public.profiles (id) on delete set null,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  url        text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces (id) on delete cascade,
  email       text not null,
  role        space_role not null default 'invitado',
  token       text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by  uuid not null references public.profiles (id),
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '30 days'),
  created_at  timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Huella de lo ya avisado, para no repetir el mismo aviso en cada revisión.
create table if not exists public.watch_events (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete cascade,
  task_id     uuid references public.tasks (id) on delete set null,
  kind        text not null,
  fingerprint text not null unique,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- Índices ----------

create index if not exists spaces_owner_idx        on public.spaces (owner_id);
create index if not exists space_members_user_idx  on public.space_members (user_id);
create index if not exists projects_space_idx      on public.projects (space_id);
create index if not exists tasks_space_idx         on public.tasks (space_id);
create index if not exists tasks_project_idx       on public.tasks (project_id);
create index if not exists tasks_inbox_idx         on public.tasks (space_id) where status = 'inbox';
create index if not exists tasks_due_idx           on public.tasks (due_date)
  where status in ('pendiente', 'en_progreso', 'bloqueada');
create index if not exists comments_task_idx       on public.comments (task_id, created_at);
create index if not exists activity_space_idx      on public.activity (space_id, created_at desc);
create index if not exists notifications_user_idx  on public.notifications (user_id, created_at desc);
create index if not exists invitations_email_idx   on public.invitations (lower(email));
create index if not exists push_subs_user_idx      on public.push_subscriptions (user_id);
create index if not exists watch_events_space_idx  on public.watch_events (space_id, created_at desc);
