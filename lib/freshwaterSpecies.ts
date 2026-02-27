export const FRESHWATER_SPECIES: string[] = [
  "Largemouth Bass",
  "Smallmouth Bass",
  "Spotted Bass",
  "Striped Bass",
  "White Bass",
  "Yellow Bass",
  "Peacock Bass",
  "Black Crappie",
  "White Crappie",
  "Bluegill",
  "Redear Sunfish",
  "Green Sunfish",
  "Pumpkinseed",
  "Warmouth",
  "Rock Bass",
  "White Perch",
  "Yellow Perch",
  "Walleye",
  "Sauger",
  "Northern Pike",
  "Muskellunge",
  "Chain Pickerel",
  "Tiger Muskie",
  "Channel Catfish",
  "Blue Catfish",
  "Flathead Catfish",
  "Bullhead Catfish",
  "White Catfish",
  "Rainbow Trout",
  "Brown Trout",
  "Brook Trout",
  "Lake Trout",
  "Cutthroat Trout",
  "Golden Trout",
  "Tiger Trout",
  "Kokanee Salmon",
  "Chinook Salmon",
  "Coho Salmon",
  "Atlantic Salmon",
  "Arctic Grayling",
  "Lake Whitefish",
  "Common Carp",
  "Grass Carp",
  "Bighead Carp",
  "Silver Carp",
  "Buffalo Fish",
  "Bowfin",
  "Snakehead",
  "Burbot",
  "Freshwater Drum",
  "Longnose Gar",
  "Spotted Gar",
  "Shortnose Gar",
  "Alligator Gar",
  "Shad",
  "Cisco",
  "Tilapia",
  "Blue Tilapia",
  "Redbreast Sunfish",
  "Sacramento Perch",
  "White Sturgeon",
  "Lake Sturgeon",
];

export function getSpeciesMatches(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return FRESHWATER_SPECIES.slice(0, 12);

  return [...FRESHWATER_SPECIES]
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.localeCompare(b);
    })
    .filter((species) => species.toLowerCase().includes(q))
    .slice(0, 12);
}
