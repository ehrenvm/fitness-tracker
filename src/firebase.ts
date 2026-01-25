import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';

// Helper function to get env var and strip quotes if present
const getEnvVar = (key: string): string => {
  const value = import.meta.env[key] as unknown;
  if (typeof value === 'string') {
    // Remove surrounding quotes if present
    return value.replace(/^["']|["']$/g, '');
  }
  return '';
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID')
};

// Debug: Log environment variable loading (only in development)
if (import.meta.env.DEV) {
  console.log('Firebase Config Loading:', {
    apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-4) : 'MISSING',
    projectId: firebaseConfig.projectId || 'MISSING',
    authDomain: firebaseConfig.authDomain || 'MISSING',
    hasApiKey: !!firebaseConfig.apiKey,
    hasProjectId: !!firebaseConfig.projectId,
  });
}

// Check if required environment variables are present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration is missing. Please check your .env file.');
  console.error('Required variables:', {
    VITE_FIREBASE_API_KEY: !!firebaseConfig.apiKey,
    VITE_FIREBASE_PROJECT_ID: !!firebaseConfig.projectId,
  });
  console.error('Current values from .env:', {
    apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-4) : 'MISSING',
    projectId: firebaseConfig.projectId || 'MISSING',
    authDomain: firebaseConfig.authDomain || 'MISSING',
  });
  console.error('Raw import.meta.env values:', {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? 'present' : 'missing',
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'present' : 'missing',
  });
}

// Initialize Firebase
let app;
let db: Firestore;
let auth: Auth;
let analytics: Analytics;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  analytics = getAnalytics(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export { db, auth, analytics };

// Analytics event logging helper
export const logAnalyticsEvent = (eventName: string, eventParams?: { [key: string]: unknown }) => {
  try {
    logEvent(analytics, eventName, eventParams);
  } catch (error) {
    console.error('Analytics event logging failed:', error);
  }
}; 