create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  visibility text not null check (visibility in ('public', 'private')),
  host_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('loser-first', 'reverse', 'elimination', 'random')),
  mini_game text not null check (mini_game in ('bomb', 'reflex', 'word-chain')),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  phase text not null default 'lobby'
    check (phase in ('lobby', 'bomb', 'reflex_wait', 'reflex_live', 'word_turn', 'round_complete', 'finished')),
  round_number integer not null default 0 check (round_number >= 0),
  turn_order uuid[] not null default '{}',
  current_turn_index integer not null default 0 check (current_turn_index >= 0),
  current_word text,
  turn_deadline timestamptz,
  reflex_starts_at timestamptz,
  reflex_deadline timestamptz,
  previous_loser_id uuid,
  loser_id uuid,
  winner_id uuid,
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  losses integer not null default 0 check (losses >= 0),
  eliminated boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create unique index room_members_unique_display_name
  on public.room_members (room_id, lower(display_name));

create table public.room_secrets (
  room_id uuid not null references public.rooms (id) on delete cascade,
  round_number integer not null,
  bomb_turn_index integer not null check (bomb_turn_index > 0),
  primary key (room_id, round_number)
);

create table public.room_reflex_responses (
  room_id uuid not null,
  round_number integer not null,
  user_id uuid not null,
  received_at timestamptz not null,
  primary key (room_id, round_number, user_id),
  foreign key (room_id, user_id) references public.room_members (room_id, user_id) on delete cascade
);

create table public.room_word_uses (
  room_id uuid not null references public.rooms (id) on delete cascade,
  round_number integer not null,
  word text not null,
  user_id uuid,
  used_at timestamptz not null default now(),
  primary key (room_id, round_number, word)
);

create table public.room_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms (id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default now()
);

create table public.room_join_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index room_join_attempts_recent on public.room_join_attempts (user_id, attempted_at desc);
create index rooms_public_waiting on public.rooms (created_at desc) where visibility = 'public' and status = 'waiting';
create index room_members_by_user on public.room_members (user_id, room_id);

create table public.word_dictionary (
  word text primary key check (word ~ '^[a-z]{2,20}$')
);

insert into public.word_dictionary (word) values
  ('abad'), ('abang'), ('abu'), ('acara'), ('acuan'), ('ada'), ('adat'), ('adem'), ('adil'), ('adu'),
  ('agak'), ('agama'), ('agar'), ('agen'), ('air'), ('ajaib'), ('ajar'), ('aju'), ('akar'), ('akan'),
  ('akhir'), ('aksi'), ('aktif'), ('aku'), ('akurat'), ('alam'), ('alat'), ('album'), ('alih'), ('alir'),
  ('amat'), ('ambil'), ('anak'), ('anda'), ('angin'), ('angka'), ('angkasa'), ('angkut'), ('api'), ('apel'),
  ('arah'), ('arang'), ('asap'), ('asal'), ('asam'), ('asli'), ('atap'), ('atau'), ('atur'), ('awan'),
  ('awas'), ('ayah'), ('ayam'), ('baca'), ('badan'), ('bagus'), ('bahagia'), ('bahasa'), ('bahu'), ('baik'),
  ('baju'), ('bakar'), ('balik'), ('bambu'), ('bangun'), ('bantu'), ('baru'), ('batu'), ('bawa'), ('bayam'),
  ('bayar'), ('bayi'), ('becak'), ('beda'), ('belah'), ('belajar'), ('benar'), ('benda'), ('benih'), ('bensin'),
  ('besar'), ('besi'), ('betul'), ('biar'), ('bicara'), ('bijak'), ('biji'), ('bila'), ('biru'), ('bisa'),
  ('buah'), ('buang'), ('buat'), ('buka'), ('bulan'), ('bunga'), ('burung'), ('bus'), ('cabang'), ('cabai'),
  ('cahaya'), ('cair'), ('cakap'), ('cari'), ('catat'), ('cepat'), ('cerah'), ('cerita'), ('cinta'), ('coba'),
  ('cukup'), ('dada'), ('daging'), ('dalam'), ('damai'), ('danau'), ('dapat'), ('dapur'), ('dasar'), ('data'),
  ('daun'), ('debu'), ('dekat'), ('dengar'), ('desa'), ('dewa'), ('diam'), ('dinding'), ('diri'), ('doa'),
  ('duduk'), ('dunia'), ('durian'), ('ekor'), ('emas'), ('enak'), ('energi'), ('esok'), ('fakta'), ('fajar'),
  ('fokus'), ('foto'), ('gajah'), ('gaji'), ('gambar'), ('gandum'), ('garam'), ('garis'), ('gelap'), ('gelas'),
  ('gemar'), ('gemuk'), ('gerak'), ('gigi'), ('gula'), ('gunung'), ('guru'), ('hajar'), ('halaman'), ('halus'),
  ('hampa'), ('hangat'), ('hantu'), ('haram'), ('harap'), ('hari'), ('harum'), ('hasil'), ('hati'), ('hebat'),
  ('hemat'), ('hidup'), ('hijau'), ('hitam'), ('hobi'), ('hujan'), ('hutan'), ('ibadah'), ('ibarat'), ('ikan'),
  ('iklim'), ('ikut'), ('ilmu'), ('indah'), ('ingat'), ('ingin'), ('isi'), ('istana'), ('istri'), ('jadi'),
  ('jalan'), ('jamur'), ('jauh'), ('jawab'), ('jaya'), ('jelas'), ('jemur'), ('jendela'), ('jenis'), ('jeruk'),
  ('jiwa'), ('jual'), ('juara'), ('jujur'), ('kabar'), ('kaca'), ('kain'), ('kakak'), ('kaki'), ('kalah'),
  ('kali'), ('kamar'), ('kamis'), ('kampung'), ('kapan'), ('kapal'), ('kapas'), ('karena'), ('kasih'), ('kata'),
  ('kawan'), ('kayu'), ('kebun'), ('kecil'), ('kedai'), ('keju'), ('kelas'), ('keluarga'), ('kemah'), ('kenal'),
  ('kepala'), ('kerja'), ('kereta'), ('kering'), ('kertas'), ('ketan'), ('khas'), ('kirim'), ('kita'), ('kolam'),
  ('komik'), ('kota'), ('kuat'), ('kuda'), ('kue'), ('kuku'), ('kulit'), ('kunci'), ('kuning'), ('kursi'),
  ('labu'), ('lagu'), ('lahir'), ('laju'), ('laku'), ('lama'), ('lampu'), ('langit'), ('laut'), ('lawan'),
  ('layar'), ('lebar'), ('lebat'), ('leher'), ('lelah'), ('lemah'), ('lemari'), ('lepas'), ('lewat'), ('libur'),
  ('lidah'), ('lihat'), ('lima'), ('listrik'), ('lucu'), ('luka'), ('lulus'), ('lupa'), ('maaf'), ('mahal'),
  ('mahasiswa'), ('maju'), ('makan'), ('malam'), ('malu'), ('mampu'), ('mana'), ('manis'), ('manusia'), ('mata'),
  ('matang'), ('mawar'), ('medan'), ('meja'), ('melati'), ('merah'), ('merasa'), ('mereka'), ('minum'), ('mobil'),
  ('modal'), ('mulai'), ('mulut'), ('murah'), ('murid'), ('musim'), ('musik'), ('nama'), ('nanas'), ('nasi'),
  ('nasihat'), ('negara'), ('nenek'), ('niaga'), ('nilai'), ('nipis'), ('nomor'), ('nyala'), ('obat'), ('ombak'),
  ('orang'), ('otak'), ('pagi'), ('pahit'), ('pakaian'), ('paku'), ('palu'), ('panas'), ('pandan'), ('panggil'),
  ('pantas'), ('papan'), ('para'), ('pasar'), ('pasir'), ('pasti'), ('patah'), ('patuh'), ('payung'), ('pedas'),
  ('pegang'), ('pekan'), ('pelan'), ('pena'), ('penuh'), ('perahu'), ('perak'), ('perang'), ('pergi'), ('perlu'),
  ('petani'), ('peta'), ('peti'), ('pikir'), ('pintu'), ('pisang'), ('pohon'), ('pulang'), ('pulau'), ('puluh'),
  ('puncak'), ('putih'), ('rabu'), ('raja'), ('rakyat'), ('ramai'), ('rambut'), ('rasa'), ('rawat'), ('rebus'),
  ('rekam'), ('rela'), ('rendah'), ('resmi'), ('restu'), ('roda'), ('roti'), ('rumah'), ('rumput'), ('sabar'),
  ('sakit'), ('salah'), ('salam'), ('sama'), ('sambal'), ('sampai'), ('sangat'), ('sapi'), ('sapu'), ('satu'),
  ('sayang'), ('sayur'), ('sebab'), ('sehat'), ('sejuk'), ('sekolah'), ('selalu'), ('selasa'), ('selesai'), ('semangat'),
  ('senang'), ('senin'), ('sepatu'), ('sering'), ('serta'), ('sikat'), ('siku'), ('sinar'), ('singkat'), ('siswa'),
  ('sopan'), ('suara'), ('sudah'), ('suka'), ('suku'), ('sulit'), ('sungai'), ('surat'), ('surya'), ('tahu'),
  ('taman'), ('tangan'), ('tanpa'), ('tanya'), ('tari'), ('tarik'), ('tas'), ('tebal'), ('tebu'), ('tegak'),
  ('tegas'), ('teh'), ('telur'), ('teman'), ('tempat'), ('tenang'), ('tengah'), ('tentu'), ('terang'), ('teras'),
  ('terima'), ('tidak'), ('tidur'), ('tiga'), ('timur'), ('tinggi'), ('toko'), ('tolong'), ('tombak'), ('tua'),
  ('tubuh'), ('tugas'), ('tujuh'), ('tulang'), ('tulis'), ('tumbuh'), ('tunggu'), ('turun'), ('uang'), ('ubah'),
  ('udara'), ('ular'), ('ulang'), ('umur'), ('undang'), ('ungu'), ('untuk'), ('upaya'), ('usaha'), ('utama'),
  ('wajah'), ('waktu'), ('warna'), ('warga'), ('warung'), ('waspada'), ('yakin'), ('yatim'), ('zaman'), ('zat')
on conflict (word) do nothing;

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_secrets enable row level security;
alter table public.room_reflex_responses enable row level security;
alter table public.room_word_uses enable row level security;
alter table public.room_events enable row level security;
alter table public.room_join_attempts enable row level security;
alter table public.word_dictionary enable row level security;

revoke all on public.rooms, public.room_members, public.room_secrets,
  public.room_reflex_responses, public.room_word_uses, public.room_events,
  public.room_join_attempts, public.word_dictionary from anon, authenticated;
grant select on public.room_events to authenticated;

create or replace function public._is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

revoke all on function public._is_room_member(uuid) from public, anon, authenticated;
grant execute on function public._is_room_member(uuid) to authenticated;

create policy room_events_member_read
  on public.room_events for select to authenticated
  using (public._is_room_member(room_id));

create or replace function public._emit_room_event(p_room_id uuid, p_event_type text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.room_events (room_id, event_type) values (p_room_id, p_event_type);
$$;

create or replace function public._random_index(p_bound integer)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_bytes bytea := decode(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8), 'hex');
begin
  if p_bound < 1 then
    raise exception 'Batas acak tidak valid.' using errcode = '22023';
  end if;
  return ((get_byte(v_bytes, 0)::bigint * 16777216
    + get_byte(v_bytes, 1)::bigint * 65536
    + get_byte(v_bytes, 2)::bigint * 256
    + get_byte(v_bytes, 3)::bigint) % p_bound + 1)::integer;
end;
$$;

create or replace function public._build_turn_order(
  p_room_id uuid,
  p_mode text,
  p_previous_order uuid[],
  p_previous_loser uuid
)
returns uuid[]
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_active uuid[];
  v_base uuid[];
begin
  select coalesce(array_agg(m.user_id order by m.joined_at, m.user_id), '{}'::uuid[])
    into v_active
  from public.room_members m
  where m.room_id = p_room_id and not m.eliminated;

  if cardinality(v_active) = 0 then
    return '{}'::uuid[];
  end if;

  if p_mode = 'random' or cardinality(coalesce(p_previous_order, '{}'::uuid[])) = 0 then
    select coalesce(array_agg(x.user_id order by gen_random_uuid()), '{}'::uuid[])
      into v_base
    from unnest(v_active) as x(user_id);
    return v_base;
  end if;

  select coalesce(array_agg(x.user_id order by x.position), '{}'::uuid[])
    into v_base
  from unnest(p_previous_order) with ordinality as x(user_id, position)
  join public.room_members m
    on m.room_id = p_room_id and m.user_id = x.user_id and not m.eliminated;

  if cardinality(v_base) < cardinality(v_active) then
    select v_base || coalesce(array_agg(x.user_id order by x.joined_at, x.user_id), '{}'::uuid[])
      into v_base
    from public.room_members x
    where x.room_id = p_room_id
      and not x.eliminated
      and not (x.user_id = any(v_base));
  end if;

  if p_mode = 'reverse' then
    select coalesce(array_agg(x.user_id order by x.position desc), '{}'::uuid[])
      into v_base
    from unnest(v_base) with ordinality as x(user_id, position);
    return v_base;
  end if;

  if p_mode = 'loser-first' and p_previous_loser = any(v_base) then
    return array[p_previous_loser] || array_remove(v_base, p_previous_loser);
  end if;

  return v_base;
end;
$$;

create or replace function public._finish_room_round(p_room_id uuid, p_loser_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_active_count integer;
  v_winner_id uuid;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or v_room.status <> 'playing'
    or v_room.phase not in ('bomb', 'reflex_wait', 'reflex_live', 'word_turn') then
    raise exception 'Ronde tidak sedang aktif.' using errcode = '55000';
  end if;

  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = p_loser_id and not eliminated
  ) then
    raise exception 'Pemain kalah tidak valid.' using errcode = '22023';
  end if;

  update public.room_members
    set losses = losses + 1,
        eliminated = (v_room.mode = 'elimination')
  where room_id = p_room_id and user_id = p_loser_id;

  update public.rooms
    set loser_id = p_loser_id,
        previous_loser_id = p_loser_id,
        phase = 'round_complete',
        turn_deadline = null,
        reflex_deadline = null
  where id = p_room_id;

  if v_room.mode = 'elimination' then
    select count(*), (array_agg(user_id order by joined_at, user_id))[1]
      into v_active_count, v_winner_id
    from public.room_members
    where room_id = p_room_id and not eliminated;

    if v_active_count <= 1 then
      update public.rooms
        set status = 'finished',
            phase = 'finished',
            winner_id = v_winner_id,
            turn_order = '{}'
      where id = p_room_id;
    end if;
  end if;

  perform public._emit_room_event(p_room_id, 'round_complete');
end;
$$;

create or replace function public._begin_mini_game(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_seed_word text;
  v_count integer;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  v_count := cardinality(v_room.turn_order);

  delete from public.room_secrets where room_id = p_room_id and round_number = v_room.round_number;
  delete from public.room_reflex_responses where room_id = p_room_id and round_number = v_room.round_number;
  delete from public.room_word_uses where room_id = p_room_id and round_number = v_room.round_number;

  if v_room.mini_game = 'bomb' then
    insert into public.room_secrets (room_id, round_number, bomb_turn_index)
    values (p_room_id, v_room.round_number, public._random_index(v_count));
    update public.rooms
      set phase = 'bomb',
          current_turn_index = 0,
          current_word = null,
          turn_deadline = clock_timestamp() + interval '30 seconds',
          reflex_starts_at = null,
          reflex_deadline = null
    where id = p_room_id;
  elsif v_room.mini_game = 'reflex' then
    update public.rooms
      set phase = 'reflex_wait',
          current_turn_index = 0,
          current_word = null,
          turn_deadline = null,
          reflex_starts_at = clock_timestamp() + interval '2 seconds' + random() * interval '3 seconds',
          reflex_deadline = clock_timestamp() + interval '17 seconds'
    where id = p_room_id;
  else
    select word into v_seed_word
    from public.word_dictionary
    where right(word, 1) between 'a' and 'z'
    order by gen_random_uuid()
    limit 1;
    if v_seed_word is null then
      raise exception 'Kamus kata belum berisi kata awal.' using errcode = '55000';
    end if;

    insert into public.room_word_uses (room_id, round_number, word)
    values (p_room_id, v_room.round_number, v_seed_word);
    update public.rooms
      set phase = 'word_turn',
          current_turn_index = 0,
          current_word = v_seed_word,
          turn_deadline = clock_timestamp() + interval '10 seconds',
          reflex_starts_at = null,
          reflex_deadline = null
    where id = p_room_id;
  end if;

  perform public._emit_room_event(p_room_id, 'mini_game_started');
end;
$$;

create or replace function public.create_room(
  p_display_name text,
  p_visibility text,
  p_mode text,
  p_mini_game text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_code text;
  v_name text := regexp_replace(trim(p_display_name), '\s+', ' ', 'g');
begin
  if v_user_id is null then
    raise exception 'Sesi pemain belum tersedia.' using errcode = '28000';
  end if;
  if v_name is null or char_length(v_name) not between 1 and 24 then
    raise exception 'Nama pemain harus terdiri dari 1–24 karakter.' using errcode = '22023';
  end if;
  if p_visibility is null or p_visibility not in ('public', 'private')
    or p_mode is null or p_mode not in ('loser-first', 'reverse', 'elimination', 'random')
    or p_mini_game is null or p_mini_game not in ('bomb', 'reflex', 'word-chain') then
    raise exception 'Konfigurasi room tidak valid.' using errcode = '22023';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    exit when not exists (select 1 from public.rooms where code = v_code);
  end loop;

  insert into public.rooms (code, visibility, host_id, mode, mini_game)
  values (v_code, p_visibility, v_user_id, p_mode, p_mini_game)
  returning id into v_room_id;

  insert into public.room_members (room_id, user_id, display_name)
  values (v_room_id, v_user_id, v_name);

  perform public._emit_room_event(v_room_id, 'room_created');
  return jsonb_build_object('room_id', v_room_id, 'room_code', v_code);
end;
$$;

create or replace function public.join_room(
  p_display_name text,
  p_room_id uuid default null,
  p_room_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_name text := regexp_replace(trim(p_display_name), '\s+', ' ', 'g');
  v_recent_attempts integer;
  v_pruned_count integer;
begin
  if v_user_id is null then
    raise exception 'Sesi pemain belum tersedia.' using errcode = '28000';
  end if;
  if v_name is null or char_length(v_name) not between 1 and 24 then
    raise exception 'Nama pemain harus terdiri dari 1–24 karakter.' using errcode = '22023';
  end if;
  if (p_room_id is null) = (p_room_code is null) then
    raise exception 'Pilih room publik atau masukkan kode room.' using errcode = '22023';
  end if;

  delete from public.room_join_attempts
  where user_id = v_user_id and attempted_at < clock_timestamp() - interval '10 minutes';
  insert into public.room_join_attempts (user_id) values (v_user_id);
  select count(*) into v_recent_attempts from public.room_join_attempts
  where user_id = v_user_id and attempted_at > clock_timestamp() - interval '10 minutes';
  if v_recent_attempts > 12 then
    raise exception 'Terlalu banyak percobaan bergabung. Coba lagi beberapa menit.' using errcode = '53300';
  end if;

  if p_room_id is not null then
    select * into v_room from public.rooms
    where id = p_room_id and visibility = 'public' and status = 'waiting'
    for update;
  else
    select * into v_room from public.rooms
    where code = upper(trim(p_room_code)) and status = 'waiting'
    for update;
  end if;

  if not found then
    raise exception 'Room tidak ditemukan atau sudah dimulai.' using errcode = 'P0002';
  end if;
  delete from public.room_members
  where room_id = v_room.id
    and user_id <> v_user_id
    and last_seen_at < clock_timestamp() - interval '90 seconds';
  get diagnostics v_pruned_count = row_count;
  if v_pruned_count > 0 then
    perform public._emit_room_event(v_room.id, 'stale_members_removed');
  end if;
  if exists (select 1 from public.room_members where room_id = v_room.id and user_id = v_user_id) then
    return v_room.id;
  end if;
  if (select count(*) from public.room_members where room_id = v_room.id) >= 16 then
    raise exception 'Room sudah penuh (maksimal 16 pemain).' using errcode = '54000';
  end if;
  if exists (
    select 1 from public.room_members
    where room_id = v_room.id and lower(display_name) = lower(v_name)
  ) then
    raise exception 'Nama itu sudah dipakai di room ini.' using errcode = '23505';
  end if;

  insert into public.room_members (room_id, user_id, display_name)
  values (v_room.id, v_user_id, v_name);
  perform public._emit_room_event(v_room.id, 'member_joined');
  return v_room.id;
end;
$$;

create or replace function public.list_public_rooms()
returns table (
  room_id uuid,
  player_count integer,
  mode text,
  mini_game text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.id,
         count(m.user_id) filter (
           where m.last_seen_at > statement_timestamp() - interval '90 seconds'
         )::integer,
         r.mode,
         r.mini_game,
         r.created_at
  from public.rooms r
  left join public.room_members m on m.room_id = r.id
  where r.visibility = 'public' and r.status = 'waiting'
  group by r.id
  order by r.created_at desc
  limit 50;
$$;

create or replace function public.get_room_state(p_room_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_members jsonb;
  v_used_words jsonb;
  v_reflex_responded jsonb;
begin
  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid()
  ) then
    raise exception 'Kamu bukan anggota room ini.' using errcode = '42501';
  end if;

  select * into v_room from public.rooms where id = p_room_id;
  if not found then
    raise exception 'Room tidak ditemukan.' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.user_id,
    'name', m.display_name,
    'losses', m.losses,
    'eliminated', m.eliminated,
    'joinedAt', m.joined_at
  ) order by m.joined_at, m.user_id), '[]'::jsonb)
  into v_members
  from public.room_members m
  where m.room_id = p_room_id;

  select coalesce(jsonb_agg(word order by used_at), '[]'::jsonb)
    into v_used_words
  from public.room_word_uses
  where room_id = p_room_id and round_number = v_room.round_number;

  select coalesce(jsonb_agg(user_id), '[]'::jsonb)
    into v_reflex_responded
  from public.room_reflex_responses
  where room_id = p_room_id and round_number = v_room.round_number;

  return jsonb_build_object(
    'id', v_room.id,
    'code', v_room.code,
    'visibility', v_room.visibility,
    'hostId', v_room.host_id,
    'mode', v_room.mode,
    'miniGame', v_room.mini_game,
    'status', v_room.status,
    'phase', v_room.phase,
    'round', v_room.round_number,
    'order', to_jsonb(v_room.turn_order),
    'currentTurnIndex', v_room.current_turn_index,
    'currentWord', v_room.current_word,
    'usedWords', v_used_words,
    'reflexRespondedIds', v_reflex_responded,
    'turnDeadline', v_room.turn_deadline,
    'reflexStartsAt', v_room.reflex_starts_at,
    'reflexDeadline', v_room.reflex_deadline,
    'previousLoserId', v_room.previous_loser_id,
    'loserId', v_room.loser_id,
    'winnerId', v_room.winner_id,
    'members', v_members,
    'serverNow', clock_timestamp()
  );
end;
$$;

create or replace function public.set_room_config(p_room_id uuid, p_mode text, p_mini_game text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_mode is null or p_mode not in ('loser-first', 'reverse', 'elimination', 'random')
    or p_mini_game is null or p_mini_game not in ('bomb', 'reflex', 'word-chain') then
    raise exception 'Konfigurasi room tidak valid.' using errcode = '22023';
  end if;

  update public.rooms
    set mode = p_mode, mini_game = p_mini_game
  where id = p_room_id and host_id = auth.uid() and status = 'waiting';
  if not found then
    raise exception 'Hanya host yang dapat mengubah room sebelum permainan dimulai.' using errcode = '42501';
  end if;
  perform public._emit_room_event(p_room_id, 'room_configured');
end;
$$;

create or replace function public.start_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_count integer;
  v_order uuid[];
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or v_room.host_id <> auth.uid() or v_room.status <> 'waiting' then
    raise exception 'Hanya host room yang dapat memulai permainan.' using errcode = '42501';
  end if;
  select count(*) into v_count from public.room_members where room_id = p_room_id;
  if v_count < 2 then
    raise exception 'Minimal dua pemain diperlukan.' using errcode = '22023';
  end if;

  v_order := public._build_turn_order(p_room_id, v_room.mode, '{}'::uuid[], null);
  update public.rooms
    set status = 'playing',
        round_number = 1,
        turn_order = v_order,
        previous_loser_id = null,
        loser_id = null,
        winner_id = null,
        current_turn_index = 0
  where id = p_room_id;
  perform public._begin_mini_game(p_room_id);
end;
$$;

create or replace function public.take_bomb_turn(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_user_id uuid := auth.uid();
  v_bomb_index integer;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or v_room.status <> 'playing' or v_room.phase <> 'bomb' then
    raise exception 'Roulette tidak sedang aktif.' using errcode = '55000';
  end if;
  if v_room.turn_order[v_room.current_turn_index + 1] <> v_user_id then
    raise exception 'Sekarang bukan giliranmu.' using errcode = '42501';
  end if;
  if clock_timestamp() > v_room.turn_deadline then
    perform public._finish_room_round(p_room_id, v_user_id);
    return;
  end if;

  select bomb_turn_index into v_bomb_index from public.room_secrets
  where room_id = p_room_id and round_number = v_room.round_number;
  if v_bomb_index = v_room.current_turn_index + 1 then
    perform public._finish_room_round(p_room_id, v_user_id);
  else
    update public.rooms
      set current_turn_index = (current_turn_index + 1) % cardinality(turn_order),
          turn_deadline = clock_timestamp() + interval '30 seconds'
    where id = p_room_id;
    perform public._emit_room_event(p_room_id, 'bomb_passed');
  end if;
end;
$$;

create or replace function public.resolve_bomb_timeout(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'Room tidak ditemukan.' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = auth.uid()
  ) then
    raise exception 'Kamu bukan anggota room ini.' using errcode = '42501';
  end if;
  if v_room.phase in ('round_complete', 'finished') then
    return;
  end if;
  if v_room.phase <> 'bomb' or v_room.turn_deadline > clock_timestamp() then
    raise exception 'Giliran belum melewati batas waktu.' using errcode = '55000';
  end if;
  perform public._finish_room_round(p_room_id, v_room.turn_order[v_room.current_turn_index + 1]);
end;
$$;

create or replace function public.submit_reflex(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_user_id uuid := auth.uid();
  v_active_count integer;
  v_response_count integer;
  v_loser_id uuid;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or v_room.status <> 'playing' or v_room.phase not in ('reflex_wait', 'reflex_live') then
    raise exception 'Test refleks tidak sedang aktif.' using errcode = '55000';
  end if;
  if clock_timestamp() < v_room.reflex_starts_at then
    raise exception 'Tunggu sampai sinyal muncul.' using errcode = '55000';
  end if;
  if clock_timestamp() > v_room.reflex_deadline then
    raise exception 'Waktu refleks sudah habis.' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = v_user_id and not eliminated
  ) then
    raise exception 'Pemain tidak aktif di room ini.' using errcode = '42501';
  end if;

  insert into public.room_reflex_responses (room_id, round_number, user_id, received_at)
  values (p_room_id, v_room.round_number, v_user_id, clock_timestamp())
  on conflict (room_id, round_number, user_id) do nothing;
  if not found then
    raise exception 'Responsmu sudah tercatat.' using errcode = '23505';
  end if;

  update public.rooms set phase = 'reflex_live' where id = p_room_id and phase = 'reflex_wait';
  select count(*) into v_active_count from public.room_members
  where room_id = p_room_id and not eliminated;
  select count(*) into v_response_count from public.room_reflex_responses
  where room_id = p_room_id and round_number = v_room.round_number;

  if v_response_count >= v_active_count then
    select rr.user_id into v_loser_id
    from public.room_reflex_responses rr
    join public.room_members m on m.room_id = rr.room_id and m.user_id = rr.user_id
    where rr.room_id = p_room_id and rr.round_number = v_room.round_number
    order by rr.received_at desc, m.joined_at, rr.user_id
    limit 1;
    perform public._finish_room_round(p_room_id, v_loser_id);
  else
    perform public._emit_room_event(p_room_id, 'reflex_response');
  end if;
end;
$$;

create or replace function public.resolve_reflex_timeout(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_loser_id uuid;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'Room tidak ditemukan.' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = auth.uid()
  ) then
    raise exception 'Kamu bukan anggota room ini.' using errcode = '42501';
  end if;
  if v_room.phase in ('round_complete', 'finished') then
    return;
  end if;
  if v_room.phase not in ('reflex_wait', 'reflex_live')
    or v_room.reflex_deadline > clock_timestamp() then
    raise exception 'Batas waktu refleks belum tercapai.' using errcode = '55000';
  end if;

  select m.user_id into v_loser_id
  from public.room_members m
  left join public.room_reflex_responses rr
    on rr.room_id = m.room_id and rr.round_number = v_room.round_number and rr.user_id = m.user_id
  where m.room_id = p_room_id and not m.eliminated and rr.user_id is null
  order by m.joined_at, m.user_id
  limit 1;

  if v_loser_id is null then
    select rr.user_id into v_loser_id
    from public.room_reflex_responses rr
    join public.room_members m on m.room_id = rr.room_id and m.user_id = rr.user_id
    where rr.room_id = p_room_id and rr.round_number = v_room.round_number
    order by rr.received_at desc, m.joined_at, rr.user_id
    limit 1;
  end if;

  perform public._finish_room_round(p_room_id, v_loser_id);
end;
$$;

create or replace function public.submit_word(p_room_id uuid, p_word text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_user_id uuid := auth.uid();
  v_word text := lower(trim(p_word));
  v_next_index integer;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or v_room.status <> 'playing' or v_room.phase <> 'word_turn' then
    raise exception 'Word Chain tidak sedang aktif.' using errcode = '55000';
  end if;
  if v_room.turn_order[v_room.current_turn_index + 1] <> v_user_id then
    raise exception 'Sekarang bukan giliranmu.' using errcode = '42501';
  end if;

  if clock_timestamp() > v_room.turn_deadline then
    perform public._finish_room_round(p_room_id, v_user_id);
    return;
  end if;

  if v_word !~ '^[a-z]{2,20}$'
    or not exists (select 1 from public.word_dictionary where word = v_word)
    or left(v_word, 1) <> right(v_room.current_word, 1)
    or exists (
      select 1 from public.room_word_uses
      where room_id = p_room_id and round_number = v_room.round_number and word = v_word
    ) then
    perform public._finish_room_round(p_room_id, v_user_id);
    return;
  end if;

  insert into public.room_word_uses (room_id, round_number, word, user_id)
  values (p_room_id, v_room.round_number, v_word, v_user_id);
  v_next_index := (v_room.current_turn_index + 1) % cardinality(v_room.turn_order);
  update public.rooms
    set current_word = v_word,
        current_turn_index = v_next_index,
        turn_deadline = clock_timestamp() + interval '10 seconds'
  where id = p_room_id;
  perform public._emit_room_event(p_room_id, 'word_submitted');
end;
$$;

create or replace function public.resolve_word_timeout(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'Room tidak ditemukan.' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = auth.uid()
  ) then
    raise exception 'Kamu bukan anggota room ini.' using errcode = '42501';
  end if;
  if v_room.phase in ('round_complete', 'finished') then
    return;
  end if;
  if v_room.phase <> 'word_turn' or v_room.turn_deadline > clock_timestamp() then
    raise exception 'Batas waktu menjawab belum tercapai.' using errcode = '55000';
  end if;
  perform public._finish_room_round(p_room_id, v_room.turn_order[v_room.current_turn_index + 1]);
end;
$$;

create or replace function public.start_next_round(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_active_count integer;
  v_winner_id uuid;
  v_order uuid[];
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or v_room.host_id <> auth.uid()
    or v_room.status <> 'playing' or v_room.phase <> 'round_complete' then
    raise exception 'Hanya host yang dapat memulai ronde berikutnya.' using errcode = '42501';
  end if;

  select count(*), (array_agg(user_id order by joined_at, user_id))[1]
    into v_active_count, v_winner_id
  from public.room_members where room_id = p_room_id and not eliminated;
  if v_active_count <= 1 then
    update public.rooms
      set status = 'finished', phase = 'finished', winner_id = v_winner_id, turn_order = '{}'
    where id = p_room_id;
    perform public._emit_room_event(p_room_id, 'game_finished');
    return;
  end if;

  v_order := public._build_turn_order(
    p_room_id, v_room.mode, v_room.turn_order, v_room.previous_loser_id
  );
  update public.rooms
    set round_number = round_number + 1,
        turn_order = v_order,
        loser_id = null,
        winner_id = null,
        current_turn_index = 0
  where id = p_room_id;
  perform public._begin_mini_game(p_room_id);
end;
$$;

create or replace function public.reset_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or v_room.host_id <> auth.uid() then
    raise exception 'Hanya host yang dapat mereset room.' using errcode = '42501';
  end if;

  update public.room_members set losses = 0, eliminated = false where room_id = p_room_id;
  delete from public.room_secrets where room_id = p_room_id;
  delete from public.room_reflex_responses where room_id = p_room_id;
  delete from public.room_word_uses where room_id = p_room_id;
  update public.rooms
    set status = 'waiting',
        phase = 'lobby',
        round_number = 0,
        turn_order = '{}',
        current_turn_index = 0,
        current_word = null,
        turn_deadline = null,
        reflex_starts_at = null,
        reflex_deadline = null,
        previous_loser_id = null,
        loser_id = null,
        winner_id = null
  where id = p_room_id;
  perform public._emit_room_event(p_room_id, 'room_reset');
end;
$$;

create or replace function public.leave_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_user_id uuid := auth.uid();
  v_new_host uuid;
  v_remaining integer;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or not exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = v_user_id
  ) then
    raise exception 'Kamu bukan anggota room ini.' using errcode = '42501';
  end if;
  if v_room.status = 'playing' and v_room.phase not in ('round_complete', 'finished') then
    raise exception 'Selesaikan mini-game aktif sebelum keluar dari room.' using errcode = '55000';
  end if;

  delete from public.room_members where room_id = p_room_id and user_id = v_user_id;
  select count(*) into v_remaining from public.room_members where room_id = p_room_id;
  if v_remaining = 0 then
    delete from public.rooms where id = p_room_id;
    return;
  end if;

  if v_room.host_id = v_user_id then
    select user_id into v_new_host from public.room_members
    where room_id = p_room_id order by joined_at, user_id limit 1;
    update public.rooms set host_id = v_new_host where id = p_room_id;
  end if;

  if v_room.status = 'playing' then
    select count(*), (array_agg(user_id order by joined_at, user_id))[1]
      into v_remaining, v_new_host
    from public.room_members where room_id = p_room_id and not eliminated;
    if v_remaining <= 1 then
      update public.rooms
        set status = 'finished', phase = 'finished', winner_id = v_new_host, turn_order = '{}'
      where id = p_room_id;
    end if;
  end if;
  perform public._emit_room_event(p_room_id, 'member_left');
end;
$$;

create or replace function public.heartbeat_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
  v_next_host uuid;
  v_pruned_count integer;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'Room tidak ditemukan.' using errcode = 'P0002';
  end if;

  update public.room_members
    set last_seen_at = clock_timestamp()
  where room_id = p_room_id and user_id = auth.uid();
  if not found then
    raise exception 'Kamu bukan anggota room ini.' using errcode = '42501';
  end if;

  if v_room.status = 'waiting' then
    delete from public.room_members
    where room_id = p_room_id
      and user_id <> auth.uid()
      and last_seen_at < clock_timestamp() - interval '90 seconds';
    get diagnostics v_pruned_count = row_count;
    if v_pruned_count > 0 then
      perform public._emit_room_event(p_room_id, 'stale_members_removed');
    end if;
  end if;

  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = v_room.host_id
      and last_seen_at > clock_timestamp() - interval '45 seconds'
  ) then
    select user_id into v_next_host from public.room_members
    where room_id = p_room_id and user_id <> v_room.host_id
      and last_seen_at > clock_timestamp() - interval '45 seconds'
    order by joined_at, user_id
    limit 1;
    if v_next_host is not null then
      update public.rooms set host_id = v_next_host where id = p_room_id;
      perform public._emit_room_event(p_room_id, 'host_changed');
    end if;
  end if;
end;
$$;

revoke all on function public._emit_room_event(uuid, text),
  public._random_index(integer),
  public._build_turn_order(uuid, text, uuid[], uuid),
  public._finish_room_round(uuid, uuid),
  public._begin_mini_game(uuid)
  from public, anon, authenticated;

revoke all on function public.create_room(text, text, text, text),
  public.join_room(text, uuid, text),
  public.list_public_rooms(),
  public.get_room_state(uuid),
  public.set_room_config(uuid, text, text),
  public.start_room(uuid),
  public.take_bomb_turn(uuid),
  public.resolve_bomb_timeout(uuid),
  public.submit_reflex(uuid),
  public.resolve_reflex_timeout(uuid),
  public.submit_word(uuid, text),
  public.resolve_word_timeout(uuid),
  public.start_next_round(uuid),
  public.reset_room(uuid),
  public.leave_room(uuid),
  public.heartbeat_room(uuid)
  from public, anon, authenticated;

grant execute on function public.create_room(text, text, text, text),
  public.join_room(text, uuid, text),
  public.list_public_rooms(),
  public.get_room_state(uuid),
  public.set_room_config(uuid, text, text),
  public.start_room(uuid),
  public.take_bomb_turn(uuid),
  public.resolve_bomb_timeout(uuid),
  public.submit_reflex(uuid),
  public.resolve_reflex_timeout(uuid),
  public.submit_word(uuid, text),
  public.resolve_word_timeout(uuid),
  public.start_next_round(uuid),
  public.reset_room(uuid),
  public.leave_room(uuid),
  public.heartbeat_room(uuid)
  to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_events'
  ) then
    alter publication supabase_realtime add table public.room_events;
  end if;
end
$$;
