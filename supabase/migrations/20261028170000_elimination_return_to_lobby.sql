create or replace function public.return_elimination_to_lobby(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms%rowtype;
begin
  select * into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found or v_room.host_id <> auth.uid() then
    raise exception 'Hanya host room yang dapat kembali ke lobby.' using errcode = '42501';
  end if;

  if v_room.status <> 'finished' or v_room.phase <> 'finished' or v_room.mode <> 'elimination' then
    raise exception 'Hanya permainan Elimination yang selesai yang dapat kembali ke lobby.'
      using errcode = '55000';
  end if;

  update public.room_members
  set eliminated = false
  where room_id = p_room_id;

  delete from public.room_secrets where room_id = p_room_id;
  delete from public.room_reflex_responses where room_id = p_room_id;
  delete from public.room_word_uses where room_id = p_room_id;

  update public.rooms
  set status = 'waiting',
      phase = 'lobby',
      turn_order = '{}',
      current_turn_index = 0,
      current_word = null,
      turn_deadline = null,
      reflex_starts_at = null,
      reflex_deadline = null
  where id = p_room_id;

  perform public._emit_room_event(p_room_id, 'elimination_returned_to_lobby');
end;
$$;

revoke all on function public.return_elimination_to_lobby(uuid)
  from public, anon, authenticated;
grant execute on function public.return_elimination_to_lobby(uuid)
  to authenticated;
