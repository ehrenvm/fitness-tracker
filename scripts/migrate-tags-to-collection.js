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

async function migrateTags() {
  try {
    console.log('Loading environment variables...');
    const env = loadEnv();
    
    // Initialize Firebase Admin SDK
    const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    const db = admin.firestore();

    console.log('Fetching all users...');
    const usersSnapshot = await db.collection('users').get();
    
    // Extract all unique tags from user documents
    const tagsSet = new Set();
    let usersWithTags = 0;
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.tags && Array.isArray(userData.tags) && userData.tags.length > 0) {
        usersWithTags++;
        userData.tags.forEach(tag => {
          if (tag && typeof tag === 'string' && tag.trim()) {
            tagsSet.add(tag.trim());
          }
        });
      }
    });
    
    const uniqueTags = Array.from(tagsSet).sort();
    console.log(`Found ${uniqueTags.length} unique tags from ${usersWithTags} users.`);
    
    if (uniqueTags.length === 0) {
      console.log('No tags found in user documents. Nothing to migrate.');
      process.exit(0);
    }
    
    // Check which tags already exist in the tags collection
    console.log('\nChecking existing tags in tags collection...');
    const tagsSnapshot = await db.collection('tags').get();
    const existingTags = new Set();
    tagsSnapshot.forEach(doc => {
      existingTags.add(doc.id);
    });
    
    console.log(`Found ${existingTags.size} existing tags in tags collection.`);
    
    // Filter out tags that already exist
    const tagsToCreate = uniqueTags.filter(tag => !existingTags.has(tag));
    
    if (tagsToCreate.length === 0) {
      console.log('\n✅ All tags already exist in the tags collection. No migration needed.');
      process.exit(0);
    }
    
    console.log(`\nCreating ${tagsToCreate.length} new tag documents...`);
    
    // Create tags in batches
    let batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    let createdCount = 0;
    
    for (const tagName of tagsToCreate) {
      const tagRef = db.collection('tags').doc(tagName);
      batch.set(tagRef, {
        name: tagName,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      batchCount++;
      createdCount++;
      
      // Commit batch when it reaches the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`Created batch of ${batchCount} tags... (${createdCount}/${tagsToCreate.length})`);
        batchCount = 0;
        // Create a new batch for the next set of tags
        batch = db.batch();
      }
    }
    
    // Commit remaining tags
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Created final batch of ${batchCount} tags.`);
    }
    
    console.log(`\n✅ Migration completed successfully!`);
    console.log(`\nSummary:`);
    console.log(`- Total unique tags found: ${uniqueTags.length}`);
    console.log(`- Tags already in collection: ${existingTags.size}`);
    console.log(`- New tags created: ${createdCount}`);
    console.log(`- Tags from ${usersWithTags} users`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateTags();
