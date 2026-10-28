import type { GameMode } from "../game";
import type { MiniGame } from "../rooms/types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          visibility: "public" | "private";
          host_id: string;
          mode: GameMode;
          mini_game: MiniGame;
          status: "waiting" | "playing" | "finished";
          phase: string;
          round_number: number;
          turn_order: string[];
          current_turn_index: number;
          current_word: string | null;
          turn_deadline: string | null;
          reflex_starts_at: string | null;
          reflex_deadline: string | null;
          previous_loser_id: string | null;
          loser_id: string | null;
          winner_id: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      room_members: {
        Row: {
          room_id: string;
          user_id: string;
          display_name: string;
          losses: number;
          eliminated: boolean;
          joined_at: string;
          last_seen_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      room_events: {
        Row: {
          id: number;
          room_id: string;
          event_type: string;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_room: {
        Args: {
          p_display_name: string;
          p_visibility: "public" | "private";
          p_mode: GameMode;
          p_mini_game: MiniGame;
        };
        Returns: Json;
      };
      join_room: {
        Args: {
          p_display_name: string;
          p_room_id: string | null;
          p_room_code: string | null;
        };
        Returns: string;
      };
      list_public_rooms: {
        Args: Record<string, never>;
        Returns: {
          room_id: string;
          player_count: number;
          mode: GameMode;
          mini_game: MiniGame;
          created_at: string;
        }[];
      };
      get_room_state: {
        Args: { p_room_id: string };
        Returns: Json;
      };
      set_room_config: {
        Args: { p_room_id: string; p_mode: GameMode; p_mini_game: MiniGame };
        Returns: undefined;
      };
      start_room: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      take_bomb_turn: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      resolve_bomb_timeout: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      submit_reflex: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      resolve_reflex_timeout: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      submit_word: {
        Args: { p_room_id: string; p_word: string };
        Returns: undefined;
      };
      resolve_word_timeout: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      start_next_round: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      reset_room: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      return_elimination_to_lobby: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      leave_room: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      heartbeat_room: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
