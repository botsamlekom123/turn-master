import { useEffect, useRef, useState } from "react";
import type { RoomState } from "../rooms/types";

type Props = {
  room: RoomState;
  userId: string;
  serverOffsetMs: number;
  busy: boolean;
  onTakeTurn: () => Promise<void>;
  onTimeout: () => Promise<boolean>;
};

function BombRoulette({ room, userId, serverOffsetMs, busy, onTakeTurn, onTimeout }: Props) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const timeoutCalledFor = useRef<string | null>(null);
  const timeoutInFlightFor = useRef<string | null>(null);
  const currentPlayerId = room.order[room.currentTurnIndex];
  const currentPlayer = room.members.find((member) => member.id === currentPlayerId);
  const isMyTurn = currentPlayerId === userId;
  const urgency = remainingSeconds !== null && remainingSeconds <= 5
    ? "critical"
    : remainingSeconds !== null && remainingSeconds <= 10
      ? "urgent"
      : "calm";

  useEffect(() => {
    if (!room.turnDeadline || room.phase !== "bomb") {
      setRemainingSeconds(null);
      return;
    }

    const deadline = Date.parse(room.turnDeadline);
    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((deadline - (Date.now() - serverOffsetMs)) / 1000));
      setRemainingSeconds(seconds);
      if (
        seconds === 0 &&
        timeoutCalledFor.current !== room.turnDeadline &&
        timeoutInFlightFor.current !== room.turnDeadline
      ) {
        const deadlineKey = room.turnDeadline;
        timeoutInFlightFor.current = deadlineKey;
        void onTimeout().then((resolved) => {
          if (resolved) {
            timeoutCalledFor.current = deadlineKey;
          }
          timeoutInFlightFor.current = null;
        });
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(timer);
  }, [onTimeout, room.phase, room.turnDeadline, serverOffsetMs]);

  return (
    <div className={`minigame-card bomb-game bomb-${urgency}${isMyTurn ? " bomb-my-turn" : ""}`}>
      <span className="minigame-icon bomb-icon" aria-hidden="true">◉</span>
      <p className="section-kicker">BOM WAKTU / ROULETTE</p>
      <h3>{isMyTurn ? "Giliranmu. Berani pencet?" : `Menunggu ${currentPlayer?.name ?? "pemain"}…`}</h3>
      <p className="minigame-description">
        Bom dipilih server secara rahasia. Setiap giliran aman akan meneruskan roulette.
      </p>
      {remainingSeconds !== null && (
        <p className={`turn-countdown bomb-timer bomb-timer-${urgency}`} role="timer" aria-live="polite">
          {remainingSeconds > 0 ? `${remainingSeconds} detik tersisa` : "Waktu habis"}
        </p>
      )}
      <button
        className={`button button-danger${isMyTurn ? " bomb-trigger" : ""}`}
        type="button"
        onClick={() => void onTakeTurn()}
        disabled={!isMyTurn || busy || remainingSeconds === 0}
      >
        {isMyTurn ? "Tarik pelatuk" : "Menunggu giliran"}
      </button>
    </div>
  );
}

export default BombRoulette;
