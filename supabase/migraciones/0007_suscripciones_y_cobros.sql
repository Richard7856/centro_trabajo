-- Suscripciones y sus cobros.
--
-- El dinero solo lo ve quien manda en el espacio: ni invitados ni clientes.
-- Los cobros no se calculan al vuelo, se generan como filas con fecha: así el
-- calendario, los vencidos y lo cobrado salen de la misma verdad.

do $$ begin
  create type subscription_cadence as enum
    ('mensual', 'bimestral', 'trimestral', 'semestral', 'anual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('activa', 'pausada', 'cancelada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type charge_status as enum ('pendiente', 'pagado', 'vencido', 'cancelado');
exception when duplicate_object then null; end $$;

create table if not exists public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete set null,
  concepto    text not null check (length(trim(concepto)) > 0),
  cliente     text,
  amount      numeric(12,2) not null check (amount >= 0),
  currency    text not null default 'MXN',
  cadence     subscription_cadence not null default 'mensual',
  -- Día del mes en que toca cobrar. Si el mes no llega a ese día (30 de
  -- febrero), se usa el último del mes.
  billing_day smallint not null default 1 check (billing_day between 1 and 31),
  start_date  date not null default current_date,
  end_date    date,
  status      subscription_status not null default 'activa',
  notas       text,
  created_by  uuid not null references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index if not exists subscriptions_space_idx on public.subscriptions (space_id);
create index if not exists subscriptions_project_idx on public.subscriptions (project_id);

create table if not exists public.subscription_charges (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  space_id        uuid not null references public.spaces (id) on delete cascade,
  due_date        date not null,
  amount          numeric(12,2) not null,
  currency        text not null default 'MXN',
  status          charge_status not null default 'pendiente',
  paid_at         timestamptz,
  notas           text,
  created_at      timestamptz not null default now(),
  unique (subscription_id, due_date)
);

create index if not exists charges_space_idx on public.subscription_charges (space_id, due_date);
create index if not exists charges_pendientes_idx on public.subscription_charges (due_date)
  where status = 'pendiente';

alter table public.subscriptions enable row level security;
alter table public.subscription_charges enable row level security;

drop policy if exists subs_select on public.subscriptions;
create policy subs_select on public.subscriptions for select to authenticated
  using (public.can_manage_space(space_id));

drop policy if exists subs_insert on public.subscriptions;
create policy subs_insert on public.subscriptions for insert to authenticated
  with check (public.can_manage_space(space_id) and created_by = auth.uid());

drop policy if exists subs_update on public.subscriptions;
create policy subs_update on public.subscriptions for update to authenticated
  using (public.can_manage_space(space_id)) with check (public.can_manage_space(space_id));

drop policy if exists subs_delete on public.subscriptions;
create policy subs_delete on public.subscriptions for delete to authenticated
  using (public.can_manage_space(space_id));

drop policy if exists charges_select on public.subscription_charges;
create policy charges_select on public.subscription_charges for select to authenticated
  using (public.can_manage_space(space_id));

drop policy if exists charges_insert on public.subscription_charges;
create policy charges_insert on public.subscription_charges for insert to authenticated
  with check (public.can_manage_space(space_id));

drop policy if exists charges_update on public.subscription_charges;
create policy charges_update on public.subscription_charges for update to authenticated
  using (public.can_manage_space(space_id)) with check (public.can_manage_space(space_id));

drop policy if exists charges_delete on public.subscription_charges;
create policy charges_delete on public.subscription_charges for delete to authenticated
  using (public.can_manage_space(space_id));

drop trigger if exists subs_touch on public.subscriptions;
create trigger subs_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ---------- Calendario de cobros ----------

-- El día de cobro dentro del mes de una fecha, sin salirse del mes.
create or replace function public.dia_de_cobro(p_mes date, p_dia int)
returns date language sql immutable as $$
  select (
    date_trunc('month', p_mes)
    + (least(
         p_dia,
         extract(day from (date_trunc('month', p_mes) + interval '1 month - 1 day'))::int
       ) - 1) * interval '1 day'
  )::date;
$$;

create or replace function public.meses_de_cadencia(p subscription_cadence)
returns int language sql immutable as $$
  select case p
    when 'mensual' then 1 when 'bimestral' then 2 when 'trimestral' then 3
    when 'semestral' then 6 else 12 end;
$$;

-- Crea las filas de cobro que falten hasta el horizonte. Es idempotente: si ya
-- existe el cobro de esa fecha, no lo duplica ni lo pisa.
--
-- Se avanza siempre sobre el día pactado, no sobre el último cobro emitido:
-- así un cobro el 31 que en febrero cayó al 28 vuelve al 31 en marzo, en vez
-- de quedarse arrastrando el 28 el resto del año.
create or replace function public.generar_cobros(p_sub uuid, p_hasta date default null)
returns integer
language plpgsql security definer set search_path to 'public' as $$
declare
  s          record;
  fecha      date;
  horizonte  date;
  paso       int;
  creados    int := 0;
begin
  select * into s from public.subscriptions where id = p_sub;
  if not found then raise exception 'Suscripción no encontrada.'; end if;
  if not public.can_manage_space(s.space_id) then
    raise exception 'No tienes permiso sobre este espacio.';
  end if;
  if s.status <> 'activa' then return 0; end if;

  horizonte := least(
    coalesce(p_hasta, (current_date + interval '12 months')::date),
    coalesce(s.end_date, (current_date + interval '36 months')::date)
  );
  paso := public.meses_de_cadencia(s.cadence);

  fecha := public.dia_de_cobro(s.start_date, s.billing_day);
  -- Si el primer día de cobro cae antes del alta, se salta al siguiente periodo.
  if fecha < s.start_date then
    fecha := public.dia_de_cobro((s.start_date + (paso || ' months')::interval)::date, s.billing_day);
  end if;

  while fecha <= horizonte loop
    insert into public.subscription_charges (subscription_id, space_id, due_date, amount, currency)
    values (p_sub, s.space_id, fecha, s.amount, s.currency)
    on conflict (subscription_id, due_date) do nothing;
    if found then creados := creados + 1; end if;
    fecha := public.dia_de_cobro((fecha + (paso || ' months')::interval)::date, s.billing_day);
  end loop;

  return creados;
end;
$$;

-- Marca como vencido lo que quedó pendiente y ya pasó de fecha.
create or replace function public.marcar_vencidos()
returns integer
language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  update public.subscription_charges c
     set status = 'vencido'
   where c.status = 'pendiente'
     and c.due_date < current_date
     and public.can_manage_space(c.space_id);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.generar_cobros(uuid, date) from public, anon;
revoke execute on function public.marcar_vencidos()          from public, anon;
grant execute on function public.generar_cobros(uuid, date) to authenticated;
grant execute on function public.marcar_vencidos()          to authenticated;
