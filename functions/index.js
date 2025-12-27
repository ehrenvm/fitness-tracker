/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {defineSecret} = require("firebase-functions/params");
const {onRequest} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const logger = require("firebase-functions/logger");
const cors = require("cors")({origin: true});

// Initialize Firebase Admin
initializeApp();

// Define admin password as a secret parameter
const adminPasswordSecret = defineSecret("ADMIN_PASSWORD");

/**
 * Sets admin claim for a user
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
exports.setAdminClaim = onRequest({
  secrets: [adminPasswordSecret],
}, async (req, res) => {
  // Handle CORS
  return cors(req, res, async () => {
    try {
      // Check if the request contains the required data
      if (!req.body || !req.body.uid || !req.body.adminPassword) {
        return res.status(400).json({error: "Missing required parameters"});
      }

      const {uid, adminPassword} = req.body;

      // Verify admin password
      if (adminPassword !== adminPasswordSecret.value()) {
        return res.status(403).json({error: "Invalid admin password"});
      }

      // Set admin claim
      await getAuth().setCustomUserClaims(uid, {admin: true});
      logger.info(`Admin claim set for user: ${uid}`);
      return res.json({result: "Admin claim set successfully"});
    } catch (error) {
      logger.error("Error setting admin claim:", error);
      return res.status(500).json({error: "Internal server error"});
    }
  });
});
