import type { GameMode } from "../game";

export type MiniGame = "bomb" | "reflex" | "word-chain";
export type RoomVisibility = "public" | "private";
export type RoomStatus = "waiting" | "playing" | "finished";
export type RoomPhase =
  | "lobby"
  | "bomb"
  | "reflex_wait"
  | "reflex_live"
  | "word_turn"
  | "round_complete"
  | "finished";

export type RoomMember = {
  id: string;
  name: string;
  losses: number;
  eliminated: boolean;
  joinedAt: string;
};

export type RoomState = {
  id: string;
  code: string;
  visibility: RoomVisibility;
  hostId: string;
  mode: GameMode;
  miniGame: MiniGame;
  status: RoomStatus;
  phase: RoomPhase;
  round: number;
  order: string[];
  currentTurnIndex: number;
  currentWord: string | null;
  usedWords: string[];
  reflexRespondedIds: string[];
  turnDeadline: string | null;
  reflexStartsAt: string | null;
  reflexDeadline: string | null;
  previousLoserId: string | null;
  loserId: string | null;
  winnerId: string | null;
  members: RoomMember[];
  serverNow: string;
};

export type PublicRoom = {
  roomId: string;
  playerCount: number;
  mode: GameMode;
  miniGame: MiniGame;
  createdAt: string;
};

export const MINI_GAMES: { value: MiniGame; label: string; description: string }[] = [
  {
    value: "bomb",
    label: "Bom Waktu / Roulette",
    description: "Tekan tombol bergantian. Satu giliran memicu bom!",
  },
  {
    value: "reflex",
    label: "Test Refleks",
    description: "Tekan tombol saat sinyal muncul. Respons paling lambat kalah.",
  },
  {
    value: "word-chain",
    label: "Tebak Kata Cepat",
    description: "Rangkai kata dari huruf terakhir sebelumnya. Jawab dalam 10 detik.",
  },
];
