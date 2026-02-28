/**
 * Shared leaderboard computation logic.
 * Used by leaderboardService.ts (client) and backfill-leaderboards.js (Node script).
 */

export const AGE_CATEGORIES = [
  'overall',
  '0-19',
  '20-29',
  '30-39',
  '40-49',
  '50-59',
  '60-69',
  '70-79',
  '80+'
];

export const TOP_N = 3;

/**
 * @param {string | undefined} birthdate - MM/DD/YYYY format
 * @returns {number | null}
 */
export function getAgeFromBirthdate(birthdate) {
  if (!birthdate) return null;
  try {
    const [month, day, year] = birthdate.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

/**
 * @param {number | null} age
 * @returns {string}
 */
export function getAgeCategory(age) {
  if (age === null) return 'overall';
  if (age < 20) return '0-19';
  if (age < 30) return '20-29';
  if (age < 40) return '30-39';
  if (age < 50) return '40-49';
  if (age < 60) return '50-59';
  if (age < 70) return '60-69';
  if (age < 80) return '70-79';
  return '80+';
}

/**
 * @param {Array<{ userName: string; value: number; date: string }>} entries
 * @param {boolean} higherIsBetter
 * @param {number} n
 * @returns {Array<{ userName: string; value: number; date: string }>}
 */
export function takeTopN(entries, higherIsBetter, n) {
  const sorted = [...entries].sort((a, b) =>
    higherIsBetter ? b.value - a.value : a.value - b.value
  );
  return sorted.slice(0, n);
}

/**
 * @param {Array<{ id: string; userName: string; activity: string; value: number; date: string }>} results
 * @param {Array<{ fullName: string; gender?: string; birthdate?: string }>} users
 * @param {string[]} activities
 * @param {Record<string, boolean>} prDirection
 * @returns {Record<string, Record<string, { Male: Array<{ userName: string; value: number; date: string }>; Female: Array<{ userName: string; value: number; date: string }> }>>}
 */
export function computeLeaderboards(results, users, activities, prDirection) {
  const userMap = new Map();
  for (const u of users) {
    userMap.set(u.fullName.trim(), u);
  }

  const leaderboards = {};

  for (const activity of activities) {
    const higherIsBetter = prDirection[activity] !== false;
    const activityResults = results.filter((r) => r.activity === activity);
    if (activityResults.length === 0) continue;

    const prByUser = new Map();
    for (const r of activityResults) {
      const existing = prByUser.get(r.userName);
      if (
        !existing ||
        (higherIsBetter ? r.value > existing.value : r.value < existing.value)
      ) {
        prByUser.set(r.userName, r);
      }
    }

    const activityLeaderboard = {};
    for (const cat of AGE_CATEGORIES) {
      activityLeaderboard[cat] = { Male: [], Female: [] };
    }

    for (const [, bestResult] of prByUser) {
      const user = userMap.get(bestResult.userName?.trim?.() ?? bestResult.userName);
      const gender = user?.gender;
      const age = getAgeFromBirthdate(user?.birthdate);
      const category = getAgeCategory(age);

      const entry = {
        userName: bestResult.userName,
        value: bestResult.value,
        date: bestResult.date
      };

      if (gender === 'Male' || gender === 'Female') {
        activityLeaderboard.overall[gender].push(entry);
        if (category !== 'overall') {
          activityLeaderboard[category][gender].push(entry);
        }
      }
    }

    for (const cat of AGE_CATEGORIES) {
      activityLeaderboard[cat].Male = takeTopN(
        activityLeaderboard[cat].Male,
        higherIsBetter,
        TOP_N
      );
      activityLeaderboard[cat].Female = takeTopN(
        activityLeaderboard[cat].Female,
        higherIsBetter,
        TOP_N
      );
    }

    leaderboards[activity] = activityLeaderboard;
  }

  return leaderboards;
}
