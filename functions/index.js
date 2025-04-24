const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Check if required parameters are provided
  if (!data.userId || !data.adminPassword) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  // Verify admin password
  const adminPassword = functions.config().admin?.password;
  if (!adminPassword || data.adminPassword !== adminPassword) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid admin password');
  }

  try {
    // Set custom claim
    await admin.auth().setCustomUserClaims(data.userId, { admin: true });
    console.log(`Admin claim set for user: ${data.userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error setting admin claim:', error);
    throw new functions.https.HttpsError('internal', 'Error setting admin claim');
  }
});