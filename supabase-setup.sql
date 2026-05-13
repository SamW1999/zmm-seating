-- ============================================================
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- 1. TABLES
create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  row text not null,
  col integer not null,
  is_bima boolean default false,
  is_active boolean default true,
  label text
);

-- 2. SEATS
create table if not exists seats (
  id uuid primary key default gen_random_uuid(),
  table_id uuid references tables(id) on delete cascade,
  position integer not null,
  member_name text,
  is_reserved boolean default false
);

-- 3. REQUESTS
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  seat_id uuid references seats(id) on delete cascade,
  requester_name text not null,
  requester_contact text not null,
  note text,
  is_one_time boolean default false,
  status text default 'pending',
  created_at timestamptz default now()
);

-- 4. SEED LAYOUT
insert into tables (row, col) values
  ('A',1),('B',1),('C',1),('D',1),('E',1),('F',1),
  ('C',2),('D',2),('E',2),('F',2),
  ('C',3),('E',3),('F',3),
  ('A',4),('B',4),('C',4),('D',4),('E',4),('F',4),
  ('A',5),('B',5),('C',5),('D',5),('E',5);

insert into tables (row, col, is_bima) values ('D',3,true);

insert into seats (table_id, position)
select t.id, s.pos from tables t
cross join (select 1 as pos union select 2 union select 3) s
where t.is_bima = false;

-- 5. ROW LEVEL SECURITY
alter table tables enable row level security;
alter table seats enable row level security;
alter table requests enable row level security;

-- Public: read tables and seats
create policy "public_read_tables" on tables for select using (true);
create policy "public_read_seats" on seats for select using (true);

-- Public: insert requests only
create policy "public_insert_requests" on requests for insert with check (true);

-- Public: read own-ish requests (just pending, by seat) - optional
create policy "public_read_requests" on requests for select using (true);

-- Authenticated (admin): full access
create policy "admin_all_tables" on tables for all using (auth.role() = 'authenticated');
create policy "admin_all_seats" on seats for all using (auth.role() = 'authenticated');
create policy "admin_all_requests" on requests for all using (auth.role() = 'authenticated');

-- 6. ENABLE REALTIME
alter publication supabase_realtime add table requests;
alter publication supabase_realtime add table seats;
alter publication supabase_realtime add table tables;
