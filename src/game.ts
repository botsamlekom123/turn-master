export type Player = {
  id: string;
  name: string;
  losses: number;
};

export type GameMode = "loser-first" | "reverse" | "elimination" | "random";

export const GAME_MODES: { value: GameMode; label: string; description: string }[] = [
  {
    value: "loser-first",
    label: "Loser First",
    description: "Yang kalah di ronde sebelumnya mendapat giliran pertama.",
  },
  {
    value: "reverse",
    label: "Reverse Order",
    description: "Urutan ronde sebelumnya dibalik seluruhnya.",
  },
  {
    value: "elimination",
    label: "Elimination",
    description: "Pemain yang kalah tidak ikut ronde berikutnya.",
  },
  {
    value: "random",
    label: "Pure Random",
    description: "Acak ulang semua pemain di setiap ronde.",
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
