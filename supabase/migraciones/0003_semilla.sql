-- Siembra inicial del organizador.
--
-- La llama quien inicia sesión por primera vez y queda como dueño de todo.
-- Es idempotente: si esa persona ya tiene espacios, no hace nada.
--
-- Traído de "niddo" con los cambios acordados: HDI no se copia, Access queda
-- archivado, Cristy no lleva espacio propio (entra al de Jose cuando tenga
-- cuenta) y se agregan Jaime y Yimi.

create or replace function public.sembrar_organizador()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_yo       uuid := auth.uid();
  v_jose     uuid;
  v_clinica  uuid;
  v_niddo    uuid;
  v_creados  int;
begin
  if v_yo is null then
    raise exception 'Hay que iniciar sesión para sembrar el organizador.';
  end if;

  if exists (select 1 from public.space_members where user_id = v_yo) then
    return jsonb_build_object('estado', 'ya_existia',
      'espacios', (select count(*) from public.space_members where user_id = v_yo));
  end if;

  insert into public.spaces (name, kind, color, owner_id, archived_at) values
    ('Jose',     'persona',  'indigo',  v_yo, null),
    ('Jaime',    'persona',  'violet',  v_yo, null),
    ('Yimi',     'persona',  'cyan',    v_yo, null),
    ('Personal', 'personal', 'slate',   v_yo, null),
    ('Access',   'empresa',  'amber',   v_yo, now());

  select id into v_jose from public.spaces where owner_id = v_yo and name = 'Jose';

  insert into public.projects
    (space_id, name, description, status, due_date, created_by, repo_url,
     last_commit_at, last_commit_message, last_commit_author,
     last_deploy_state, last_deploy_url)
  values (
    v_jose, 'Clínica — Control interno',
    'Web de control interno (pacientes, sesiones, cabinas y pagos) más la app móvil de clientes L''Ecrobelle, con el programa de puntos "Cisnes". Backend en Firebase (clin-bd81e). Repo: Richard7856/clinica.',
    'activo', '2026-09-15', v_yo, 'https://github.com/Richard7856/clinica',
    '2026-04-22 23:33:50+00',
    'feat(ux): checkin QR → avance de cita + nav móvil + cards clickeables',
    'Richard', 'READY', 'clinica-xuawggt8m-richards-projects-b633518f.vercel.app'
  ) returning id into v_clinica;

  insert into public.projects
    (space_id, name, description, status, due_date, created_by, repo_url,
     last_deploy_state, last_deploy_url)
  values (
    v_jose, 'Niddo — Rentas',
    'Plataforma de renta de cuartos: 5 edificios, 11 propiedades, 102 cuartos (94 ocupados). Flujo solicitud → contrato → firma → acceso del inquilino, más reportes de incidencias. Supabase + Vercel, en producción.',
    'activo', '2026-09-30', v_yo, 'https://github.com/Richard7856/niddo',
    'READY', 'niddo-ftorisu5d-richards-projects-b633518f.vercel.app'
  ) returning id into v_niddo;

  -- Bandeja del espacio: pendientes sin proyecto asignado.
  insert into public.tasks (space_id, project_id, title, description, status, priority, created_by, origin) values
    (v_jose, null, '¿Niddo y Clínica siguen compartiendo la misma base?',
     'Resuelto: el organizador se mudó a su propia base (inkwell). Niddo-rentas se queda sola en la suya.',
     'completada', 'baja', v_yo, 'persona'),
    (v_jose, null, '¿La cuenta de Stripe de la clínica va a nombre de quién?',
     'Antes de conectar el cobro real hay que definir si la cuenta es de la clínica o tuya, porque de eso depende a dónde cae el dinero y quién factura.',
     'inbox', 'media', v_yo, 'persona'),
    (v_jose, null, 'Niddo — Rentas: el último build no está en producción',
     'Hay un despliegue listo más reciente que el que sirve producción, y nunca se promovió.',
     'inbox', 'media', v_yo, 'vigilante'),
    (v_jose, null, 'Clínica — Control interno: el último build no está en producción',
     'Hay un despliegue listo más reciente que el que sirve producción, y nunca se promovió.',
     'inbox', 'media', v_yo, 'vigilante'),
    (v_jose, null, 'Clínica — Control interno: hay trabajo fuera de main',
     'La rama main lleva meses sin moverse, pero el repo siguió recibiendo push. Quien clone la rama principal no va a encontrar ese trabajo.',
     'inbox', 'media', v_yo, 'vigilante'),
    (v_jose, null, 'Clínica — Control interno lleva tiempo sin movimiento',
     'El proyecto sigue marcado como activo pero sin pushes recientes. Vale la pena retomarlo, pausarlo o cerrarlo.',
     'inbox', 'media', v_yo, 'vigilante');

  insert into public.tasks (space_id, project_id, title, description, status, priority, due_date, created_by, origin) values
    (v_jose, v_clinica, 'Quitar el endpoint temporal de seed de demo',
     'Siembra pacientes, tratamientos y pagos de ejemplo. El propio commit lo marcó como temporal para la demo. No debe existir cuando entren pacientes reales.',
     'pendiente', 'urgente', '2026-08-24', v_yo, 'persona'),
    (v_jose, v_clinica, 'Promover a producción el despliegue del 2 de agosto',
     'El dominio sirve una versión anterior: el último build quedó como preview y nunca se promovió.',
     'pendiente', 'alta', '2026-08-25', v_yo, 'persona'),
    (v_jose, v_clinica, 'Integrar la rama claude/amazing-galileo-yLKWF a main',
     'Todos los despliegues salen de esa rama. Si alguien clona main se encuentra el proyecto sin el panel KPI, la tienda, el QR de citas ni el rol de colaborador.',
     'pendiente', 'alta', '2026-08-28', v_yo, 'persona'),
    (v_jose, v_clinica, 'Desplegar las reglas de Firestore en clin-bd81e',
     'Quedó anotado como pendiente en el documento de handoff. Sin reglas correctas, la base queda expuesta o la app deja de leer.',
     'pendiente', 'alta', '2026-08-28', v_yo, 'persona'),
    (v_jose, v_clinica, 'Configurar RESEND_API_KEY y verificar el dominio',
     'El correo con el QR de la cita ya está programado, pero sin dominio verificado en Resend sólo puede enviarse a tu propia dirección, no a los pacientes.',
     'pendiente', 'alta', '2026-08-31', v_yo, 'persona'),
    (v_jose, v_clinica, 'Conectar la cuenta real de Stripe',
     'La compra de la app corre en modo simulado: registra el pago y suma Cisnes sin cobrar. El código de Stripe (checkout + webhook con idempotencia) ya está escrito, sólo falta la cuenta.',
     'pendiente', 'alta', '2026-09-08', v_yo, 'persona'),
    (v_jose, v_clinica, 'Subir el AAB a Play Console',
     'El build firmado ya está generado y entregado: APK de 25 MB con splits arm64 y el AAB para la tienda. Falta la ficha de la app y la subida.',
     'pendiente', 'media', '2026-09-12', v_yo, 'persona'),
    (v_jose, v_niddo, 'Corregir la vista contracts_admin: se salta las políticas',
     'Está declarada como SECURITY DEFINER, así que corre con los permisos de quien la creó en vez de los de quien consulta, evadiendo el aislamiento por inquilino. Es el único hallazgo de nivel error en el revisor de seguridad de Supabase.',
     'pendiente', 'urgente', '2026-08-24', v_yo, 'persona'),
    (v_jose, v_niddo, 'Dar seguimiento a las 5 solicitudes sin cerrar',
     '2 nuevas sin tocar, 2 en seguimiento y 1 contactada. Con 8 cuartos disponibles, cada solicitud sin responder es dinero parado.',
     'pendiente', 'alta', '2026-08-24', v_yo, 'persona'),
    (v_jose, v_niddo, 'Atender las 7 incidencias abiertas',
     'De 10 reportes de inquilinos, 7 siguen abiertos y 2 en proceso. Sólo 1 está resuelto.',
     'pendiente', 'alta', '2026-08-26', v_yo, 'persona'),
    (v_jose, v_niddo, 'Activar la protección de contraseñas filtradas',
     'Los inquilinos entran con contraseña y la verificación contra bases de contraseñas comprometidas está apagada. Se activa desde Supabase Auth, sin tocar código.',
     'pendiente', 'alta', '2026-08-28', v_yo, 'persona'),
    (v_jose, v_niddo, 'Revisar las funciones abiertas sin sesión',
     'contract_open, contract_sign, contract_save_details, contract_emergency_list y reservation_request pueden ejecutarse sin iniciar sesión, protegidas sólo por el token del enlace. Confirmar que es a propósito y que los tokens vencen.',
     'pendiente', 'media', '2026-09-05', v_yo, 'persona'),
    (v_jose, v_niddo, 'Ocupación al 92%: decidir si se abren más cuartos',
     '94 de 102 cuartos ocupados, sólo quedan 8 libres. Vale la pena definir si se suma inventario o se sube precio antes de quedarse sin qué ofrecer.',
     'pendiente', 'media', '2026-09-15', v_yo, 'persona');

  insert into public.tasks (space_id, project_id, title, description, status, priority, created_by, origin) values
    (v_jose, v_clinica, 'Generar APK y AAB firmados para Play Console',
     'Hecho: APK release de 25 MB con splits arm64-v8a y AAB entregado.',
     'completada', 'media', v_yo, 'persona'),
    (v_jose, v_clinica, 'Migrar Firebase de euromex-t2o27z a clin-bd81e',
     'Hecho: el CLI y los despliegues de reglas e índices ya apuntan al proyecto nuevo, en plan gratuito.',
     'completada', 'media', v_yo, 'persona'),
    (v_jose, v_niddo, 'Desplegar a producción la versión más reciente',
     'Hecho: el despliegue de producción quedó en estado listo.',
     'completada', 'media', v_yo, 'persona'),
    (v_jose, v_niddo, 'Definir qué pasa con la tabla chat_outcomes',
     'Está creada, con políticas y sin un solo renglón. O se conecta a algo o se quita, para que no confunda más adelante.',
     'pendiente', 'baja', v_yo, 'persona');

  select count(*) into v_creados from public.tasks where space_id = v_jose;

  return jsonb_build_object(
    'estado', 'sembrado', 'espacios', 5, 'proyectos', 2, 'tareas', v_creados
  );
end;
$fn$;

revoke all on function public.sembrar_organizador() from public, anon;
grant execute on function public.sembrar_organizador() to authenticated;
