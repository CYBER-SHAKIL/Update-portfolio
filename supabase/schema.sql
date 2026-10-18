-- Also applied to the live Supabase project by the assistant.
-- Admin authorization uses Supabase app_metadata.role = 'admin'.
create extension if not exists pgcrypto;
create table if not exists public.projects (
 id uuid primary key default gen_random_uuid(), title text not null,
 description text not null default '', tech_stack text[] not null default '{}',
 project_url text, image_url text, featured boolean not null default false,
 sort_order integer not null default 0, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
create policy "Public can read projects" on public.projects for select to anon, authenticated using (true);
create policy "Admins manage projects" on public.projects for all to authenticated
using ((select auth.jwt()->'app_metadata'->>'role')='admin')
with check ((select auth.jwt()->'app_metadata'->>'role')='admin');
create table if not exists public.contact_messages (
 id uuid primary key default gen_random_uuid(), name text not null, email text not null,
 subject text not null default '', message text not null,
 status text not null default 'new' check(status in ('new','read','replied','archived')),
 created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
create policy "Anyone can send a contact message" on public.contact_messages for insert to anon, authenticated
with check(length(trim(name)) between 1 and 120 and length(trim(email)) between 3 and 254 and length(trim(message)) between 1 and 5000);
create policy "Admins read contact messages" on public.contact_messages for select to authenticated
using ((select auth.jwt()->'app_metadata'->>'role')='admin');
create policy "Admins update contact messages" on public.contact_messages for update to authenticated
using ((select auth.jwt()->'app_metadata'->>'role')='admin')
with check ((select auth.jwt()->'app_metadata'->>'role')='admin');
create policy "Admins delete contact messages" on public.contact_messages for delete to authenticated
using ((select auth.jwt()->'app_metadata'->>'role')='admin');
create table if not exists public.site_visits(id bigint generated always as identity primary key, visited_at timestamptz not null default now());
alter table public.site_visits enable row level security;
create policy "Visitors can record a visit" on public.site_visits for insert to anon, authenticated with check(true);
create policy "Visit count can be read" on public.site_visits for select to anon, authenticated using(true);
create index if not exists contact_messages_created_at_idx on public.contact_messages(created_at desc);
create index if not exists projects_sort_order_idx on public.projects(sort_order,created_at desc);
create index if not exists site_visits_visited_at_idx on public.site_visits(visited_at desc);
insert into public.projects(title,description,tech_stack,featured,sort_order)
select 'Portfolio Website','A responsive developer portfolio with a neon dark theme.',array['HTML','CSS','JavaScript'],true,1
where not exists(select 1 from public.projects where title='Portfolio Website');
insert into public.projects(title,description,tech_stack,featured,sort_order)
select 'Supabase Auth Demo','Authentication and database-backed app starter.',array['Supabase','Auth','PostgreSQL'],true,2
where not exists(select 1 from public.projects where title='Supabase Auth Demo');
insert into public.projects(title,description,tech_stack,featured,sort_order)
select 'Admin Dashboard','Manage projects and incoming contact messages.',array['JavaScript','PostgreSQL'],false,3
where not exists(select 1 from public.projects where title='Admin Dashboard');
