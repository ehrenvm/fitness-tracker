import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
function loadEnv() {
  const envPath = join(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        env[key.trim()] = value.trim();
      }
    }
  });
  
  return env;
}

// Helper function to split name into firstName and lastName
function splitName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', lastName: '' };
  }
  
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  } else if (parts.length === 1) {
    // Single name - put it in firstName
    return { firstName: parts[0], lastName: '' };
  } else {
    // Multiple parts - last part is lastName, rest is firstName
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return { firstName, lastName };
  }
}

async function migrateDatabase() {
  try {
    console.log('Loading environment variables...');
    const env = loadEnv();
    
    // Initialize Firebase Admin SDK
    // Option 1: Use service account key file (recommended)
    // Uncomment and set path if you have a service account key:
    const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    // Option 2: Use Application Default Credentials (if running on GCP or with gcloud auth)
    // admin.initializeApp();
    
    // Option 3: Initialize with project ID only (for local development)
    // This requires setting GOOGLE_APPLICATION_CREDENTIALS environment variable
    // or using gcloud auth application-default login
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: env.VITE_FIREBASE_PROJECT_ID
      });
    }
    
    const db = admin.firestore();

    console.log('Fetching all users...');
    const usersSnapshot = await db.collection('users').get();
    
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Found ${users.length} users to migrate.`);
    
    // Create a map of old name to new firstName/lastName for updating results
    const nameMapping = new Map();
    
    // Step 1: Update all user documents
    console.log('\nUpdating user documents...');
    let updatedUsers = 0;
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    for (const user of users) {
      if (!user.name) {
        console.log(`Skipping user ${user.id} - no name field`);
        continue;
      }
      
      // Skip if already migrated
      if (user.firstName !== undefined && user.lastName !== undefined) {
        console.log(`User ${user.id} already has firstName/lastName, skipping...`);
        continue;
      }
      
      const { firstName, lastName } = splitName(user.name);
      nameMapping.set(user.name, { firstName, lastName });
      
      const userRef = db.collection('users').doc(user.id);
      batch.update(userRef, {
        firstName,
        lastName,
      });
      
      batchCount++;
      updatedUsers++;
      
      // Commit batch when it reaches the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`Committed batch of ${batchCount} updates...`);
        batchCount = 0;
      }
      
      console.log(`Prepared update for user ${user.id}: "${user.name}" -> "${firstName}" "${lastName}"`);
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} updates.`);
    }
    
    console.log(`\nUpdated ${updatedUsers} user documents.`);
    
    // Step 2: Update all results documents that reference userName
    console.log('\nUpdating results documents...');
    const resultsSnapshot = await db.collection('results').get();
    
    let updatedResults = 0;
    const resultsBatch = db.batch();
    let resultsBatchCount = 0;
    
    for (const resultDoc of resultsSnapshot.docs) {
      const result = resultDoc.data();
      if (!result.userName) {
        continue;
      }
      
      const nameInfo = nameMapping.get(result.userName);
      if (!nameInfo) {
        // This userName doesn't match any migrated user - might be orphaned
        console.log(`Warning: Result ${resultDoc.id} references userName "${result.userName}" which wasn't found in users`);
        continue;
      }
      
      // Update userName to use firstName + lastName format
      const newUserName = `${nameInfo.firstName} ${nameInfo.lastName}`.trim();
      
      const resultRef = db.collection('results').doc(resultDoc.id);
      resultsBatch.update(resultRef, {
        userName: newUserName,
        userFirstName: nameInfo.firstName,
        userLastName: nameInfo.lastName,
      });
      
      resultsBatchCount++;
      updatedResults++;
      
      // Commit batch when it reaches the limit
      if (resultsBatchCount >= BATCH_SIZE) {
        await resultsBatch.commit();
        console.log(`Committed batch of ${resultsBatchCount} result updates...`);
        resultsBatchCount = 0;
      }
      
      if (updatedResults % 10 === 0) {
        console.log(`Prepared ${updatedResults} result updates...`);
      }
    }
    
    // Commit remaining result updates
    if (resultsBatchCount > 0) {
      await resultsBatch.commit();
      console.log(`Committed final batch of ${resultsBatchCount} result updates.`);
    }
    
    console.log(`\nUpdated ${updatedResults} result documents.`);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your codebase to use firstName/lastName instead of name');
    console.log('2. Update queries that use userName to use the new format');
    console.log('3. After verifying everything works, you can remove the old "name" field from users');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateDatabase();