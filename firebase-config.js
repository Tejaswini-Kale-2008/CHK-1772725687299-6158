// Firebase Configuration
// Replace these with your Firebase project credentials
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC1VD2qXc7QEh2-JSF7UVGp3cB72F25OLE",
  authDomain: "hackathon-3c2bf.firebaseapp.com",
  projectId: "hackathon-3c2bf",
  storageBucket: "hackathon-3c2bf.firebasestorage.app",
  messagingSenderId: "980697145301",
  appId: "1:980697145301:web:699910ef5e74827108e75c"
};

// Initialize Firebase
let db = null;
let auth = null;
let storage = null;

async function initializeFirebase() {
  try {
    // Note: In a real implementation, these would be imported from Firebase SDK
    // For this demo, we're using direct API calls to Firestore
    console.log("[v0] Firebase initialization setup. Replace FIREBASE_CONFIG with your credentials.");
    return true;
  } catch (error) {
    console.error("[v0] Firebase initialization error:", error);
    return false;
  }
}

// Firestore Collections Structure
const COLLECTIONS = {
  USERS: 'users',
  COMPLAINTS: 'complaints',
  UPDATES: 'complaint-updates',
  ESCALATIONS: 'escalations',
  NOTIFICATIONS: 'notifications'
};

// User Roles
const USER_ROLES = {
  CITIZEN: 'citizen',
  OFFICIAL: 'official',
  ADMIN: 'admin'
};

// Complaint Status
const COMPLAINT_STATUS = {
  SUBMITTED: 'submitted',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  ESCALATED: 'escalated',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

// Priority Levels
const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export {
  FIREBASE_CONFIG,
  initializeFirebase,
  COLLECTIONS,
  USER_ROLES,
  COMPLAINT_STATUS,
  PRIORITY_LEVELS
};
