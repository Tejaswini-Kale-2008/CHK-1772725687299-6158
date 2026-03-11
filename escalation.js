// ===== escalation.js =====
// Checks complaints and escalates if not updated in time

// ---- Escalation Rules ----
// 24 hours (ms) = 86400000 → escalate to Department Head
// 48 hours (ms) = 172800000 → escalate to Admin

const ESCALATION_LEVEL_1 = 24 * 60 * 60 * 1000; // 24 hrs
const ESCALATION_LEVEL_2 = 48 * 60 * 60 * 1000; // 48 hrs

// ---- Run escalation check ----
function runEscalationCheck() {
  const complaints = getAllComplaints();
  const now = Date.now();
  let changed = false;

  complaints.forEach(c => {
    // Skip resolved complaints
    if (c.status === "Resolved") return;

    const timeSinceUpdate = now - (c.lastUpdated || now);

    // Level 2 check (48 hrs → escalate to admin)
    if (timeSinceUpdate >= ESCALATION_LEVEL_2 && c.escalation.level < 2) {
      c.escalation.level = 2;
      c.escalation.escalatedTo = "Admin";
      c.escalation.escalatedAt = new Date().toLocaleString();
      c.status = "Escalated";
      changed = true;
      console.log(`[Escalation] ${c.id} → Escalated to Admin (48hrs)`);
    }
    // Level 1 check (24 hrs → escalate to dept head)
    else if (timeSinceUpdate >= ESCALATION_LEVEL_1 && c.escalation.level < 1) {
      c.escalation.level = 1;
      c.escalation.escalatedTo = "Department Head";
      c.escalation.escalatedAt = new Date().toLocaleString();
      changed = true;
      console.log(`[Escalation] ${c.id} → Escalated to Department Head (24hrs)`);
    }
  });

  if (changed) {
    localStorage.setItem("cr_complaints", JSON.stringify(complaints));
  }

  return complaints.filter(c => c.escalation.level > 0);
}

// ---- Get escalation status text ----
function getEscalationText(complaint) {
  if (!complaint.escalation || complaint.escalation.level === 0) return "None";
  if (complaint.escalation.level === 1) return "⚠️ Dept Head";
  if (complaint.escalation.level === 2) return "🔴 Admin";
  return "None";
}

// ---- Demo: simulate old complaints for testing ----
function simulateOldComplaint(id, hoursAgo) {
  const complaints = getAllComplaints();
  const idx = complaints.findIndex(c => c.id === id);
  if (idx === -1) return;
  complaints[idx].lastUpdated = Date.now() - (hoursAgo * 60 * 60 * 1000);
  localStorage.setItem("cr_complaints", JSON.stringify(complaints));
  console.log(`Simulated complaint ${id} as ${hoursAgo} hours old`);
}
