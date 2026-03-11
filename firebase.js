/**
 * firebase.js – CivicResolve Firebase Initialization
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (or open existing)
 * 3. Click "Add app" → Web → Register app
 * 4. Copy the firebaseConfig object and paste below
 * 5. Enable Authentication: Console → Authentication → Sign-in method → Email/Password → Enable
 * 6. Enable Firestore: Console → Firestore Database → Create database → Start in test mode
 * 7. Deploy Firestore security rules (see firestore.rules file)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── PASTE YOUR FIREBASE CONFIG HERE ───────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyC1VD2qXc7QEh2-JSF7UVGp3cB72F25OLE",
  authDomain:        "hackathon-3c2bf.firebaseapp.com",
  projectId:         "hackathon-3c2bf",
  storageBucket:     "hackathon-3c2bf.firebasestorage.app",
  messagingSenderId: "980697145301",
  appId:             "1:980697145301:web:699910ef5e74827108e75c"
};
// ───────────────────────────────────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

export { auth, db };