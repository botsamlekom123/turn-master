import { describe, expect, it } from "vitest";
import { createRoundOrder, shuffle, type Player } from "./game";

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
