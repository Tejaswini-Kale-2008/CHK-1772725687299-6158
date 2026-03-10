/**
 * auth.js – Firebase Authentication + Firestore user profiles
 * Uses Firebase Auth for login/register and Firestore for role storage.
 */

import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── REGISTER ───────────────────────────────────────────────────────────────
async function registerUser(name, email, password, role) {
  if (!name || !email || !password || !role) {
    showToast("Please fill all fields"); return;
  }
  if (password.length < 6) {
    showToast("Password must be 6+ characters"); return;
  }
  try {
    // 1. Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // 2. Set display name
    await updateProfile(cred.user, { displayName: name });
    // 3. Store role + profile in Firestore users collection
    await setDoc(doc(db, "users", cred.user.uid), {
      uid:       cred.user.uid,
      name:      name,
      email:     email,
      role:      role,
      createdAt: serverTimestamp()
    });
    showToast("Account created! Redirecting to login…");
    setTimeout(() => window.location.href = "login.html", 1200);
  } catch (err) {
    const msg = {
      "auth/email-already-in-use": "Email already registered!",
      "auth/invalid-email":        "Invalid email address.",
      "auth/weak-password":        "Password too weak (min 6 chars)."
    }[err.code] || err.message;
    showToast(msg);
  }
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
async function loginUser(email, password, expectedRole) {
  if (!email || !password) { showToast("Please fill all fields"); return; }
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Fetch role from Firestore
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (!snap.exists()) { showToast("User profile not found. Contact admin."); return; }
    const userData = snap.data();

    // Role tab mismatch check
    if (expectedRole && userData.role !== expectedRole) {
      showToast(`Wrong role tab! Your account role is: ${userData.role}`);
      // Auto-switch tab if function exists on page
      if (typeof setRole === "function") setRole(userData.role);
      await signOut(auth);
      return;
    }

    // Store minimal user info in sessionStorage for fast UI access
    sessionStorage.setItem("cr_user", JSON.stringify({
      uid:   userData.uid,
      name:  userData.name,
      email: userData.email,
      role:  userData.role
    }));

    showToast(`Welcome back, ${userData.name}!`);
    setTimeout(() => {
      if (userData.role === "admin")        window.location.href = "admin-dashboard.html";
      else if (userData.role === "officer") window.location.href = "officer-dashboard.html";
      else                                  window.location.href = "citizen-dashboard.html";
    }, 900);
  } catch (err) {
    const msg = {
      "auth/invalid-credential":   "Invalid email or password.",
      "auth/user-not-found":       "No account with this email.",
      "auth/wrong-password":       "Incorrect password.",
      "auth/too-many-requests":    "Too many attempts. Try again later.",
      "auth/invalid-email":        "Invalid email address."
    }[err.code] || "Login failed. Please try again.";
    showToast(msg);
  }
}

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
async function logoutUser() {
  sessionStorage.removeItem("cr_user");
  await signOut(auth);
  window.location.href = "login.html";
}

// ─── GET CURRENT USER (fast, from sessionStorage) ────────────────────────────
function getCurrentUser() {
  const raw = sessionStorage.getItem("cr_user");
  return raw ? JSON.parse(raw) : null;
}

// ─── REQUIRE AUTH (role guard) ───────────────────────────────────────────────
// Call at top of each protected page. Returns user or null (and redirects).
function requireAuth(allowedRoles) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    showToast("Access denied for your role.");
    setTimeout(() => {
      if (user.role === "admin")        window.location.href = "admin-dashboard.html";
      else if (user.role === "officer") window.location.href = "officer-dashboard.html";
      else                              window.location.href = "citizen-dashboard.html";
    }, 700);
    return null;
  }
  return user;
}

// ─── SYNC SESSION on Firebase Auth state change ──────────────────────────────
// Keeps sessionStorage fresh if token expires or user logs out in another tab.
onAuthStateChanged(auth, async (firebaseUser) => {
  if (!firebaseUser) {
    sessionStorage.removeItem("cr_user");
    // If on a protected page, redirect
    const protectedPages = [
      "citizen-dashboard.html", "officer-dashboard.html",
      "admin-dashboard.html",   "submit-complaint.html"
    ];
    const page = window.location.pathname.split("/").pop();
    if (protectedPages.includes(page)) {
      window.location.href = "login.html";
    }
    return;
  }
  // Refresh session from Firestore if sessionStorage is empty
  if (!sessionStorage.getItem("cr_user")) {
    try {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (snap.exists()) {
        sessionStorage.setItem("cr_user", JSON.stringify(snap.data()));
      }
    } catch (_) {}
  }
});

export { registerUser, loginUser, logoutUser, getCurrentUser, requireAuth };
