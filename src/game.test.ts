import { describe, expect, it } from "vitest";
import {
  createRaceFinishOrder,
  createRoundOrder,
  getChancePercent,
  orderRaceResults,
  shuffle,
  weightedPick,
  type Player,
} from "./game";

const players: Player[] = [
  { id: "ada", name: "Ada", losses: 0 },
  { id: "bima", name: "Bima", losses: 0 },
  { id: "cici", name: "Cici", losses: 0 },
];

describe("shuffle", () => {
  it("returns a permutation without mutating its input", () => {
    const input = ["a", "b", "c"];
    const result = shuffle(input, () => 0);

    expect(result).toEqual(["b", "c", "a"]);
    expect([...result].sort()).toEqual([...input].sort());
    expect(input).toEqual(["a", "b", "c"]);
  });
});

describe("createRoundOrder", () => {
  it("randomizes the first round", () => {
    expect(createRoundOrder(players, "loser-first", [], null, () => 0)).toEqual([
      "bima",
      "cici",
      "ada",
    ]);
  });

  it("puts the previous loser first", () => {
    expect(
      createRoundOrder(players, "loser-first", ["ada", "bima", "cici"], "cici"),
    ).toEqual(["cici", "ada", "bima"]);
  });

  it("reverses the previous order", () => {
    expect(createRoundOrder(players, "reverse", ["ada", "bima", "cici"], "bima")).toEqual([
      "cici",
      "bima",
      "ada",
    ]);
  });

  it("reshuffles the full lineup in pure random mode", () => {
    expect(
      createRoundOrder(players, "random", ["ada", "bima", "cici"], "bima", () => 0),
    ).toEqual(["bima", "cici", "ada"]);
  });

  it("excludes the previous loser in elimination mode", () => {
    expect(
      createRoundOrder(players, "elimination", ["ada", "bima", "cici"], "bima"),
    ).toEqual(["ada", "cici"]);
  });

  it("adds newly eligible players while preserving the previous sequence", () => {
    const expandedPlayers = [...players, { id: "dewi", name: "Dewi", losses: 0 }];

    expect(
      createRoundOrder(expandedPlayers, "loser-first", ["ada", "bima", "cici"], "cici"),
    ).toEqual(["cici", "ada", "bima", "dewi"]);
  });
});

describe("createRaceFinishOrder", () => {
  it("randomizes the podium and places the weighted loser last", () => {
    expect(createRaceFinishOrder(players, "bima", () => 0).map((player) => player.id)).toEqual([
      "cici",
      "ada",
      "bima",
    ]);
  });

  it("rejects a race without two racers or a valid last-place player", () => {
    expect(() => createRaceFinishOrder(players.slice(0, 1), "ada")).toThrow("Minimal dua pemain");
    expect(() => createRaceFinishOrder(players, "unknown")).toThrow("Pemain terakhir");
  });
});

describe("orderRaceResults", () => {
  it("shows the last finisher first when selected", () => {
    expect(orderRaceResults(["winner", "second", "last"], "last-first")).toEqual([
      "last",
      "second",
      "winner",
    ]);
  });

  it("keeps the winner first when selected", () => {
    expect(orderRaceResults(["winner", "second", "last"], "winner-first")).toEqual([
      "winner",
      "second",
      "last",
    ]);
  });

  it("does not mutate the race finish order", () => {
    const finishOrder = ["winner", "last"];
    orderRaceResults(finishOrder, "last-first");
    expect(finishOrder).toEqual(["winner", "last"]);
  });
});

describe("weighted drawing", () => {
  const weightedPlayers = [
    { id: "ada", weight: 1 },
    { id: "bima", weight: 3 },
  ];

  it("calculates each player's share of the total draw weight", () => {
    expect(getChancePercent(1, 4)).toBe(25);
    expect(getChancePercent(3, 4)).toBe(75);
    expect(getChancePercent(1, 0)).toBe(0);
  });

  it("selects a player based on their weight", () => {
    expect(weightedPick(weightedPlayers, () => 0).id).toBe("ada");
    expect(weightedPick(weightedPlayers, () => 0.25).id).toBe("bima");
    expect(weightedPick(weightedPlayers, () => 0.99).id).toBe("bima");
  });

  it("rejects empty or invalid weighted draws", () => {
    expect(() => weightedPick([])).toThrow("Minimal satu pemain");
    expect(() => weightedPick([{ id: "ada", weight: 0 }])).toThrow("Bobot undian");
  });
});
