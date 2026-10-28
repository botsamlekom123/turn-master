import { getSupabaseClient } from "../backend/supabase";
import { GAME_MODES, type GameMode } from "../game";
import { MINI_GAMES, type MiniGame, type PublicRoom, type RoomMember, type RoomState } from "./types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: JsonRecord, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`Data room tidak valid: ${key}.`);
  }
  return value;
}

function nullableString(record: JsonRecord, key: string): string | null {
  const value = record[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Data room tidak valid: ${key}.`);
  }
  return value;
}

function parseGameMode(value: unknown): GameMode {
  if (typeof value !== "string" || !GAME_MODES.some((mode) => mode.value === value)) {
    throw new Error("Data room berisi mode permainan yang tidak dikenal.");
  }
  return value as GameMode;
}

function parseMiniGame(value: unknown): MiniGame {
  if (typeof value !== "string" || !MINI_GAMES.some((game) => game.value === value)) {
    throw new Error("Data room berisi mini-game yang tidak dikenal.");
  }
  return value as MiniGame;
}

function parseRoomState(value: unknown): RoomState {
  if (
    !isRecord(value) ||
    !Array.isArray(value.members) ||
    !Array.isArray(value.order) ||
    !Array.isArray(value.usedWords) ||
    !Array.isArray(value.reflexRespondedIds)
  ) {
    throw new Error("Server mengembalikan state room yang tidak valid.");
  }

  const members: RoomMember[] = value.members.map((member): RoomMember => {
    if (
      !isRecord(member) ||
      typeof member.id !== "string" ||
      typeof member.name !== "string" ||
      typeof member.losses !== "number" ||
      typeof member.eliminated !== "boolean" ||
      typeof member.joinedAt !== "string"
    ) {
      throw new Error("Server mengembalikan data pemain yang tidak valid.");
    }

    return {
      id: member.id,
      name: member.name,
      losses: member.losses,
      eliminated: member.eliminated,
      joinedAt: member.joinedAt,
    };
  });

  const status = requiredString(value, "status");
  const phase = requiredString(value, "phase");
  const visibility = requiredString(value, "visibility");
  const round = value.round;
  const currentTurnIndex = value.currentTurnIndex;
  if (
    (status !== "waiting" && status !== "playing" && status !== "finished") ||
    !["lobby", "bomb", "reflex_wait", "reflex_live", "word_turn", "round_complete", "finished"].includes(phase) ||
    (visibility !== "public" && visibility !== "private") ||
    typeof round !== "number" ||
    typeof currentTurnIndex !== "number" ||
    !value.order.every((id) => typeof id === "string") ||
    !value.usedWords.every((word) => typeof word === "string") ||
    !value.reflexRespondedIds.every((id) => typeof id === "string")
  ) {
    throw new Error("Server mengembalikan state room yang tidak valid.");
  }

  return {
    id: requiredString(value, "id"),
    code: requiredString(value, "code"),
    visibility,
    hostId: requiredString(value, "hostId"),
    mode: parseGameMode(value.mode),
    miniGame: parseMiniGame(value.miniGame),
    status,
    phase: phase as RoomState["phase"],
    round,
    order: value.order,
    currentTurnIndex,
    currentWord: nullableString(value, "currentWord"),
    usedWords: value.usedWords,
    reflexRespondedIds: value.reflexRespondedIds,
    turnDeadline: nullableString(value, "turnDeadline"),
    reflexStartsAt: nullableString(value, "reflexStartsAt"),
    reflexDeadline: nullableString(value, "reflexDeadline"),
    previousLoserId: nullableString(value, "previousLoserId"),
    loserId: nullableString(value, "loserId"),
    winnerId: nullableString(value, "winnerId"),
    members,
    serverNow: requiredString(value, "serverNow"),
  };
}

function throwOnError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function createRoom(
  displayName: string,
  visibility: "public" | "private",
  mode: GameMode,
  miniGame: MiniGame,
): Promise<{ id: string; code: string }> {
  const { data, error } = await getSupabaseClient().rpc("create_room", {
    p_display_name: displayName,
    p_visibility: visibility,
    p_mode: mode,
    p_mini_game: miniGame,
  });
  throwOnError(error);
  if (!isRecord(data) || typeof data.room_id !== "string" || typeof data.room_code !== "string") {
    throw new Error("Server tidak mengembalikan detail room yang valid.");
  }
  return { id: data.room_id, code: data.room_code };
}

export async function joinRoom(input: {
  displayName: string;
  roomId?: string;
  roomCode?: string;
}): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc("join_room", {
    p_display_name: input.displayName,
    p_room_id: input.roomId ?? null,
    p_room_code: input.roomCode ?? null,
  });
  throwOnError(error);
  if (typeof data !== "string") {
    throw new Error("Server tidak mengembalikan room yang valid.");
  }
  return data;
}

export async function getRoomState(roomId: string): Promise<RoomState> {
  const { data, error } = await getSupabaseClient().rpc("get_room_state", { p_room_id: roomId });
  throwOnError(error);
  return parseRoomState(data);
}

export async function listPublicRooms(): Promise<PublicRoom[]> {
  const { data, error } = await getSupabaseClient().rpc("list_public_rooms");
  throwOnError(error);
  if (!data) {
    throw new Error("Daftar room publik tidak tersedia.");
  }
  return data.map((room) => ({
    roomId: room.room_id,
    playerCount: room.player_count,
    mode: parseGameMode(room.mode),
    miniGame: parseMiniGame(room.mini_game),
    createdAt: room.created_at,
  }));
}

export async function updateRoomConfig(roomId: string, mode: GameMode, miniGame: MiniGame): Promise<void> {
  const { error } = await getSupabaseClient().rpc("set_room_config", {
    p_room_id: roomId,
    p_mode: mode,
    p_mini_game: miniGame,
  });
  throwOnError(error);
}

export async function startRoom(roomId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("start_room", { p_room_id: roomId });
  throwOnError(error);
}

export async function takeBombTurn(roomId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("take_bomb_turn", { p_room_id: roomId });
  throwOnError(error);
}

export async function resolveBombTimeout(roomId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("resolve_bomb_timeout", { p_room_id: roomId });
  throwOnError(error);
}

export async function submitReflex(roomId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("submit_reflex", { p_room_id: roomId });
  throwOnError(error);
}

export async function resolveReflexTimeout(roomId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("resolve_reflex_timeout", { p_room_id: roomId });
  throwOnError(error);
}

export async function submitWord(roomId: string, word: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("submit_word", {
    p_room_id: roomId,
    p_word: word,
  });
  throwOnError(error);
}

export async function resolveWordTimeout(roomId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("resolve_word_timeout", { p_room_id: roomId });
  throwOnError(error);
}

export async function startNextRound(roomId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("start_next_round", { p_room_id: roomId });
  throwOnError(error);
}

export async function resetRoom(roomId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("reset_room", { p_room_id: roomId });
  throwOnError(error);
}

export async function returnEliminationToLobby(roomId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("return_elimination_to_lobby", {
    p_room_id: roomId,
  });
  throwOnError(error);
}

export async function leaveRoom(roomId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("leave_room", { p_room_id: roomId });
  throwOnError(error);
}

export async function heartbeatRoom(roomId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("heartbeat_room", { p_room_id: roomId });
  throwOnError(error);
}

export function subscribeToRoom(roomId: string, onChange: () => void): () => void {
  const channel = getSupabaseClient()
    .channel(`room-events-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "room_events",
        filter: `room_id=eq.${roomId}`,
      },
      onChange,
    )
    .subscribe();

  return () => {
    void getSupabaseClient().removeChannel(channel);
  };
}
