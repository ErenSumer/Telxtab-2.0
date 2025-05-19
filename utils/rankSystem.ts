export interface Rank {
  name: string;
  minXp: number;
  color: string;
  icon: string;
}

export const RANKS: Rank[] = [
  { name: "Starter", minXp: 0, color: "#00F5FF", icon: "🌱" },
  { name: "Rare", minXp: 100, color: "#4F46E5", icon: "🎓" },
  { name: "Super Rare", minXp: 500, color: "#8B5CF6", icon: "⚡" },
  { name: "Epic", minXp: 1000, color: "#EC4899", icon: "🔥" },
  { name: "Mythic", minXp: 2500, color: "#F59E0B", icon: "👑" },
  { name: "Legendary", minXp: 5000, color: "#10B981", icon: "🌟" },
];

export function getRankByXp(xp: number): Rank {
  return RANKS.reduce((prev, current) => {
    return xp >= current.minXp ? current : prev;
  });
}

export function getNextRank(xp: number): Rank | null {
  const currentRank = getRankByXp(xp);
  const currentIndex = RANKS.findIndex(
    (rank) => rank.name === currentRank.name
  );

  if (currentIndex === RANKS.length - 1) {
    return null;
  }

  return RANKS[currentIndex + 1];
}

export function getXpProgress(xp: number): {
  current: number;
  next: number;
  percentage: number;
} {
  const currentRank = getRankByXp(xp);
  const nextRank = getNextRank(xp);

  if (!nextRank) {
    return { current: xp, next: xp, percentage: 100 };
  }

  const xpForNextRank = nextRank.minXp - currentRank.minXp;
  const currentXpInRank = xp - currentRank.minXp;
  const percentage = Math.min(
    100,
    Math.round((currentXpInRank / xpForNextRank) * 100)
  );

  return {
    current: currentXpInRank,
    next: xpForNextRank,
    percentage,
  };
}
