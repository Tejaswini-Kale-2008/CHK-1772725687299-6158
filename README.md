# ⚖️ CivicResolve — Secure Digital Grievance Redressal System

A full-stack government civic complaint management platform built with **Firebase** (Auth + Firestore) and vanilla HTML/CSS/JS. Features glassmorphism UI, mouse parallax, smooth page transitions, and complete role-based access control.

---

## 🚀 Quick Setup (10 minutes)

### Step 1 — Create Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → enter a name (e.g. `civicresolve`) → Continue
3. Disable Google Analytics (optional) → **Create project**

---

### Step 2 — Enable Firebase Authentication

1. In Firebase Console → left sidebar → **Build → Authentication**
2. Click **"Get started"**
3. Under **Sign-in method** → click **Email/Password** → toggle **Enable** → Save

---

### Step 3 — Create Firestore Database

1. Left sidebar → **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** → Next → Select a region (e.g. `asia-south1`) → **Enable**

> ⚠️ Test mode allows all reads/writes for 30 days. Deploy the security rules (Step 6) before going live.

---

### Step 4 — Get Your Firebase Config

1. Left sidebar → **Project Overview** (gear icon ⚙️) → **Project settings**
2. Scroll to **"Your apps"** section → click **`</>`** (Web) to add a web app
3. Enter app nickname → click **"Register app"**
4. Copy the `firebaseConfig` object shown

---

### Step 5 — Add Config to the Project

Open **`js/firebase.js`** and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSy...",          // ← paste your values here
  authDomain:        "yourproject.firebaseapp.com",
  projectId:         "yourproject",
  storageBucket:     "yourproject.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

---

### Step 6 — Deploy Firestore Security Rules

**Option A — Firebase CLI (recommended)**

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (select Firestore)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

**Option B — Firebase Console**

1. Firestore Database → **Rules** tab
2. Copy the contents of `firestore.rules` and paste it
3. Click **Publish**

---

### Step 7 — Run the App

Because the project uses **ES Modules** (`import`/`export`), it must be served over HTTP (not opened as a file). 

**Option A — VS Code Live Server**
- Install "Live Server" extension → Right-click `index.html` → **Open with Live Server**

**Option B — Python**
```bash
cd civicresolve-firebase
python3 -m http.server 8000
# Open: http://localhost:8000
```

**Option C — Node**
```bash
npx serve .
```

---

## 🔐 Role-Based Access

| Role | Registration | Access |
|------|-------------|--------|
| **Citizen** | Register at `/register.html` | Submit & track own complaints, citizen dashboard |
| **Officer** | Register at `/register.html` (select Officer) | View all complaints, update status, add comments |
| **Admin** | Register at `/register.html` (select Admin) | Full access: all data, all users, analytics, CSV export |

### Login Page Role Tabs
The login page shows three tabs (Citizen / Officer / Admin). If you select the wrong tab for your account, the system detects the mismatch and auto-switches to the correct tab.

### Protected Routes
| Page | Allowed Roles |
|------|--------------|
| `citizen-dashboard.html` | Citizen only |
| `submit-complaint.html` | Citizen, Officer, Admin |
| `officer-dashboard.html` | Officer, Admin |
| `admin-dashboard.html` | Admin only |
| `track-complaint.html` | Public (no login required) |
| `transparency-dashboard.html` | Public |

---

## 📁 Project Structure

```
civicresolve-firebase/
├── index.html                  ← Landing page (public)
├── login.html                  ← Login with role tabs
├── register.html               ← Registration with role selector
├── citizen-dashboard.html      ← Citizen: own complaints only
├── submit-complaint.html       ← Submit new complaint
├── track-complaint.html        ← Public complaint tracker
├── officer-dashboard.html      ← Officer: manage all complaints
├── admin-dashboard.html        ← Admin: full analytics + user management
├── transparency-dashboard.html ← Public reports + map
├── firestore.rules             ← Firestore security rules (deploy this!)
│
├── css/
│   └── style.css               ← Glassmorphism + Bloomberg theme
│
└── js/
    ├── firebase.js             ← Firebase init (add your config here)
    ├── auth.js                 ← Firebase Auth: login, register, logout, requireAuth()
    ├── complaints.js           ← Firestore CRUD: save, get, update complaints
    ├── dashboard.js            ← UI helpers: counters, tables, date formatting
    ├── charts.js               ← Chart.js chart builders
    ├── escalation.js           ← Auto-escalation logic
    ├── map.js                  ← Leaflet.js map
    └── ui.js                   ← Page transitions, parallax, scroll reveal, sidebar
```

---

## 🗄️ Firestore Data Structure

### Collection: `users`
```
users/{uid}
  ├── uid:       string   (Firebase Auth UID)
  ├── name:      string
  ├── email:     string
  ├── role:      string   ("citizen" | "officer" | "admin")
  └── createdAt: Timestamp
```

### Collection: `complaints`
```
complaints/{autoId}
  ├── id:           string   (e.g. "CR847291" — custom readable ID)
  ├── title:        string
  ├── category:     string   ("Water" | "Electricity" | "Roads" | ...)
  ├── description:  string
  ├── location:     string
  ├── status:       string   ("Submitted" | "Under Review" | "In Progress" | "Resolved" | "Escalated")
  ├── department:   string
  ├── citizenName:  string
  ├── citizenEmail: string
  ├── citizenId:    string   (Firebase Auth UID of the citizen)
  ├── officer:      string
  ├── escalation:   { level: number, escalatedTo: string | null }
  ├── comments:     Array<{ text, date, timestamp }>
  ├── createdAt:    Timestamp
  └── lastUpdated:  Timestamp
```

---

## ⚠️ Important Notes

### ES Modules Requirement
All JS files use `import`/`export` (ES Modules). The HTML files load them with `<script type="module">`. This **requires an HTTP server** — simply opening `index.html` in a browser will fail with a CORS error.

### Firebase SDK Version
This project uses Firebase **v10.12.0** loaded via CDN (`gstatic.com`). No npm/bundler required.

### Firestore Indexes
Some queries (e.g. `where` + `orderBy` on different fields) may require composite indexes. Firebase will log a direct link to create them if needed — just click the link in the browser console.

### Session Storage
After login, the user profile is cached in `sessionStorage` for fast UI access (avoiding a Firestore read on every page load). The `onAuthStateChanged` listener refreshes it if the tab is reopened.

---

## 🛠️ Adding More Features

**Email notifications:** Add Firebase Functions + Nodemailer or SendGrid triggered by Firestore `onCreate` on the complaints collection.

**Image uploads:** Enable Firebase Storage, add a file input to `submit-complaint.html`, and upload with `uploadBytes()` from `firebase/storage`.

**Real-time updates:** Replace `getDocs()` with `onSnapshot()` in dashboard pages to get live updates without refreshing.

**Push notifications:** Add Firebase Cloud Messaging (FCM) for mobile/web push when complaint status changes.

---

## 📞 Support

- Firebase docs: [https://firebase.google.com/docs](https://firebase.google.com/docs)
- Firestore queries: [https://firebase.google.com/docs/firestore/query-data/queries](https://firebase.google.com/docs/firestore/query-data/queries)
- Firebase Auth: [https://firebase.google.com/docs/auth/web/start](https://firebase.google.com/docs/auth/web/start)

---
members: 
Tejswini Kale
Suhani Kaldate
Divya Kamble
Priyadarshani Pathrut
*Built with Firebase v10, Glassmorphism CSS, Three.js, Chart.js, Leaflet.js*
