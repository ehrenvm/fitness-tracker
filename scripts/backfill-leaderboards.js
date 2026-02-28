/**
 * Backfill script to compute and store activity leaderboards.
 * Run: node scripts/backfill-leaderboards.js
 * Requires: serviceAccountKey.json
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { computeLeaderboards } from '../src/utils/leaderboardCompute.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const serviceAccount = JSON.parse(
    readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf-8')
  );
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  console.log('Fetching activities config...');
  const activitiesDoc = await db.collection('config').doc('activities').get();
  const activitiesData = activitiesDoc.data();
  const activities = activitiesData?.list ?? [];
  const prDirection = activitiesData?.prDirection ?? {};
  console.log(`  Activities: ${activities.length}`);

  console.log('Fetching users...');
  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs.map((d) => {
    const data = d.data();
    const firstName = data.firstName ?? '';
    const lastName = data.lastName ?? '';
    return {
      fullName: `${firstName} ${lastName}`.trim(),
      gender: data.gender,
      birthdate: data.birthdate
    };
  });
  console.log(`  Users: ${users.length}`);

  console.log('Fetching results...');
  const resultsSnap = await db.collection('results').get();
  const results = resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`  Results: ${results.length}`);

  console.log('Computing leaderboards...');
  const leaderboards = computeLeaderboards(
    results,
    users,
    activities,
    prDirection
  );

  console.log(`  Activities with leaderboard data: ${Object.keys(leaderboards).length}`);

  console.log('Writing to config/leaderboards...');
  await db.collection('config').doc('leaderboards').set({ leaderboards });

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
