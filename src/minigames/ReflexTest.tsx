import { useEffect, useRef, useState } from "react";
import type { RoomState } from "../rooms/types";

type Props = {
  room: RoomState;
  userId: string;
  serverOffsetMs: number;
  busy: boolean;
  onRespond: () => Promise<boolean>;
  onTimeout: () => Promise<boolean>;
};

function ReflexTest({ room, userId, serverOffsetMs, busy, onRespond, onTimeout }: Props) {
  const [serverNow, setServerNow] = useState(Date.now() - serverOffsetMs);
  const [respondedLocally, setRespondedLocally] = useState(false);
  const responded = respondedLocally || room.reflexRespondedIds.includes(userId);
  const timeoutCalledFor = useRef<string | null>(null);
  const timeoutInFlightFor = useRef<string | null>(null);
  const hasStarted = room.reflexStartsAt !== null && serverNow >= Date.parse(room.reflexStartsAt);
  const hasExpired = room.reflexDeadline !== null && serverNow >= Date.parse(room.reflexDeadline);
  const reflexDuration =
    room.reflexStartsAt && room.reflexDeadline
      ? Date.parse(room.reflexDeadline) - Date.parse(room.reflexStartsAt)
      : 0;
  const reflexProgress =
    reflexDuration > 0 && room.reflexStartsAt
      ? Math.min(
          100,
          Math.max(
            0,
            ((serverNow - Date.parse(room.reflexStartsAt)) / reflexDuration) * 100,
          ),
        )
      : 0;

  useEffect(() => {
    setRespondedLocally(false);
    timeoutCalledFor.current = null;
    timeoutInFlightFor.current = null;
  }, [room.round]);

  useEffect(() => {
    const timer = window.setInterval(() => setServerNow(Date.now() - serverOffsetMs), 100);
    return () => window.clearInterval(timer);
  }, [serverOffsetMs]);

  useEffect(() => {
    if (
      hasExpired &&
      room.reflexDeadline &&
      timeoutCalledFor.current !== room.reflexDeadline &&
      timeoutInFlightFor.current !== room.reflexDeadline
    ) {
      const deadlineKey = room.reflexDeadline;
      timeoutInFlightFor.current = deadlineKey;
      void onTimeout().then((resolved) => {
        if (resolved) {
          timeoutCalledFor.current = deadlineKey;
        }
        timeoutInFlightFor.current = null;
      });
    }
  }, [hasExpired, onTimeout, room.reflexDeadline]);

  async function respond() {
    if (await onRespond()) {
      setRespondedLocally(true);
    }
  }

  const activePlayerCount = room.members.filter((member) => !member.eliminated).length;
  const respondedCount = room.reflexRespondedIds.length;
  const signalState = hasExpired
    ? "MENENTUKAN HASIL"
    : responded
      ? "RESPONS TERCATAT"
      : hasStarted
        ? "TEKAN SEKARANG"
        : "BERSIAP";

  return (
    <div className={`minigame-card reflex-game${hasStarted && !hasExpired ? " reflex-ready" : ""}${responded ? " reflex-responded" : ""}`}>
      <span className="minigame-icon" aria-hidden="true">⚡</span>
      <p className="section-kicker">TEST REFLEKS</p>
      <h3>{hasExpired ? "Menentukan hasil…" : responded ? "Responsmu tercatat!" : hasStarted ? "TEKAN SEKARANG!" : "Tunggu sinyal…"}</h3>
      <p className="minigame-description">
        Waktu respons dicatat server. Respons paling lambat kalah; kalau tidak merespons sampai timer habis, kamu otomatis kalah.
      </p>
      <div className={`reflex-signal${hasStarted && !hasExpired ? " is-live" : ""}${responded ? " is-recorded" : ""}`} aria-live="polite">
        <span className="reflex-signal-light" aria-hidden="true" />
        <strong>{signalState}</strong>
        <span className="reflex-response-count">{respondedCount}/{activePlayerCount} merespons</span>
      </div>
      <div
        className="reflex-progress"
        role="progressbar"
        aria-label="Waktu ronde refleks"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(reflexProgress)}
      >
        <span style={{ width: `${reflexProgress}%` }} />
      </div>
      {room.reflexDeadline && (
        <p className="turn-countdown" aria-live="polite">
          {Math.max(0, Math.ceil((Date.parse(room.reflexDeadline) - serverNow) / 1000))} detik tersisa
          {" · "}{activePlayerCount} pemain
        </p>
      )}
      <button
        className="button button-reflex"
        type="button"
        onClick={() => void respond()}
        disabled={!hasStarted || hasExpired || responded || busy || room.phase === "round_complete"}
      >
        {responded ? "Respons tercatat" : hasStarted ? "TEKAN!" : "SIAP…"}
      </button>
    </div>
  );
}

export default ReflexTest;
