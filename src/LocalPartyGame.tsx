import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  createRaceFinishOrder,
  createRoundOrder,
  GAME_MODES,
  getChancePercent,
  orderRaceResults,
  shuffle,
  weightedPick,
  type GameMode,
  type RaceOrderPreference,
} from "./game";
import DrawStage, { DRAW_STYLES, type DrawStyle } from "./minigames/DrawStage";
import RulesWidget from "./minigames/RulesWidget";

type Player = {
  id: string;
  name: string;
  weight: number;
  losses: number;
  eliminated: boolean;
};

type Phase = "setup" | "playing" | "spinning" | "result" | "finished";

let nextPlayerId = 1;

function createPlayer(): Player {
  return {
    id: `player-${nextPlayerId++}`,
    name: "",
    weight: 1,
    losses: 0,
    eliminated: false,
  };
}

function LocalPartyGame() {
  const [players, setPlayers] = useState<Player[]>(() => [
    createPlayer(),
    createPlayer(),
    createPlayer(),
  ]);
  const [mode, setMode] = useState<GameMode>("loser-first");
  const [drawStyle, setDrawStyle] = useState<DrawStyle>("roulette");
  const [raceOrderPreference, setRaceOrderPreference] = useState<RaceOrderPreference>("last-first");
  const [phase, setPhase] = useState<Phase>("setup");
  const [order, setOrder] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [lastLoserId, setLastLoserId] = useState<string | null>(null);
  const [loserId, setLoserId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [displayedPlayerId, setDisplayedPlayerId] = useState<string | null>(null);
  const [raceFinishOrder, setRaceFinishOrder] = useState<string[]>([]);
  const [error, setError] = useState("");
  const drawInterval = useRef<number | null>(null);
  const drawTimeout = useRef<number | null>(null);

  useEffect(() => () => {
    if (drawInterval.current !== null) {
      window.clearInterval(drawInterval.current);
    }
    if (drawTimeout.current !== null) {
      window.clearTimeout(drawTimeout.current);
    }
  }, []);

  const playersById = new Map(players.map((player) => [player.id, player]));
  const activePlayers = order.length > 0
    ? order.map((id) => playersById.get(id)).filter((player): player is Player => Boolean(player && !player.eliminated))
    : players.filter((player) => player.name.trim() && !player.eliminated);
  const roundPlayers = order
    .map((id) => playersById.get(id))
    .filter((player): player is Player => Boolean(player));
  const eliminatedPlayers = players.filter((player) => player.eliminated);
  const totalWeight = activePlayers.reduce((sum, player) => sum + player.weight, 0);
  const loser = loserId ? playersById.get(loserId) ?? null : null;
  const winner = winnerId ? playersById.get(winnerId) ?? null : null;
  const spinning = phase === "spinning";

  function updatePlayer(id: string, update: Partial<Pick<Player, "name" | "weight">>) {
    setPlayers((current) =>
      current.map((player) => player.id === id ? { ...player, ...update } : player),
    );
    setError("");
  }

  function addPlayer() {
    if (players.length >= 16) {
      return;
    }
    setPlayers((current) => [...current, createPlayer()]);
  }

  function removePlayer(id: string) {
    if (players.length <= 2) {
      return;
    }
    setPlayers((current) => current.filter((player) => player.id !== id));
  }

  function startGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const namedPlayers = players.map((player) => ({
      ...player,
      name: player.name.trim().replace(/\s+/g, " "),
      losses: 0,
      eliminated: false,
    }));

    if (namedPlayers.length < 2) {
      setError("Tambahkan minimal dua pemain untuk memulai.");
      return;
    }
    if (namedPlayers.some((player) => !player.name)) {
      setError("Isi nama setiap pemain sebelum mulai.");
      return;
    }
    const uniqueNames = new Set(namedPlayers.map((player) => player.name.toLocaleLowerCase("id-ID")));
    if (uniqueNames.size !== namedPlayers.length) {
      setError("Setiap pemain perlu nama yang berbeda agar hasil undian jelas.");
      return;
    }

    setPlayers(namedPlayers);
    const playerIds = namedPlayers.map((player) => player.id);
    setOrder(drawStyle === "race" && raceOrderPreference === "last-first"
      ? playerIds.reverse()
      : drawStyle === "race" ? playerIds : shuffle(playerIds));
    setRound(1);
    setLoserId(null);
    setLastLoserId(null);
    setWinnerId(null);
    setDisplayedPlayerId(null);
    setRaceFinishOrder([]);
    setError("");
    setPhase("playing");
  }

  function clearDrawTimers() {
    if (drawInterval.current !== null) {
      window.clearInterval(drawInterval.current);
      drawInterval.current = null;
    }
    if (drawTimeout.current !== null) {
      window.clearTimeout(drawTimeout.current);
      drawTimeout.current = null;
    }
  }

  function startDraw() {
    if (phase !== "playing" || activePlayers.length < 2) {
      setError("Minimal dua pemain aktif diperlukan untuk undian.");
      return;
    }

    const activePlayerIds = new Set(activePlayers.map((player) => player.id));
    const drawCandidates = drawStyle === "race"
      ? players.filter((player) => activePlayerIds.has(player.id))
      : activePlayers;
    const pickedLoser = weightedPick(drawCandidates);
    setRaceFinishOrder(
      drawStyle === "race"
        ? createRaceFinishOrder(activePlayers, pickedLoser.id).map((player) => player.id)
        : [],
    );
    setError("");
    setLoserId(null);
    setDisplayedPlayerId(activePlayers[0].id);
    setPhase("spinning");

    if (drawInterval.current !== null) {
      window.clearInterval(drawInterval.current);
    }
    if (drawStyle !== "race") {
      let displayIndex = 0;
      drawInterval.current = window.setInterval(() => {
        displayIndex = (displayIndex + 1) % activePlayers.length;
        setDisplayedPlayerId(activePlayers[displayIndex].id);
      }, 100);
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    drawTimeout.current = window.setTimeout(() => {
      clearDrawTimers();
      setDisplayedPlayerId(pickedLoser.id);
      setLoserId(pickedLoser.id);
      setLastLoserId(pickedLoser.id);
      setPlayers((current) =>
        current.map((player) => player.id === pickedLoser.id
          ? { ...player, losses: player.losses + 1, eliminated: mode === "elimination" }
          : player),
      );

      const remainingPlayers = mode === "elimination"
        ? activePlayers.filter((player) => player.id !== pickedLoser.id)
        : [];
      if (mode === "elimination" && remainingPlayers.length === 1) {
        setWinnerId(remainingPlayers[0].id);
      }
      setPhase("result");
    }, reducedMotion ? 180 : drawStyle === "race" ? 4400 : 2800);
  }

  function continueRound() {
    if (winnerId) {
      setPhase("finished");
      return;
    }

    const remaining = players.filter((player) => !player.eliminated);
    const nextOrder = drawStyle === "race" && raceFinishOrder.length > 0
      ? orderRaceResults(raceFinishOrder, raceOrderPreference)
        .filter((id) => remaining.some((player) => player.id === id))
      : createRoundOrder(remaining, mode, order, lastLoserId);
    setOrder(nextOrder);
    setRound((current) => current + 1);
    setLoserId(null);
    setDisplayedPlayerId(null);
    setRaceFinishOrder([]);
    setPhase("playing");
  }

  function finishGame() {
    clearDrawTimers();
    setWinnerId(null);
    setPhase("finished");
  }

  function returnToSetup() {
    clearDrawTimers();
    setPlayers((current) => current.map((player) => ({ ...player, losses: 0, eliminated: false })));
    setOrder([]);
    setRound(1);
    setLoserId(null);
    setLastLoserId(null);
    setWinnerId(null);
    setDisplayedPlayerId(null);
    setRaceFinishOrder([]);
    setError("");
    setPhase("setup");
  }

  function playAgain() {
    const eligible = players.map((player) => ({ ...player, losses: 0, eliminated: false }));
    setPlayers(eligible);
    const playerIds = eligible.map((player) => player.id);
    setOrder(drawStyle === "race" && raceOrderPreference === "last-first"
      ? playerIds.reverse()
      : drawStyle === "race" ? playerIds : shuffle(playerIds));
    setRound(1);
    setLoserId(null);
    setLastLoserId(null);
    setWinnerId(null);
    setDisplayedPlayerId(null);
    setRaceFinishOrder([]);
    setPhase("playing");
  }

  const hasRaceResults = drawStyle === "race"
    && raceFinishOrder.length > 0
    && (phase === "result" || phase === "finished");
  const scoreboardPlayers = hasRaceResults
    ? [
      ...orderRaceResults(raceFinishOrder, raceOrderPreference)
        .map((id) => playersById.get(id))
        .filter((player): player is Player => Boolean(player)),
      ...players.filter((player) => !raceFinishOrder.includes(player.id)),
    ]
    : [...activePlayers, ...eliminatedPlayers];

  return (
    <div className="party-app">
      <div className="party-shell">
        <a className="skip-link" href="#main-content">Lewati ke konten</a>
        <header className="party-header">
          <nav aria-label="Navigasi utama">
            <a className="party-brand" href="/" aria-label="Turn Master beranda">
              <span>TURN MASTER</span>
            </a>
          </nav>
          <p>Game pesta, satu layar</p>
        </header>

        <main id="main-content">
        {phase === "setup" ? (
          <>
            <section className="party-intro">
              <p className="party-overline">Main bersama, bergantian pegang perangkat</p>
              <h1>Siapa yang apes <span>hari ini?</span></h1>
              <p>Masukkan nama, atur peluang, lalu biarkan undian menentukan hasilnya.</p>
            </section>

            <form className="setup-layout" onSubmit={startGame}>
              <section className="setup-main" aria-labelledby="player-list-title">
                <div className="party-section-heading">
                  <div>
                    <p className="party-overline">Siapkan permainan</p>
                    <h2 id="player-list-title">Daftar pemain</h2>
                  </div>
                  <span className="party-count">{players.length} / 16</span>
                </div>

                <ol className="player-entry-list">
                  {players.map((player, index) => (
                    <li className="player-entry" key={player.id}>
                      <span className="player-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                      <label className="sr-only" htmlFor={`player-name-${player.id}`}>Nama pemain {index + 1}</label>
                      <input
                        id={`player-name-${player.id}`}
                        value={player.name}
                        maxLength={24}
                        autoComplete="off"
                        placeholder={`Nama pemain ${index + 1}`}
                        onChange={(event) => updatePlayer(player.id, { name: event.target.value })}
                      />
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Hapus pemain ${player.name || index + 1}`}
                        disabled={players.length <= 2}
                        onClick={() => removePlayer(player.id)}
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ol>

                <button className="text-button add-player-button" type="button" disabled={players.length >= 16} onClick={addPlayer}>
                  + Tambah pemain
                </button>

                <section className="chance-section" aria-labelledby="chance-title">
                  <div className="party-section-heading compact">
                    <div>
                      <p className="party-overline">Atur bobot nama</p>
                      <h2 id="chance-title">Peluang undian</h2>
                    </div>
                  </div>
                  <p className="party-help">Bobot 1 sampai 5. Angka lebih besar berarti peluang nama itu terpilih lebih tinggi.</p>
                  <div className="chance-list">
                    {players.filter((player) => player.name.trim()).map((player) => {
                      const rangeId = `weight-${player.id}`;
                      return (
                        <div className="chance-row" key={player.id}>
                          <label htmlFor={rangeId}>{player.name.trim()}</label>
                          <input
                            id={rangeId}
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={player.weight}
                            aria-valuetext={`Bobot ${player.weight}, peluang ${getChancePercent(player.weight, totalWeight).toFixed(1)} persen`}
                            onChange={(event) => updatePlayer(player.id, { weight: Number(event.target.value) })}
                          />
                          <output htmlFor={rangeId}>{getChancePercent(player.weight, totalWeight).toFixed(1)}%</output>
                        </div>
                      );
                    })}
                    {players.every((player) => !player.name.trim()) && (
                      <p className="chance-empty">Peluang tiap pemain muncul setelah namanya diisi.</p>
                    )}
                  </div>
                </section>

                <div className="setup-options">
                  <div className="form-field">
                    <label htmlFor="party-mode">Mode permainan</label>
                    <select
                      id="party-mode"
                      value={mode}
                      onChange={(event) => {
                        const selectedMode = GAME_MODES.find((item) => item.value === event.target.value);
                        if (selectedMode) {
                          setMode(selectedMode.value);
                        }
                      }}
                    >
                      {GAME_MODES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                    </select>
                  </div>

                  <fieldset className="draw-style-fieldset">
                    <legend>Gaya undian</legend>
                    <div className="draw-style-options">
                      {DRAW_STYLES.map((item) => (
                        <label className="draw-style-option" key={item.value}>
                          <input
                            type="radio"
                            name="draw-style"
                            value={item.value}
                            checked={drawStyle === item.value}
                            onChange={() => setDrawStyle(item.value)}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="party-help">{DRAW_STYLES.find((item) => item.value === drawStyle)?.description}</p>
                  </fieldset>

                  {drawStyle === "race" && (
                    <div className="form-field race-order-field">
                      <label htmlFor="race-order">Urutan Catatan Ronde</label>
                      <select
                        id="race-order"
                        value={raceOrderPreference}
                        onChange={(event) => {
                          const selectedPreference = event.target.value === "winner-first"
                            ? "winner-first"
                            : "last-first";
                          setRaceOrderPreference(selectedPreference);
                        }}
                      >
                        <option value="last-first">Finis terakhir duluan</option>
                        <option value="winner-first">Pemenang duluan</option>
                      </select>
                      <p className="party-help">
                        Urutan ini juga menentukan siapa yang tampil pertama pada balapan berikutnya. Peluang kalah tetap mengikuti bobot.
                      </p>
                    </div>
                  )}
                </div>

                {error && <p className="party-error" role="alert">{error}</p>}
                <button className="party-button party-button-primary start-button" type="submit">
                  Mulai permainan
                </button>
              </section>

              <div className="setup-aside">
                <RulesWidget
                  mode={mode}
                  drawStyle={drawStyle}
                  raceOrderPreference={raceOrderPreference}
                />
                <div className="chance-note">
                  <span className="chance-note-mark" aria-hidden="true">%</span>
                  <p>Bobot yang sama memberi peluang setara. Atur bobot tiap nama sebelum permainan dimulai.</p>
                </div>
              </div>
            </form>
          </>
        ) : (
          <>
            <section className="game-heading">
              <div>
                <p className="party-overline">{phase === "finished" ? "Hasil permainan" : `Ronde ${round} · ${GAME_MODES.find((item) => item.value === mode)?.label}`}</p>
                <h1>{phase === "finished" ? winner ? `${winner.name} menang.` : "Skor akhir." : "Undian berikutnya."}</h1>
              </div>
              <button className="text-button" type="button" onClick={returnToSetup} disabled={spinning}>
                Atur pemain
              </button>
            </section>

            {phase === "finished" ? (
              <section className="finish-layout">
                <div className="finish-result">
                  <p className="party-overline">{winner ? "Pemain terakhir" : "Sesi ditutup"}</p>
                  <h2>{winner ? `${winner.name} menang!` : "Papan skor akhir"}</h2>
                  <p>{winner ? "Semua pemain lain sudah tereliminasi." : "Permainan selesai. Skor pemain tersimpan di layar ini."}</p>
                  <button className="party-button party-button-primary" type="button" onClick={playAgain}>
                    Main lagi
                  </button>
                </div>
                <Scoreboard players={scoreboardPlayers} />
              </section>
            ) : phase === "result" ? (
              <section className="round-result-panel">
                <DrawStage
                  players={roundPlayers}
                  finishOrder={raceFinishOrder}
                  raceOrderPreference={raceOrderPreference}
                  style={drawStyle}
                  phase="result"
                  displayedPlayerId={displayedPlayerId}
                  loser={loser}
                />
                <div className="round-result-copy">
                  <p className="party-overline">Hasil ronde {round}</p>
                  <h2>{drawStyle === "race" ? `${loser?.name} finis terakhir.` : `${loser?.name} terpilih.`}</h2>
                  <p>
                    {winner
                      ? `${loser?.name} finis terakhir. ${winner.name} menang kerana bertahan hingga akhir.`
                      : mode === "elimination"
                      ? "Nama ini keluar dari undian. Pemain lain lanjut sampai tersisa satu pemenang."
                      : "Skor kalah bertambah satu. Semua pemain lanjut ke ronde berikutnya."}
                  </p>
                  <div className="result-actions">
                    <button className="party-button party-button-primary" type="button" onClick={continueRound}>
                      {winner ? "Lihat pemenang" : "Lanjut ronde"}
                    </button>
                    {!winner && (
                      <button className="text-button" type="button" onClick={finishGame}>
                        Akhiri permainan
                      </button>
                    )}
                  </div>
                </div>
                <Scoreboard players={scoreboardPlayers} />
              </section>
            ) : (
              <section className="playing-layout">
                <div className="draw-panel">
                  <DrawStage
                    players={activePlayers}
                    finishOrder={raceFinishOrder}
                    raceOrderPreference={raceOrderPreference}
                    style={drawStyle}
                    phase={spinning ? "spinning" : "ready"}
                    displayedPlayerId={displayedPlayerId}
                    loser={null}
                  />
                  <div className="draw-controls">
                    <p className="party-help">
                      {spinning ? "Tunggu sampai undian berhenti." : `${activePlayers.length} pemain aktif · Peluang mengikuti bobot nama.`}
                    </p>
                    <button
                      className="party-button party-button-primary"
                      type="button"
                      onClick={startDraw}
                      disabled={spinning || activePlayers.length < 2}
                    >
                      {spinning ? "Undian berjalan..." : "Putar undian"}
                    </button>
                  </div>
                </div>
                <Scoreboard players={scoreboardPlayers} />
              </section>
            )}
          </>
        )}
        </main>

        <footer className="party-footer">
          <span>TURN MASTER</span>
          <span>Permainan berjalan di perangkat ini.</span>
        </footer>
      </div>
    </div>
  );
}

function Scoreboard({ players }: { players: readonly Player[] }) {
  return (
    <aside className="scoreboard" aria-labelledby="scoreboard-title">
      <div className="party-section-heading compact">
        <div>
          <p className="party-overline">Catatan ronde</p>
          <h2 id="scoreboard-title">Pemain</h2>
        </div>
      </div>
      <ol className="scoreboard-list">
        {players.map((player, index) => (
          <li className={player.eliminated ? "is-eliminated" : ""} key={player.id}>
            <span className="player-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className="scoreboard-name">{player.name}{player.eliminated ? <small> · OUT</small> : null}</span>
            <span className="scoreboard-losses" aria-label={`${player.losses} kali kalah`}>{player.losses}<small>×</small></span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export default LocalPartyGame;
