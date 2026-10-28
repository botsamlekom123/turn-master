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
  v_next_order uuid[];
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
    else
      v_next_order := public._build_turn_order(
        p_room_id, v_room.mode, v_room.turn_order, p_loser_id
      );
      update public.rooms
        set round_number = round_number + 1,
            turn_order = v_next_order,
            loser_id = null,
            current_turn_index = 0
      where id = p_room_id;
      perform public._begin_mini_game(p_room_id);
    end if;
  end if;

  perform public._emit_room_event(p_room_id, 'round_complete');
end;
$$;
