import { useEffect, useRef, useState, type FormEvent } from "react";
import { getLastLetter, loadWordDictionary, validateWordChainEntry } from "./wordList";
import type { RoomState } from "../rooms/types";

type Props = {
  room: RoomState;
  userId: string;
  serverOffsetMs: number;
  busy: boolean;
  onSubmit: (word: string) => Promise<boolean>;
  onTimeout: () => Promise<boolean>;
};

function WordChain({ room, userId, serverOffsetMs, busy, onSubmit, onTimeout }: Props) {
  const [word, setWord] = useState("");
  const [serverNow, setServerNow] = useState(Date.now() - serverOffsetMs);
  const [error, setError] = useState("");
  const [wordSet, setWordSet] = useState<ReadonlySet<string> | null>(null);
  const [dictionaryError, setDictionaryError] = useState("");
  const timeoutCalledFor = useRef<string | null>(null);
  const timeoutInFlightFor = useRef<string | null>(null);
  const currentPlayerId = room.order[room.currentTurnIndex];
  const currentPlayer = room.members.find((member) => member.id === currentPlayerId);
  const isMyTurn = currentPlayerId === userId;
  const remaining = room.turnDeadline
    ? Math.max(0, Math.ceil((Date.parse(room.turnDeadline) - serverNow) / 1000))
    : null;

  useEffect(() => {
    let cancelled = false;
    void loadWordDictionary().then((dictionary) => {
      if (!cancelled) {
        setWordSet(dictionary);
      }
    }).catch((reason: unknown) => {
      if (!cancelled) {
        setDictionaryError(
          reason instanceof Error ? reason.message : "Daftar kata tidak dapat dimuat.",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setWord("");
    setError("");
    timeoutCalledFor.current = null;
    timeoutInFlightFor.current = null;
  }, [room.currentTurnIndex, room.currentWord, room.round]);

  useEffect(() => {
    const timer = window.setInterval(() => setServerNow(Date.now() - serverOffsetMs), 100);
    return () => window.clearInterval(timer);
  }, [serverOffsetMs]);

  useEffect(() => {
    if (
      remaining === 0 &&
      room.turnDeadline &&
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
  }, [onTimeout, remaining, room.turnDeadline]);

  const wordValidation = room.currentWord
    ? wordSet
      ? validateWordChainEntry(word, room.currentWord, room.usedWords, wordSet)
      : null
    : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!word.trim()) {
      setError("Masukkan satu kata untuk melanjutkan.");
      return;
    }
    try {
      if (await onSubmit(word)) {
        setWord("");
        setError("");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kata tidak dapat dikirim.");
    }
  }

  return (
    <div className="minigame-card word-game">
      <span className="minigame-icon" aria-hidden="true">Aa</span>
      <p className="section-kicker">TEBAK KATA CEPAT</p>
      <h3>{isMyTurn ? "Giliranmu merangkai kata" : `Menunggu ${currentPlayer?.name ?? "pemain"}…`}</h3>
      <div className="word-chain-prompt">
        <span>KATA SEBELUMNYA</span>
        <strong>{room.currentWord ?? "—"}</strong>
        <small>Mulai dengan huruf <b>{room.currentWord ? getLastLetter(room.currentWord).toUpperCase() : "?"}</b></small>
      </div>
      <p className="turn-countdown" aria-live="polite">
        {remaining === null ? "Batas waktu 10 detik per giliran" : `${remaining} detik tersisa`}
      </p>
      {isMyTurn ? (
        <form className="word-entry-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="word-entry">Kata berikutnya</label>
          <input
            id="word-entry"
            value={word}
            autoComplete="off"
            maxLength={20}
            onChange={(event) => {
              setWord(event.target.value);
              setError("");
            }}
            placeholder="Kata berikutnya…"
            disabled={busy || remaining === 0}
          />
          <button className="button button-primary" type="submit" disabled={busy || remaining === 0}>
            Kirim
          </button>
          {word && wordValidation && <p className="word-hint">{wordValidation}</p>}
          {dictionaryError && <p className="inline-error" role="alert">{dictionaryError}</p>}
          {error && <p className="inline-error" role="alert">{error}</p>}
        </form>
      ) : (
        <p className="helper-text">
          Kata sah: {room.usedWords.length} · Giliran berikutnya ditentukan server.
        </p>
      )}
    </div>
  );
}

export default WordChain;
