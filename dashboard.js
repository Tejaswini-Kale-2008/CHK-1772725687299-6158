/**
 * dashboard.js – UI helpers: counters, tables, modals
 * Pure UI, no Firebase calls directly (uses complaints.js functions).
 */

// ─── ANIMATED COUNTER ────────────────────────────────────────────────────────
function animateCounter(el, target, duration) {
  if (!el) return;
  let start = 0;
  const step = target / (duration / 16);
  const iv = setInterval(() => {
    start += step;
    if (start >= target) { el.textContent = Math.round(target).toLocaleString(); clearInterval(iv); }
    else                  { el.textContent = Math.round(start).toLocaleString(); }
  }, 16);
}

// ─── FORMAT TIMESTAMP ────────────────────────────────────────────────────────
function fmtDate(val) {
  if (!val) return "—";
  // Firestore Timestamp object
  if (val && typeof val.toDate === "function") return val.toDate().toLocaleDateString("en-IN");
  // Plain Date
  if (val instanceof Date) return val.toLocaleDateString("en-IN");
  // Number (ms)
  if (typeof val === "number") return new Date(val).toLocaleDateString("en-IN");
  return String(val);
}

// ─── BUILD CITIZEN TABLE ──────────────────────────────────────────────────────
function buildCitizenTable(tbodyId, complaints) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!complaints.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#9585B0;padding:30px">
      No complaints yet. <a href="submit-complaint.html" style="color:#6B21A8">Submit one →</a></td></tr>`;
    return;
  }
  tbody.innerHTML = complaints.map(c => `
    <tr>
      <td><code style="color:#6B21A8;font-size:0.8rem">${c.id}</code></td>
      <td style="font-weight:600;color:#1A0A2E">${c.title}</td>
      <td>${c.category}</td>
      <td><span class="badge ${getStatusBadge(c.status)}">${c.status}</span></td>
      <td style="color:#9585B0;font-size:0.88rem">${fmtDate(c.createdAt)}</td>
      <td><a href="track-complaint.html?id=${c.id}" style="color:#6B21A8;font-size:0.85rem;text-decoration:none;font-weight:600">View →</a></td>
    </tr>`).join("");
}

// ─── BUILD OFFICER TABLE ──────────────────────────────────────────────────────
function buildOfficerTable(tbodyId, complaints, onStatusChange, onComment) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!complaints.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9585B0;padding:30px">No complaints found</td></tr>`;
    return;
  }
  tbody.innerHTML = complaints.map(c => `
    <tr>
      <td><code style="color:#6B21A8;font-size:0.8rem">${c.id}</code></td>
      <td style="font-weight:600;color:#1A0A2E">${c.citizenName}</td>
      <td>${c.title}</td>
      <td>${c.category}</td>
      <td><span class="badge ${getStatusBadge(c.status)}">${c.status}</span></td>
      <td style="color:#9585B0;font-size:0.88rem">${fmtDate(c.createdAt)}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        <select class="form-input" style="padding:4px 8px;font-size:0.82rem;width:auto"
          onchange="window._statusChange && window._statusChange('${c.id}', this)">
          <option value="">Update…</option>
          <option value="Under Review">Under Review</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Escalated">Escalated</option>
        </select>
        <button class="btn btn-outline btn-sm" style="padding:4px 10px;font-size:0.82rem"
          onclick="window._openComment && window._openComment('${c.id}')">💬</button>
      </td>
    </tr>`).join("");
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add("open");    }
function closeModal(id) { document.getElementById(id)?.classList.remove("open"); }

export { animateCounter, fmtDate, buildCitizenTable, buildOfficerTable, openModal, closeModal };
