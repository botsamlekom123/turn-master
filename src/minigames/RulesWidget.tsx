import { GAME_MODES, type GameMode, type RaceOrderPreference } from "../game";
import type { DrawStyle } from "./DrawStage";

type Props = {
  mode: GameMode;
  drawStyle: DrawStyle;
  raceOrderPreference: RaceOrderPreference;
};

function RulesWidget({ mode, drawStyle, raceOrderPreference }: Props) {
  const activeMode = GAME_MODES.find((item) => item.value === mode);

  if (!activeMode) {
    return null;
  }

  return (
    <aside className="party-rules" aria-live="polite">
      <p className="party-overline">Aturan ronde</p>
      <h2>{activeMode.label}</h2>
      <p>
        {drawStyle === "race" && mode !== "elimination"
          ? "Urutan mode ini berlaku untuk Roulette dan Gacha. Balap memakai pilihan urutan Catatan Ronde."
          : activeMode.description}
      </p>
      <p className="party-rules-detail">
        {drawStyle === "race"
          ? `${raceOrderPreference === "last-first" ? "Finis terakhir" : "Pemenang"} berada di urutan teratas Catatan Ronde dan memulai balapan berikutnya. Bobot menentukan siapa yang finis terakhir.`
          : "Setiap nama punya bobot peluang sendiri. Pemain dengan bobot lebih besar lebih mungkin terpilih."}
      </p>
    </aside>
  );
}

export default RulesWidget;
