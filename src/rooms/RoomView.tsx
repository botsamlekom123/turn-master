import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_MODES, type GameMode } from "../game";
import BombRoulette from "../minigames/BombRoulette";
import ReflexTest from "../minigames/ReflexTest";
import WordChain from "../minigames/WordChain";
import {
  getRoomState,
  heartbeatRoom,
  leaveRoom,
  resetRoom,
  returnEliminationToLobby,
  resolveBombTimeout,
  resolveReflexTimeout,
  resolveWordTimeout,
  startNextRound,
  startRoom,
  subscribeToRoom,
  submitReflex,
  submitWord,
  takeBombTurn,
  updateRoomConfig,
} from "./roomService";
import { MINI_GAMES, type MiniGame, type RoomState } from "./types";

type Props = {
  roomId: string;
  userId: string;
  onLeave: () => void;
};

function RoomView({ roomId, userId, onLeave }: Props) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      const state = await getRoomState(roomId);
      if (requestId === latestRequest.current) {
        setRoom(state);
        setServerOffsetMs(Date.now() - Date.parse(state.serverNow));
        setError("");
      }
    } catch (reason) {
      if (requestId === latestRequest.current) {
        setError(reason instanceof Error ? reason.message : "Room tidak dapat dimuat.");
      }
    } finally {
      if (requestId === latestRequest.current) {
        setLoading(false);
      }
    }
  }, [roomId]);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeToRoom(roomId, () => void refresh());
    const snapshotPoll = window.setInterval(() => void refresh(), 5000);
    void heartbeatRoom(roomId)
      .then(refresh)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Koneksi room terputus.");
      });
    const heartbeat = window.setInterval(() => {
      void heartbeatRoom(roomId)
        .then(refresh)
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : "Koneksi room terputus.");
        });
    }, 20_000);
    return () => {
      unsubscribe();
      window.clearInterval(snapshotPoll);
      window.clearInterval(heartbeat);
    };
  }, [refresh, roomId]);

  const perform = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      if (busy) {
        return false;
      }
      setBusy(true);
      setError("");
      setNotice("");
      try {
        await action();
        await refresh();
        return true;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Aksi tidak dapat diselesaikan.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh],
  );

  async function copyRoomCode() {
    if (!room) {
      return;
    }
    try {
      await navigator.clipboard.writeText(room.code);
      setNotice("Kode room berhasil disalin.");
    } catch {
      setError("Browser tidak mengizinkan akses clipboard. Salin kode secara manual.");
    }
  }

  async function exitRoom() {
    if (
      room?.status === "playing" &&
      room.phase !== "round_complete" &&
      room.phase !== "finished"
    ) {
      setError("Selesaikan mini-game aktif sebelum keluar dari room.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await leaveRoom(roomId);
      onLeave();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tidak dapat keluar dari room.");
      setBusy(false);
    }
  }

  if (loading && !room) {
    return (
      <main className="app-shell centered-state">
        <div className="loading-mark" aria-hidden="true">↻</div>
        <p>Menghubungkan ke room…</p>
        {error && <div className="notice" role="alert">{error}</div>}
      </main>
    );
  }

  if (!room) {
    return (
      <main className="app-shell centered-state">
        <div className="empty-icon" aria-hidden="true">!</div>
        <h2>Room tidak dapat dibuka</h2>
        <p className="helper-text">{error || "Sesi room tidak tersedia."}</p>
        <button className="button button-secondary" type="button" onClick={onLeave}>Kembali ke lobby</button>
      </main>
    );
  }

  const isHost = room.hostId === userId;
  const me = room.members.find((member) => member.id === userId);
  const currentPlayerId = room.order[room.currentTurnIndex];
  const loser = room.members.find((member) => member.id === room.loserId);
  const winner = room.members.find((member) => member.id === room.winnerId);
  const activeOrder = new Set(room.order);
  const displayedMembers =
    room.status === "playing" && room.order.length > 0
      ? [
          ...room.order
            .map((id) => room.members.find((member) => member.id === id))
            .filter((member) => member !== undefined),
          ...room.members.filter((member) => !activeOrder.has(member.id)),
        ]
      : room.members;
  const currentGame = MINI_GAMES.find((game) => game.value === room.miniGame) ?? MINI_GAMES[0];
  const isRoundActive =
    room.status === "playing" &&
    room.phase !== "round_complete" &&
    room.phase !== "finished";
  const isScoreboard =
    room.status === "finished" ||
    (room.status === "playing" &&
      (room.phase === "round_complete" || room.phase === "finished"));
  const hasEliminationResult = room.status === "waiting" && room.winnerId !== null;

  const performBombTurn = async () => {
    await perform(() => takeBombTurn(roomId));
  };
  const performBombTimeout = () => perform(() => resolveBombTimeout(roomId));
  const performReflex = () => perform(() => submitReflex(roomId));
  const performReflexTimeout = () => perform(() => resolveReflexTimeout(roomId));
  const performWordTimeout = () => perform(() => resolveWordTimeout(roomId));
  const performWord = (word: string) => perform(() => submitWord(roomId, word));

  return (
    <main className={`app-shell${room.status === "playing" || isScoreboard ? " room-experience" : ""}${isScoreboard ? " is-scoreboard" : ""}`}>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Turn Master beranda">
          <span className="brand-mark" aria-hidden="true">↻</span>
          <span>TURN<span className="brand-accent">MASTER</span></span>
        </a>
        {(room.status === "playing" || isScoreboard) && (
          <>
            <div className="experience-header-info" aria-live="polite">
              <span>{isScoreboard ? "HASIL RONDE" : "SEDANG BERMAIN"}</span>
              <strong>{isScoreboard ? `Ronde ${room.round} selesai` : `${currentGame.label} · Ronde ${room.round}`}</strong>
            </div>
            <button className="experience-room-code" type="button" onClick={() => void copyRoomCode()}>
              ROOM <strong>{room.code}</strong>
            </button>
          </>
        )}
        <div className="room-header-actions">
          {isHost && room.status === "playing" && (
            <button
              className="text-button reset-room-header"
              type="button"
              onClick={() => {
                if (window.confirm("Reset room sekarang? Skor dan ronde akan dihapus.")) {
                  void perform(() => resetRoom(roomId));
                }
              }}
              disabled={busy}
            >
              Reset room
            </button>
          )}
          <button className="text-button leave-button" type="button" onClick={() => void exitRoom()} disabled={busy}>
            Keluar room
          </button>
        </div>
      </header>

      <section className="room-banner">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {room.visibility === "public" ? "PUBLIC ROOM" : "PRIVATE ROOM"}</p>
          <h1>{room.status === "waiting" ? "Lobby." : room.status === "finished" ? "Game over." : `Ronde ${room.round}.`}</h1>
          <p className="hero-description">
            {room.status === "waiting"
              ? "Undang teman satu geng. Host mengatur game setelah semua pemain siap."
              : currentGame.description}
          </p>
        </div>
        <button className="room-code-card" type="button" onClick={() => void copyRoomCode()}>
          <span>KODE ROOM · KLIK UNTUK MENYALIN</span>
          <strong>{room.code}</strong>
        </button>
      </section>

      {error && <div className="notice" role="alert">{error}</div>}
      {notice && <div className="notice notice-success" role="status">{notice}</div>}
      {me?.eliminated && room.status === "playing" && (
        <div className="notice notice-warning" role="status">
          Kamu tereliminasi. Pertandingan tetap berjalan—kamu bisa menonton pemain yang tersisa sampai ada pemenang.
        </div>
      )}

      <div className="room-layout">
        <section className="panel room-players-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">01 / THE CREW</p>
              <h2>Pemain <span className="subtle-count">{room.members.length}/16</span></h2>
            </div>
            {room.status === "playing" && <span className="round-pill"><span /> LIVE</span>}
          </div>

          <ul className="room-member-list">
            {displayedMembers.map((member, index) => {
              const isTurn = isRoundActive && currentPlayerId === member.id;
              const isRoundLoser = room.phase === "round_complete" && room.loserId === member.id;
              const expression = member.eliminated
                ? "👻"
                : isRoundLoser
                  ? "😵"
                  : isTurn || (room.phase === "reflex_live" && !member.eliminated)
                    ? "😬"
                    : "😎";
              return (
                <li
                  className={`room-member${isTurn ? " is-current-turn" : ""}${member.eliminated ? " is-eliminated" : ""}${isRoundLoser ? " is-round-loser" : ""}`}
                  key={member.id}
                >
                  <span className="leader-rank">{String(index + 1).padStart(2, "0")}</span>
                  <span className="avatar" aria-hidden="true" key={`${member.id}-${expression}`}>{expression}</span>
                  <span className="player-name">
                    {member.name}{member.id === userId ? <small> · KAMU</small> : ""}
                  </span>
                  {member.id === room.hostId && <span className="host-tag">HOST</span>}
                  {isTurn && <span className="turn-tag">GILIRAN</span>}
                  {member.eliminated && <span className="eliminated-tag">OUT</span>}
                  <span className="loss-count">{member.losses}<small>×</small></span>
                </li>
              );
            })}
          </ul>

          {room.status === "waiting" && isHost && (
            <div className="host-settings">
              <div className="form-field">
                <label htmlFor="room-mode">MODE URUTAN</label>
                <select
                  id="room-mode"
                  value={room.mode}
                  disabled={busy}
                  onChange={(event) =>
                    void perform(() =>
                      updateRoomConfig(roomId, event.target.value as GameMode, room.miniGame),
                    )
                  }
                >
                  {GAME_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>{mode.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="room-minigame">MINI-GAME</label>
                <select
                  id="room-minigame"
                  value={room.miniGame}
                  disabled={busy}
                  onChange={(event) =>
                    void perform(() =>
                      updateRoomConfig(roomId, room.mode, event.target.value as MiniGame),
                    )
                  }
                >
                  {MINI_GAMES.map((game) => (
                    <option key={game.value} value={game.value}>{game.label}</option>
                  ))}
                </select>
              </div>
              <p className="helper-text">{currentGame.description}</p>
              <button
                className="button button-primary full-button"
                type="button"
                onClick={() => void perform(() => startRoom(roomId))}
                disabled={busy || room.members.length < 2}
              >
                {room.members.length < 2 ? "Butuh minimal 2 pemain" : "Mulai permainan"} <span aria-hidden="true">↗</span>
              </button>
            </div>
          )}
          {room.status === "waiting" && !isHost && (
            <p className="waiting-host"><span className="live-dot" /> Menunggu host memulai permainan…</p>
          )}
        </section>

        <section className="panel room-game-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">02 / MINI-GAME</p>
              <h2>{room.status === "waiting" ? "Siap-siap" : room.status === "finished" ? "Pemenang" : currentGame.label}</h2>
            </div>
            {room.status === "playing" && <span className="count-pill">RONDE {room.round}</span>}
          </div>

          {room.status === "waiting" ? (
            <div className="empty-state">
              {hasEliminationResult ? (
                <div className="lobby-final-result">
                  <span className="winner-icon" aria-hidden="true">♛</span>
                  <p className="section-kicker">HASIL AKHIR ELIMINATION</p>
                  <h3>{winner ? `${winner.name} menang!` : "Permainan selesai."}</h3>
                  <p>Skor akhir pertandingan tersimpan di papan skor.</p>
                  <span>Atur game baru dan mulai lagi tanpa menghapus skor.</span>
                </div>
              ) : (
                <>
                  <span className="empty-icon" aria-hidden="true">✦</span>
                  <p>{isHost ? "Atur mode dan mini-game, lalu mulai." : "Bagikan kode room ke temanmu."}</p>
                  <span>Room dapat menampung hingga 16 pemain.</span>
                </>
              )}
            </div>
          ) : room.status === "finished" ? (
            <div className="winner-card">
              <span className="winner-icon" aria-hidden="true">♛</span>
              <p className="section-kicker">GAME OVER</p>
              <h3>{winner ? `${winner.name} menang!` : "Permainan selesai."}</h3>
              <p>Skor akhir sudah tersimpan. Kembali ke lobby untuk melihat papan skor dan bermain lagi.</p>
              {isHost && (
                <div className="finished-actions">
                  {room.mode === "elimination" && (
                    <button
                      className="button button-primary"
                      type="button"
                      disabled={busy}
                      onClick={() => void perform(() => returnEliminationToLobby(roomId))}
                    >
                      Kembali ke lobby <span aria-hidden="true">→</span>
                    </button>
                  )}
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm("Reset room dan hapus semua skor?")) {
                        void perform(() => resetRoom(roomId));
                      }
                    }}
                  >
                    Reset skor
                  </button>
                </div>
              )}
            </div>
          ) : room.phase === "round_complete" ? (
            <div className={`round-result${room.miniGame === "bomb" ? " bomb-result" : ""}`}>
              <span className="result-avatar" aria-hidden="true" key={`${room.round}-${room.loserId}`}>
                {room.miniGame === "bomb" ? "💥" : "😵"}
              </span>
              <p className="section-kicker">SCOREBOARD · HASIL RONDE {room.round}</p>
              <h3>{loser?.name ?? "Pemain"} kalah!</h3>
              <p>
                {room.mode === "elimination"
                  ? `${loser?.name ?? "Pemain"} tereliminasi.`
                  : `Skor apes ${loser?.name ?? "pemain"} bertambah satu.`}
              </p>
              {isHost ? (
                <button
                  className="button button-primary full-button"
                  type="button"
                  disabled={busy}
                  onClick={() => void perform(() => startNextRound(roomId))}
                >
                  Mulai ronde berikutnya <span aria-hidden="true">→</span>
                </button>
              ) : (
                <p className="waiting-host"><span className="live-dot" /> Menunggu host memulai ronde berikutnya…</p>
              )}
            </div>
          ) : room.miniGame === "bomb" ? (
            <BombRoulette
              room={room}
              userId={userId}
              serverOffsetMs={serverOffsetMs}
              busy={busy}
              onTakeTurn={performBombTurn}
              onTimeout={performBombTimeout}
            />
          ) : room.miniGame === "reflex" ? (
            <ReflexTest
              room={room}
              userId={userId}
              serverOffsetMs={serverOffsetMs}
              busy={busy}
              onRespond={performReflex}
              onTimeout={performReflexTimeout}
            />
          ) : (
            <WordChain
              room={room}
              userId={userId}
              serverOffsetMs={serverOffsetMs}
              busy={busy}
              onSubmit={performWord}
              onTimeout={performWordTimeout}
            />
          )}
        </section>

        <section className="panel room-leaderboard">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">03 / HALL OF FAME (OR SHAME)</p>
              <h2>{hasEliminationResult ? "Skor akhir" : "Loser tracker"}</h2>
            </div>
            <span className="trophy" aria-hidden="true">♛</span>
          </div>
          <ol className="leaderboard-list">
            {[...room.members]
              .sort((a, b) => b.losses - a.losses || a.joinedAt.localeCompare(b.joinedAt))
              .map((member, index, list) => {
                const topScore = list[0]?.losses ?? 0;
                const hasTopScore = topScore > 0 && member.losses === topScore;
                return (
                  <li className="leaderboard-row" key={member.id}>
                    <span className={`leader-rank${index === 0 && hasTopScore ? " rank-first" : ""}`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="leader-name">{member.name}</span>
                    {hasEliminationResult && member.id === room.winnerId && (
                      <span className="winner-tag">PEMENANG</span>
                    )}
                    {hasTopScore && <span className="loser-title">RAJA APES</span>}
                    <span className="loss-count">{member.losses}<small>×</small></span>
                  </li>
                );
              })}
          </ol>
          {room.status === "playing" && room.mode === "elimination" && (
            <p className="helper-text elimination-note">Pemain berlabel OUT menonton ronde berikutnya sampai pertandingan selesai.</p>
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

export default RoomView;
