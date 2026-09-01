-- Rol de cliente y acceso por proyecto.
--
-- Un socio ve todo su espacio. Un cliente NO: ve únicamente los proyectos donde
-- se le da acceso expreso, y nada de lo demás que viva en ese mismo espacio.
-- Eso permite meter a dos clientes distintos en el espacio de un socio sin que
-- se enteren uno del otro.

alter type space_role add value if not exists 'cliente';

-- Un valor nuevo de enum no se puede usar en la misma transacción en que se
-- crea, por eso las políticas que lo mencionan van en la migración siguiente.

create table if not exists public.project_members (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_members_user_idx on public.project_members (user_id);
create index if not exists project_members_project_idx on public.project_members (project_id);

alter table public.project_members enable row level security;
