export const AGE_CATEGORIES: readonly string[];
export const TOP_N: number;

export function getAgeFromBirthdate(birthdate: string | undefined): number | null;
export function getAgeCategory(age: number | null): string;
export function takeTopN(
  entries: Array<{ userName: string; value: number; date: string }>,
  higherIsBetter: boolean,
  n: number
): Array<{ userName: string; value: number; date: string }>;
export function computeLeaderboards(
  results: Array<{ id: string; userName: string; activity: string; value: number; date: string }>,
  users: Array<{ fullName: string; gender?: string; birthdate?: string }>,
  activities: string[],
  prDirection: Record<string, boolean>
): Record<string, Record<string, { Male: Array<{ userName: string; value: number; date: string }>; Female: Array<{ userName: string; value: number; date: string }> }>>;
