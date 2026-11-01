import type { CSSProperties } from "react";
import { orderRaceResults, type RaceOrderPreference } from "../game";

export type DrawStyle = "roulette" | "race" | "gacha";
export type DrawPhase = "ready" | "spinning" | "result";

export const DRAW_STYLES: { value: DrawStyle; label: string; description: string }[] = [
  {
    value: "roulette",
    label: "Roulette",
    description: "Nama berputar sampai satu pemain terpilih.",
  },
  {
    value: "race",
    label: "Balap",
    description: "Lihat semua nama berlomba menuju garis akhir.",
  },
  {
    value: "gacha",
    label: "Gacha",
    description: "Kapsul undian berguncang sebelum hasil terbuka.",
  },
];

type Player = {
  id: string;
  name: string;
};

type Props = {
  players: readonly Player[];
  finishOrder: readonly string[];
  raceOrderPreference: RaceOrderPreference;
  style: DrawStyle;
  phase: DrawPhase;
  displayedPlayerId: string | null;
  loser: Player | null;
};

function DrawStage({
  players,
  finishOrder,
  raceOrderPreference,
  style,
  phase,
  displayedPlayerId,
  loser,
}: Props) {
  const displayedPlayer = players.find((player) => player.id === displayedPlayerId);
  const displayFinishOrder = orderRaceResults(finishOrder, raceOrderPreference);
  const racePlayers = phase === "result" && displayFinishOrder.length > 0
    ? displayFinishOrder
      .map((id) => players.find((player) => player.id === id))
      .filter((player): player is Player => Boolean(player))
    : players;
  const raceWinner = finishOrder.length > 0
    ? players.find((player) => player.id === finishOrder[0])
    : null;
  const statusText =
    phase === "spinning"
      ? style === "race"
        ? "Mobil mulai melaju. Tunggu sampai seluruh peserta finis."
        : "Undian sedang berlangsung."
      : phase === "result" && loser
        ? style === "race" && raceWinner
          ? `${raceWinner.name} finis pertama. ${loser.name} finis terakhir dan kalah.`
          : `${loser.name} terpilih.`
        : "Undian siap dimulai.";

  return (
    <div className={`draw-stage draw-stage-${style}${phase === "spinning" ? " is-spinning" : ""}`}>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{statusText}</p>

      {style === "roulette" ? (
        <div className="roulette-display" aria-hidden="true">
          <div className="roulette-disc">
            <span className="roulette-mark roulette-mark-one" />
            <span className="roulette-mark roulette-mark-two" />
            <span className="roulette-mark roulette-mark-three" />
            <span className="roulette-mark roulette-mark-four" />
            <span className="roulette-center">
              {phase === "result" ? loser?.name : phase === "spinning" ? displayedPlayer?.name : "Siapa?"}
            </span>
          </div>
          <span className="roulette-pointer" />
        </div>
      ) : style === "race" ? (
        <ol className="race-lanes" aria-hidden="true">
          {racePlayers.map((player) => {
            const finishRank = finishOrder.indexOf(player.id);
            return (
              <li
                className={[
                  "race-lane",
                  phase === "spinning" ? "is-racing" : "",
                  phase === "result" ? "is-race-finished" : "",
                  phase === "result" && finishRank === 0 ? "is-race-winner" : "",
                  phase === "result" && loser?.id === player.id ? "is-race-loser" : "",
                ].filter(Boolean).join(" ")}
                key={player.id}
                style={{
                  "--race-duration": `${2.9 + (finishRank / Math.max(1, players.length - 1)) * 1.3}s`,
                } as CSSProperties}
              >
                <span className="race-place">{phase === "result" ? `#${finishRank + 1}` : ""}</span>
                <span className="race-name">{player.name}</span>
                <span className="race-track">
                  <span className="race-runner">
                    <span className="race-car-window" />
                    <span className="race-car-wheel race-car-wheel-front" />
                    <span className="race-car-wheel race-car-wheel-back" />
                  </span>
                </span>
                <span className="race-finish" />
              </li>
            );
          })}
        </ol>
      ) : (
        <div className={`gacha-machine${phase === "spinning" ? " is-shaking" : ""}`} aria-hidden="true">
          <div className="gacha-capsule">
            <span className="gacha-name">
              {phase === "result" ? loser?.name : phase === "spinning" ? displayedPlayer?.name : "Undian"}
            </span>
          </div>
          <div className="gacha-base"><span /></div>
        </div>
      )}

      <p className={`draw-stage-caption${phase === "result" ? " is-result" : ""}`} aria-hidden="true">
        {phase === "result" && loser
          ? style === "race" && raceWinner
            ? `${raceWinner.name} finis pertama · ${loser.name} paling akhir`
            : `${loser.name} terpilih`
          : phase === "spinning"
            ? style === "race"
              ? "Mesin menderu, siapa yang finis terakhir?"
              : "Menentukan nama"
            : DRAW_STYLES.find((item) => item.value === style)?.description}
      </p>
    </div>
  );
}

export default DrawStage;
