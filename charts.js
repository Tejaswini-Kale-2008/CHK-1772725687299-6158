// ===== charts.js – Bloomberg Gov Color Theme =====
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: "#6B5B8A", font: { family: "Source Sans 3", size: 13 } }
    }
  },
  scales: {
    x: { ticks: { color: "#9585B0", font: { size: 12 } }, grid: { color: "rgba(107,33,168,0.07)" } },
    y: { ticks: { color: "#9585B0", font: { size: 12 } }, grid: { color: "rgba(107,33,168,0.07)" } }
  }
};

function initCategoryPie(canvasId) {
  const ctx = document.getElementById(canvasId); if(!ctx) return;
  const complaints = getAllComplaints();
  const cats = ["Water","Electricity","Roads","Sanitation","Public Safety","Transport"];
  const data = cats.map(c => complaints.filter(x => x.category === c).length);
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: cats,
      datasets: [{
        data: data.some(v=>v>0) ? data : [10,8,12,5,7,6],
        backgroundColor: ["#6B21A8","#D4A017","#4A0E8F","#059669","#8B3DC8","#C4B5FD"],
        borderWidth: 3, borderColor: "#fff"
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position:"right", labels:{ color:"#6B5B8A", font:{family:"Source Sans 3",size:12}, padding:14 } } }
    }
  });
}

function initStatusBar(canvasId) {
  const ctx = document.getElementById(canvasId); if(!ctx) return;
  const complaints = getAllComplaints();
  const statuses = ["Submitted","Under Review","In Progress","Resolved","Escalated"];
  const data = statuses.map(s => complaints.filter(c => c.status === s).length);
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: statuses,
      datasets: [{
        label: "Complaints",
        data: data.some(v=>v>0) ? data : [15,8,12,20,3],
        backgroundColor: ["#6B21A8","#8B3DC8","#D4A017","#059669","#DC2626"],
        borderRadius: 6, borderWidth: 0
      }]
    },
    options: { ...chartDefaults }
  });
}

function initMonthlyLine(canvasId) {
  const ctx = document.getElementById(canvasId); if(!ctx) return;
  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: [
        { label:"Submitted", data:[12,18,15,22,19,25,30,28,24,32,29,35], borderColor:"#6B21A8", backgroundColor:"rgba(107,33,168,0.08)", tension:0.4, fill:true, pointRadius:5, pointBackgroundColor:"#6B21A8" },
        { label:"Resolved",  data:[8,12,10,16,15,20,24,22,20,26,25,30],  borderColor:"#D4A017", backgroundColor:"rgba(212,160,23,0.07)",  tension:0.4, fill:true, pointRadius:5, pointBackgroundColor:"#D4A017" }
      ]
    },
    options: { ...chartDefaults }
  });
}

function initDeptBar(canvasId) {
  const ctx = document.getElementById(canvasId); if(!ctx) return;
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Water Dept","Electricity","Public Works","Sanitation","Police","Transport"],
      datasets: [{
        label: "Resolution Rate %",
        data: [75,82,60,70,88,65],
        backgroundColor: ["#6B21A8","#8B3DC8","#4A0E8F","#C4B5FD","#D4A017","#EDE9FE"].map(c=>c),
        borderRadius: 6, borderWidth: 0
      }]
    },
    options: { ...chartDefaults, indexAxis:"y" }
  });
}
