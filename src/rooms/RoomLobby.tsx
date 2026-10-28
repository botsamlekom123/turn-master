import { useCallback, useEffect, useState, type FormEvent } from "react";
import { GAME_MODES, type GameMode } from "../game";
import { MINI_GAMES, type MiniGame, type PublicRoom } from "./types";
import { createRoom, joinRoom, listPublicRooms } from "./roomService";

type Props = {
  userId: string;
  onJoined: (roomId: string) => void;
};

function RoomLobby({ userId, onJoined }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [mode, setMode] = useState<GameMode>("loser-first");
  const [miniGame, setMiniGame] = useState<MiniGame>("bomb");
  const [roomCode, setRoomCode] = useState("");
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [roomListError, setRoomListError] = useState("");

  const refreshRooms = useCallback(async () => {
    try {
      const publicRooms = await listPublicRooms();
      setRooms(publicRooms);
      setRoomListError("");
    } catch (reason) {
      setRoomListError(
        reason instanceof Error ? reason.message : "Daftar room publik tidak dapat dimuat.",
      );
    }
  }, []);

  useEffect(() => {
    void refreshRooms();
    const timer = window.setInterval(() => void refreshRooms(), 5000);
    return () => window.clearInterval(timer);
  }, [refreshRooms]);

  function validateName(): string | null {
    const normalized = displayName.trim().replace(/\s+/g, " ");
    if (normalized.length < 1 || normalized.length > 24) {
      return "Nama harus terdiri dari 1–24 karakter.";
    }
    setDisplayName(normalized);
    return null;
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nameError = validateName();
    if (nameError) {
      setError(nameError);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const room = await createRoom(displayName.trim(), visibility, mode, miniGame);
      onJoined(room.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Room tidak dapat dibuat.");
    } finally {
      setBusy(false);
    }
  }

  async function joinByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nameError = validateName();
    if (nameError) {
      setError(nameError);
      return;
    }
    if (!roomCode.trim()) {
      setError("Masukkan kode room.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const id = await joinRoom({ displayName: displayName.trim(), roomCode: roomCode.trim() });
      onJoined(id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tidak dapat bergabung ke room.");
    } finally {
      setBusy(false);
    }
  }

  async function joinPublicRoom(roomId: string) {
    const nameError = validateName();
    if (nameError) {
      setError(nameError);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const id = await joinRoom({ displayName: displayName.trim(), roomId });
      onJoined(id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tidak dapat bergabung ke room.");
      await refreshRooms();
    } finally {
      setBusy(false);
    }
  }

  const currentMiniGame = MINI_GAMES.find((game) => game.value === miniGame) ?? MINI_GAMES[0];

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#" aria-label="Turn Master beranda">
          <span className="brand-mark" aria-hidden="true">↻</span>
          <span>TURN<span className="brand-accent">MASTER</span></span>
        </a>
        <span className="header-tag">MULTIPLAYER PARTY GAME</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" /> ROOM UP. GAME ON.</p>
          <h1>Bring your crew.<br /><span>Let fate decide.</span></h1>
          <p className="hero-description">
            Buat room, bagikan kode, dan biarkan mini-game menentukan siapa yang paling apes.
          </p>
        </div>
        <div className="hero-doodle" aria-hidden="true">✳</div>
      </section>

      <div className="lobby-identity">
        <label htmlFor="display-name">NAMA PEMAIN</label>
        <input
          id="display-name"
          value={displayName}
          maxLength={24}
          autoComplete="nickname"
          onChange={(event) => {
            setDisplayName(event.target.value);
            setError("");
          }}
          placeholder="Nama yang dilihat temanmu"
        />
        <span className="identity-note">ID sesi: {userId.slice(0, 8)}</span>
      </div>

      {error && <div className="notice" role="alert">{error}</div>}

      <div className="lobby-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">01 / HOST A GAME</p>
              <h2>Buat room</h2>
            </div>
            <span className="trophy" aria-hidden="true">✳</span>
          </div>

          <form onSubmit={create}>
            <div className="segmented-control" aria-label="Visibilitas room">
              <button
                type="button"
                className={visibility === "public" ? "is-selected" : ""}
                onClick={() => setVisibility("public")}
              >
                Public
              </button>
              <button
                type="button"
                className={visibility === "private" ? "is-selected" : ""}
                onClick={() => setVisibility("private")}
              >
                Private
              </button>
            </div>
            <p className="helper-text">
              {visibility === "public"
                ? "Room tampil di daftar publik dan dapat dimasuki siapa saja."
                : "Room hanya dapat dimasuki menggunakan kode undangan."}
            </p>

            <div className="form-field">
              <label htmlFor="host-mode">MODE URUTAN GILIRAN</label>
              <select id="host-mode" value={mode} onChange={(event) => setMode(event.target.value as GameMode)}>
                {GAME_MODES.map((gameMode) => (
                  <option key={gameMode.value} value={gameMode.value}>{gameMode.label}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="host-mini-game">MINI-GAME</label>
              <select
                id="host-mini-game"
                value={miniGame}
                onChange={(event) => setMiniGame(event.target.value as MiniGame)}
              >
                {MINI_GAMES.map((game) => (
                  <option key={game.value} value={game.value}>{game.label}</option>
                ))}
              </select>
              <p className="helper-text">{currentMiniGame.description}</p>
            </div>

            <button className="button button-primary full-button" type="submit" disabled={busy}>
              {busy ? "Menyiapkan room…" : "Buat room"} <span aria-hidden="true">↗</span>
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">02 / JOIN THE PARTY</p>
              <h2>Gabung room</h2>
            </div>
            <span className="count-pill">{rooms.length} room publik</span>
          </div>

          <form className="join-code-form" onSubmit={joinByCode}>
            <label htmlFor="room-code">PUNYA KODE PRIVATE?</label>
            <div className="join-code-controls">
              <input
                id="room-code"
                value={roomCode}
                maxLength={12}
                autoCapitalize="characters"
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                placeholder="CONTOH: A1B2C3D4E5F6"
              />
              <button className="button button-secondary" type="submit" disabled={busy}>Gabung</button>
            </div>
          </form>

          <div className="public-room-heading">
            <span>ROOM PUBLIK</span>
            <button className="text-button" type="button" onClick={() => void refreshRooms()}>↻ Segarkan</button>
          </div>
          {roomListError && <p className="inline-error" role="status">{roomListError}</p>}
          {rooms.length === 0 ? (
            <div className="empty-state public-empty">
              <p>Belum ada room publik yang menunggu.</p>
              <span>Buat room baru atau gabung dengan kode undangan.</span>
            </div>
          ) : (
            <ul className="public-room-list">
              {rooms.map((room) => (
                <li className="public-room" key={room.roomId}>
                  <div className="public-room-info">
                    <strong>{MINI_GAMES.find((game) => game.value === room.miniGame)?.label}</strong>
                    <span>{room.playerCount} pemain · {GAME_MODES.find((item) => item.value === room.mode)?.label}</span>
                  </div>
                  <button
                    className="button button-secondary compact-button"
                    type="button"
                    onClick={() => void joinPublicRoom(room.roomId)}
                    disabled={busy || room.playerCount >= 16}
                  >
                    {room.playerCount >= 16 ? "Penuh" : "Gabung"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="site-footer">
        <span>BUAT MALAM YANG LEBIH SERU.</span>
        <span>FAIR PLAY (OR NOT). ✦</span>
      </footer>
    </main>
  );
}

export default RoomLobby;
