export const TOPICS = [
  "World", "Pakistan", "Politics", "Business", "Markets", "Startups",
  "Technology", "AI", "Science", "Space", "Health", "Climate",
  "Cricket", "Football", "Sports", "Entertainment", "Culture", "Gaming",
] as const;

export const INTEREST_LEVELS = [
  { label: "A little", weight: 0.4 },
  { label: "Some", weight: 0.7 },
  { label: "A lot", weight: 1 },
] as const;

export const DEFAULT_WEIGHT = 0.7;

export const READING_OPTIONS = [5, 10, 15, 20] as const;