import { collection, getDocs, doc, getDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { ActivityResult } from '../types/activity';
import type { LeaderboardsData } from '../types/leaderboard';
import { computeLeaderboards as computeLeaderboardsShared } from './leaderboardCompute';

const LEADERBOARD_DOC = 'leaderboards';

interface UserInfo {
  fullName: string;
  gender?: string;
  birthdate?: string;
}

export async function loadLeaderboards(): Promise<LeaderboardsData | null> {
  const ref = doc(db, 'config', LEADERBOARD_DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as { leaderboards?: LeaderboardsData } | undefined;
  return data?.leaderboards ?? null;
}

export async function saveLeaderboards(leaderboards: LeaderboardsData): Promise<void> {
  const ref = doc(db, 'config', LEADERBOARD_DOC);
  await setDoc(ref, { leaderboards });
}

export async function refreshLeaderboards(): Promise<LeaderboardsData> {
  const [activitiesSnap, usersSnap, resultsSnap] = await Promise.all([
    getDoc(doc(db, 'config', 'activities')),
    getDocs(collection(db, 'users')),
    getDocs(query(collection(db, 'results'), orderBy('date', 'desc')))
  ]);

  const activitiesData = activitiesSnap.data() as { list?: string[]; prDirection?: Record<string, boolean> } | undefined;
  const activities: string[] = activitiesData?.list ?? [];
  const prDirection: Record<string, boolean> = activitiesData?.prDirection ?? {};

  const users: UserInfo[] = usersSnap.docs.map((d) => {
    const data = d.data() as { firstName?: string; lastName?: string; gender?: string; birthdate?: string };
    const firstName = data.firstName ?? '';
    const lastName = data.lastName ?? '';
    return {
      fullName: `${firstName} ${lastName}`.trim(),
      gender: data.gender,
      birthdate: data.birthdate
    };
  });

  const results: ActivityResult[] = resultsSnap.docs.map((d) => {
    const data = d.data() as Omit<ActivityResult, 'id'>;
    return { id: d.id, ...data };
  });

  const leaderboards = computeLeaderboardsShared(
    results,
    users,
    activities,
    prDirection
  ) as unknown as LeaderboardsData;

  await saveLeaderboards(leaderboards);
  return leaderboards;
}
