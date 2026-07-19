-- ============================================================
-- FAMILY FINANCE — Esquema do banco (Supabase / Postgres)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em RUN.
-- Pode rodar mais de uma vez sem problema (idempotente).
-- ============================================================

-- Famílias: cada família tem dois códigos de convite
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  admin_code text not null unique default upper(substr(md5(random()::text), 1, 8)),
  dep_code text not null unique default upper(substr(md5(random()::text), 1, 8)),
  created_at timestamptz not null default now()
);

-- Membros: liga um usuário (auth) à família, com papel e perfil
create table if not exists public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  role text not null check (role in ('admin', 'dep')),
  member_key text not null check (member_key in ('pai', 'mae', 'dep')),
  display_name text,
  created_at timestamptz not null default now(),
  unique (family_id, member_key)
);

-- Dados da família em dois escopos:
--   'admin'  → financeiro (lançamentos, contas, cartões, documentos, faturas)
--   'shared' → comum (sonhos, cofrinho, missões, nomes)
create table if not exists public.family_data (
  family_id uuid not null references public.families (id) on delete cascade,
  scope text not null check (scope in ('admin', 'shared')),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (family_id, scope)
);

-- ---------- Funções auxiliares ----------

create or replace function public.my_family()
returns uuid language sql stable security definer set search_path = public as
$$ select family_id from members where user_id = auth.uid() $$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as
$$ select role from members where user_id = auth.uid() $$;

-- ---------- Segurança em nível de linha (RLS) ----------

alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.family_data enable row level security;

drop policy if exists families_select on public.families;
create policy families_select on public.families
  for select using (id = public.my_family());

drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select using (user_id = auth.uid() or family_id = public.my_family());

-- Dados: dependente só acessa o escopo 'shared'; admins acessam tudo.
drop policy if exists family_data_select on public.family_data;
create policy family_data_select on public.family_data
  for select using (
    family_id = public.my_family()
    and (scope = 'shared' or public.my_role() = 'admin')
  );

drop policy if exists family_data_write on public.family_data;
create policy family_data_write on public.family_data
  for all using (
    family_id = public.my_family()
    and (scope = 'shared' or public.my_role() = 'admin')
  ) with check (
    family_id = public.my_family()
    and (scope = 'shared' or public.my_role() = 'admin')
  );

-- ---------- RPCs (fluxo de família e convites) ----------

-- Cria a família; quem cria vira admin (pai ou mãe)
create or replace function public.create_family(family_name text, my_key text)
returns json language plpgsql security definer set search_path = public as $$
declare fam families;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'você já pertence a uma família';
  end if;
  if my_key not in ('pai', 'mae') then
    raise exception 'quem cria a família deve ser pai ou mãe';
  end if;
  insert into families (name) values (coalesce(nullif(trim(family_name), ''), 'Minha Família'))
    returning * into fam;
  insert into members (user_id, family_id, role, member_key)
    values (auth.uid(), fam.id, 'admin', my_key);
  insert into family_data (family_id, scope) values (fam.id, 'admin'), (fam.id, 'shared')
    on conflict do nothing;
  return json_build_object('family_id', fam.id, 'name', fam.name,
                           'admin_code', fam.admin_code, 'dep_code', fam.dep_code);
end $$;

-- Entra numa família usando um código de convite
create or replace function public.join_family(code text, my_key text)
returns json language plpgsql security definer set search_path = public as $$
declare fam families; new_role text; final_key text;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'você já pertence a uma família';
  end if;
  select * into fam from families
    where admin_code = upper(trim(code)) or dep_code = upper(trim(code));
  if fam.id is null then raise exception 'código de convite inválido'; end if;
  if fam.dep_code = upper(trim(code)) then
    new_role := 'dep'; final_key := 'dep';
  else
    new_role := 'admin';
    if my_key not in ('pai', 'mae') then raise exception 'escolha pai ou mãe'; end if;
    final_key := my_key;
  end if;
  if exists (select 1 from members where family_id = fam.id and member_key = final_key) then
    raise exception 'já existe um membro com esse perfil na família';
  end if;
  insert into members (user_id, family_id, role, member_key)
    values (auth.uid(), fam.id, new_role, final_key);
  return json_build_object('family_id', fam.id, 'name', fam.name, 'role', new_role, 'member_key', final_key);
end $$;

-- Códigos de convite (somente admins conseguem ver)
create or replace function public.get_invites()
returns json language plpgsql security definer set search_path = public as $$
declare fam families;
begin
  if public.my_role() is distinct from 'admin' then
    raise exception 'apenas administradores';
  end if;
  select * into fam from families where id = public.my_family();
  return json_build_object('admin_code', fam.admin_code, 'dep_code', fam.dep_code, 'name', fam.name);
end $$;

-- ---------- Tempo real (sincronização entre aparelhos) ----------
do $$ begin
  alter publication supabase_realtime add table public.family_data;
exception when duplicate_object then null; end $$;
