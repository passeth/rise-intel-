-- CPNP official issuance and package history
-- Creates durable issued-document history for generated CPNP documents and links
-- the exact COA/MSDS (and other generated PDFs) that were included in a CPNP package.

create table if not exists public.cpnp_document_generations (
  id uuid primary key default gen_random_uuid(),
  product_code text not null,
  document_type text not null,
  generated_at timestamptz not null default now(),
  issued_date date,
  generated_by uuid null,
  pdf_url text,
  storage_path text,
  status text not null default 'generated',
  template_key text,
  template_version text,
  source_certificate_id uuid null,
  source_hash text,
  source_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.cpnp_document_generations
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists issued_date date,
  add column if not exists generated_by uuid null,
  add column if not exists storage_path text,
  add column if not exists template_key text,
  add column if not exists template_version text,
  add column if not exists source_certificate_id uuid null,
  add column if not exists source_hash text,
  add column if not exists source_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

update public.cpnp_document_generations
set id = gen_random_uuid()
where id is null;

alter table public.cpnp_document_generations
  alter column id set default gen_random_uuid(),
  alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cpnp_document_generations_id_key'
      and conrelid = 'public.cpnp_document_generations'::regclass
  ) then
    alter table public.cpnp_document_generations
      add constraint cpnp_document_generations_id_key unique (id);
  end if;
end $$;

create index if not exists idx_cpnp_document_generations_product_type_generated
  on public.cpnp_document_generations (product_code, document_type, generated_at desc);

create index if not exists idx_cpnp_document_generations_status_generated
  on public.cpnp_document_generations (status, generated_at desc);

create index if not exists idx_cpnp_document_generations_source_hash
  on public.cpnp_document_generations (source_hash)
  where source_hash is not null;

create table if not exists public.cpnp_packages (
  id uuid primary key default gen_random_uuid(),
  package_no text not null unique,
  product_codes text[] not null default '{}',
  document_types text[] not null default '{}',
  issued_at timestamptz not null default now(),
  issued_by uuid null,
  status text not null default 'issued',
  zip_url text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_cpnp_packages_issued_at
  on public.cpnp_packages (issued_at desc);

create index if not exists idx_cpnp_packages_status
  on public.cpnp_packages (status, issued_at desc);

create table if not exists public.cpnp_package_documents (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.cpnp_packages(id) on delete cascade,
  document_generation_id uuid null references public.cpnp_document_generations(id) on delete set null,
  product_code text not null,
  document_type text not null,
  pdf_url text,
  display_order integer not null default 0,
  status text not null default 'included',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_cpnp_package_documents_package
  on public.cpnp_package_documents (package_id, display_order);

create index if not exists idx_cpnp_package_documents_product_type
  on public.cpnp_package_documents (product_code, document_type);
