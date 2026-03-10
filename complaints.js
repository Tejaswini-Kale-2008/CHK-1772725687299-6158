/**
 * complaints.js – Firestore CRUD for complaints
 * All reads/writes go directly to Firestore.
 * Sorting is done CLIENT-SIDE to avoid composite index requirements.
 */

import { db } from "./firebase.js";
import { getCurrentUser } from "./auth.js";
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  query, where, limit, serverTimestamp, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const COLL = "complaints";

// ─── SORT HELPER (client-side, no index needed) ───────────────────────────────
function sortByDate(docs) {
  return docs.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? (typeof a.createdAt === "number" ? a.createdAt : 0);
    const tb = b.createdAt?.toMillis?.() ?? (typeof b.createdAt === "number" ? b.createdAt : 0);
    return tb - ta;
  });
}

// ─── GENERATE ID ─────────────────────────────────────────────────────────────
function generateComplaintID() {
  return "CR" + Math.floor(100000 + Math.random() * 900000);
}

// ─── SAVE COMPLAINT ──────────────────────────────────────────────────────────
async function saveComplaint(data) {
  const user = getCurrentUser();
  const id   = generateComplaintID();
  const complaint = {
    id,
    title:        data.title       || "Untitled",
    category:     data.category    || "General",
    description:  data.description || "",
    location:     data.location    || "",
    status:       "Submitted",
    department:   getDepartmentByCategory(data.category),
    officer:      "Not Assigned",
    citizenName:  data.citizenName  || (user ? user.name  : "Citizen"),
    citizenEmail: data.citizenEmail || (user ? user.email : ""),
    citizenId:    data.citizenId    || (user ? user.uid   : null),
    escalation:   { level: 0, escalatedTo: null },
    comments:     [],
    createdAt:    serverTimestamp(),
    lastUpdated:  serverTimestamp()
  };
  await addDoc(collection(db, COLL), complaint);
  return id;
}

// ─── GET ALL COMPLAINTS ───────────────────────────────────────────────────────
// No orderBy — sort client-side to avoid composite index requirement
async function getAllComplaints() {
  const snap = await getDocs(collection(db, COLL));
  const docs = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  return sortByDate(docs);
}

// ─── GET COMPLAINT BY CUSTOM ID ───────────────────────────────────────────────
async function getComplaintById(complaintId) {
  const q    = query(collection(db, COLL), where("id", "==", complaintId), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { _docId: snap.docs[0].id, ...snap.docs[0].data() };
}

// ─── GET COMPLAINTS BY CITIZEN UID ───────────────────────────────────────────
// Uses only a single where() — no orderBy — to avoid needing a composite index.
// Sorting is done client-side after fetching.
async function getComplaintsByCitizen(uid) {
  const q    = query(collection(db, COLL), where("citizenId", "==", uid));
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  return sortByDate(docs);
}

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────
async function updateComplaintStatus(complaintId, newStatus, commentText) {
  const complaint = await getComplaintById(complaintId);
  if (!complaint) return false;
  const updates = { lastUpdated: serverTimestamp() };
  if (newStatus) updates.status = newStatus;
  if (commentText) {
    updates.comments = arrayUnion({
      text:      commentText,
      date:      new Date().toLocaleDateString("en-IN"),
      timestamp: Date.now()
    });
  }
  await updateDoc(doc(db, COLL, complaint._docId), updates);
  return true;
}

// ─── ESCALATE ────────────────────────────────────────────────────────────────
async function escalateComplaint(complaintId, level, escalatedTo) {
  const complaint = await getComplaintById(complaintId);
  if (!complaint) return false;
  await updateDoc(doc(db, COLL, complaint._docId), {
    status:      "Escalated",
    escalation:  { level, escalatedTo },
    lastUpdated: serverTimestamp()
  });
  return true;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getDepartmentByCategory(cat) {
  const map = {
    Water:           "Water Supply Dept",
    Electricity:     "Electricity Board",
    Roads:           "Public Works Dept",
    Sanitation:      "Municipal Sanitation",
    "Public Safety": "Police Department",
    Transport:       "Transport Authority"
  };
  return map[cat] || "General Dept";
}

function getStatusBadge(s) {
  if (s === "Submitted")    return "badge-blue";
  if (s === "Under Review") return "badge-yellow";
  if (s === "Assigned")     return "badge-purple";
  if (s === "In Progress")  return "badge-yellow";
  if (s === "Resolved")     return "badge-green";
  if (s === "Escalated")    return "badge-red";
  return "badge-blue";
}

// ─── SEED DEMO DATA (only if Firestore collection is empty) ──────────────────
async function addDemoComplaints() {
  try {
    const snap = await getDocs(query(collection(db, COLL), limit(1)));
    if (!snap.empty) return; // already has data
    const demos = [
      { title:"Water pipe broken",        category:"Water",         description:"Pipe broken near main road",       location:"Sector 12", citizenName:"Rahul Sharma", citizenId:"demo1" },
      { title:"Street light not working", category:"Electricity",   description:"3 lights off for a week",          location:"Block B",   citizenName:"Priya Patel",  citizenId:"demo2" },
      { title:"Pothole on highway",       category:"Roads",         description:"Big pothole causing accidents",    location:"NH-44",     citizenName:"Amit Kumar",   citizenId:"demo3" },
      { title:"Garbage not collected",    category:"Sanitation",    description:"No pickup since 5 days",           location:"Colony 7",  citizenName:"Sunita Devi",  citizenId:"demo1" },
      { title:"Suspicious activity",      category:"Public Safety", description:"Unknown people loitering at night",location:"Park Area", citizenName:"Vikram Singh", citizenId:"demo2" }
    ];
    for (const d of demos) await saveComplaint(d);
  } catch (err) {
    console.warn("addDemoComplaints:", err.message);
  }
}

export {
  saveComplaint, getAllComplaints, getComplaintById,
  getComplaintsByCitizen, updateComplaintStatus, escalateComplaint,
  getDepartmentByCategory, getStatusBadge, addDemoComplaints, generateComplaintID
};