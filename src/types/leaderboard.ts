/**
 * Types for activity leaderboards (top PRs by gender and age category).
 */

export const AGE_CATEGORIES = ['overall', '0-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80+'] as const;
export type AgeCategory = (typeof AGE_CATEGORIES)[number];

export const GENDERS = ['Male', 'Female'] as const;
export type LeaderboardGender = (typeof GENDERS)[number];

export interface LeaderboardEntry {
  userName: string;
  value: number;
  date: string;
}

export interface GenderLeaderboard {
  Male: LeaderboardEntry[];
  Female: LeaderboardEntry[];
}

export interface ActivityLeaderboard {
  overall: GenderLeaderboard;
  '0-19': GenderLeaderboard;
  '20-29': GenderLeaderboard;
  '30-39': GenderLeaderboard;
  '40-49': GenderLeaderboard;
  '50-59': GenderLeaderboard;
  '60-69': GenderLeaderboard;
  '70-79': GenderLeaderboard;
  '80+': GenderLeaderboard;
}

export type LeaderboardsData = Record<string, ActivityLeaderboard>;
