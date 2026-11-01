export type Player = {
  id: string;
  name: string;
  losses: number;
};

export type GameMode = "loser-first" | "reverse" | "elimination" | "random";
export type RaceOrderPreference = "last-first" | "winner-first";

export const GAME_MODES: { value: GameMode; label: string; description: string }[] = [
  {
    value: "loser-first",
    label: "Loser First",
    description: "Pemain yang kalah sebelumnya muncul pertama dalam urutan animasi ronde berikutnya. Bobot tetap menentukan hasil.",
  },
  {
    value: "reverse",
    label: "Reverse Order",
    description: "Urutan nama dalam animasi dibalik setelah setiap hasil undian. Bobot tetap menentukan hasil.",
  },
  {
    value: "elimination",
    label: "Elimination",
    description: "Pemain yang kalah keluar dari undian. Pemain terakhir yang tersisa menang.",
  },
  {
    value: "random",
    label: "Pure Random",
    description: "Urutan nama dalam animasi diacak ulang setiap ronde. Bobot tetap menentukan hasil.",
  },
];

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

export function createRaceFinishOrder<T extends { id: string }>(
  players: readonly T[],
  lastPlayerId: string,
  random: () => number = Math.random,
): T[] {
  if (players.length < 2) {
    throw new Error("Minimal dua pemain diperlukan untuk balapan.");
  }

  const lastPlayer = players.find((player) => player.id === lastPlayerId);
  if (!lastPlayer) {
    throw new Error("Pemain terakhir harus ada di daftar balapan.");
  }

  return [...shuffle(players.filter((player) => player.id !== lastPlayerId), random), lastPlayer];
}

export function orderRaceResults<T>(
  finishOrder: readonly T[],
  preference: RaceOrderPreference,
): T[] {
  return preference === "last-first" ? [...finishOrder].reverse() : [...finishOrder];
}

export function createRoundOrder(
  players: readonly Player[],
  mode: GameMode,
  previousOrder: readonly string[],
  previousLoserId: string | null,
  random: () => number = Math.random,
): string[] {
  const playerIds = players.map((player) => player.id);

  if (mode === "random" || previousOrder.length === 0 || previousLoserId === null) {
    return shuffle(playerIds, random);
  }

  const eligibleIds = new Set(playerIds);
  const orderedIds = previousOrder.filter(
    (id, index) => eligibleIds.has(id) && previousOrder.indexOf(id) === index,
  );
  const orderedIdSet = new Set(orderedIds);
  for (const id of playerIds) {
    if (!orderedIdSet.has(id)) {
      orderedIds.push(id);
    }
  }

  if (mode === "reverse") {
    return orderedIds.reverse();
  }

  if (mode === "elimination") {
    return orderedIds.filter((id) => id !== previousLoserId);
  }

  if (!eligibleIds.has(previousLoserId)) {
    return orderedIds;
  }

  return [previousLoserId, ...orderedIds.filter((id) => id !== previousLoserId)];
}

export function getChancePercent(weight: number, totalWeight: number): number {
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(totalWeight) || totalWeight <= 0) {
    return 0;
  }
  return (weight / totalWeight) * 100;
}

export function weightedPick<T extends { weight: number }>(
  players: readonly T[],
  random: () => number = Math.random,
): T {
  if (players.length === 0) {
    throw new Error("Minimal satu pemain diperlukan untuk undian.");
  }
  if (players.some((player) => !Number.isFinite(player.weight) || player.weight <= 0)) {
    throw new Error("Bobot undian setiap pemain harus lebih dari nol.");
  }

  const totalWeight = players.reduce((total, player) => total + player.weight, 0);
  const roll = Math.min(Math.max(random(), 0), 1 - Number.EPSILON) * totalWeight;
  let cumulativeWeight = 0;

  for (const player of players) {
    cumulativeWeight += player.weight;
    if (roll < cumulativeWeight) {
      return player;
    }
  }

  return players[players.length - 1];
}
