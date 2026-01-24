import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import yaml from 'js-yaml';

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

async function uploadUsers(yamlFilePath) {
  try {
    console.log('Loading environment variables...');
    const env = loadEnv();
    
    // Initialize Firebase Admin SDK
    const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    
    const db = admin.firestore();

    // Read and parse YAML file
    console.log(`Reading YAML file: ${yamlFilePath}`);
    const yamlContent = readFileSync(yamlFilePath, 'utf-8');
    const users = yaml.load(yamlContent);
    
    if (!Array.isArray(users)) {
      throw new Error('YAML file must contain an array of users');
    }
    
    console.log(`Found ${users.length} users to upload.\n`);
    
    // Check for existing users to avoid duplicates
    console.log('Checking for existing users...');
    const existingUsersSnapshot = await db.collection('users').get();
    const existingUsers = new Set();
    existingUsersSnapshot.forEach(doc => {
      const data = doc.data();
      const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
      existingUsers.add(fullName.toLowerCase());
    });
    console.log(`Found ${existingUsers.size} existing users in database.\n`);
    
    // Upload users
    let added = 0;
    let skipped = 0;
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Validate required fields
      if (!user.firstName || typeof user.firstName !== 'string' || !user.firstName.trim()) {
        console.log(`⚠️  Skipping user ${i + 1}: Missing or invalid firstName`);
        skipped++;
        continue;
      }
      
      const firstName = user.firstName.trim();
      const lastName = (user.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const fullNameLower = fullName.toLowerCase();
      
      // Check for duplicates
      if (existingUsers.has(fullNameLower)) {
        console.log(`⏭️  Skipping user ${i + 1}: "${fullName}" already exists`);
        skipped++;
        continue;
      }
      
      // Validate birthdate format if provided
      if (user.birthdate) {
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!dateRegex.test(user.birthdate)) {
          console.log(`⚠️  Skipping user ${i + 1}: "${fullName}" - Invalid birthdate format (expected MM/DD/YYYY)`);
          skipped++;
          continue;
        }
      }
      
      // Build user document
      const userDoc = {
        firstName,
        lastName,
        createdAt: new Date().toISOString(),
        tags: Array.isArray(user.tags) ? user.tags : [],
      };
      
      // Add optional fields
      if (user.gender) {
        userDoc.gender = user.gender;
      }
      
      if (user.birthdate) {
        userDoc.birthdate = user.birthdate;
      }
      
      // Add to batch
      const userRef = db.collection('users').doc();
      batch.set(userRef, userDoc);
      existingUsers.add(fullNameLower); // Track in this batch to avoid duplicates within the file
      batchCount++;
      added++;
      
      console.log(`✓ Prepared user ${i + 1}: "${fullName}"${user.gender ? ` (${user.gender})` : ''}${user.birthdate ? ` - ${user.birthdate}` : ''}`);
      
      // Commit batch when it reaches the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`\n💾 Committed batch of ${batchCount} users...\n`);
        batchCount = 0;
      }
    }
    
    // Commit remaining users
    if (batchCount > 0) {
      await batch.commit();
      console.log(`\n💾 Committed final batch of ${batchCount} users.\n`);
    }
    
    console.log('\n✅ Upload completed!');
    console.log(`   Added: ${added} users`);
    console.log(`   Skipped: ${skipped} users (duplicates or invalid data)`);
    console.log(`   Total processed: ${users.length} users`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

// Get YAML file path from command line arguments
const yamlFilePath = process.argv[2];

if (!yamlFilePath) {
  console.error('❌ Error: Please provide a YAML file path');
  console.error('Usage: node scripts/upload-users.js <path-to-users.yaml>');
  console.error('Example: node scripts/upload-users.js data/users.yaml');
  process.exit(1);
}

uploadUsers(yamlFilePath);
