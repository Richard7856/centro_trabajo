-- Enlaces del proyecto y documento de avance.
--
-- Un socio o un cliente no necesitan entender git: quieren ver la página, leer
-- qué se hizo y pedir cosas. Estas columnas son para eso.

alter table public.projects
  -- [{ "titulo": "Sitio en producción", "url": "https://…" }, …]
  add column if not exists enlaces jsonb not null default '[]'::jsonb,
  -- Ruta, dentro del repositorio, de un Markdown escrito para quien NO es
  -- técnico. Va aparte del README o de un ESTADO.md interno a propósito: esos
  -- suelen traer SQL, llaves y deuda técnica que no se le enseña a un cliente.
  add column if not exists doc_path text,
  add column if not exists doc_rama text;

comment on column public.projects.enlaces is
  'Enlaces visibles para todo el que alcance el proyecto: sitio, panel, demo.';
comment on column public.projects.doc_path is
  'Markdown del repositorio que se muestra como avance. Lo ven socios y clientes.';

-- Se guarda como arreglo de objetos; una cadena suelta rompería la pantalla.
alter table public.projects drop constraint if exists projects_enlaces_arreglo;
alter table public.projects add constraint projects_enlaces_arreglo
  check (jsonb_typeof(enlaces) = 'array');
