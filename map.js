// ===== map.js – Bloomberg Gov theme =====
const demoLocations = [
  { lat:28.6139, lng:77.2090, title:"Water pipe broken",      category:"Water",        status:"Submitted"  },
  { lat:28.6200, lng:77.2150, title:"Street light out",       category:"Electricity",  status:"In Progress"},
  { lat:28.6100, lng:77.2050, title:"Road pothole",           category:"Roads",        status:"Resolved"   },
  { lat:28.6250, lng:77.2200, title:"Garbage not collected",  category:"Sanitation",   status:"Submitted"  },
  { lat:28.6080, lng:77.2180, title:"Suspicious activity",    category:"Public Safety",status:"In Progress"},
  { lat:28.6300, lng:77.2100, title:"Bus disrupted",          category:"Transport",    status:"Submitted"  },
  { lat:28.6180, lng:77.2300, title:"No water supply",        category:"Water",        status:"Escalated"  }
];

function getMarkerColor(category) {
  const colors = { "Water":"#6B21A8","Electricity":"#D4A017","Roads":"#4A0E8F","Sanitation":"#059669","Public Safety":"#DC2626","Transport":"#8B3DC8" };
  return colors[category] || "#6B5B8A";
}

function initMap(mapId) {
  const mapEl = document.getElementById(mapId); if(!mapEl) return;
  const map = L.map(mapId).setView([28.6139, 77.2090], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:19 }).addTo(map);
  demoLocations.forEach(loc => {
    const marker = L.circleMarker([loc.lat, loc.lng], { radius:9, fillColor:getMarkerColor(loc.category), color:"#fff", weight:2.5, opacity:1, fillOpacity:0.9 }).addTo(map);
    marker.bindPopup(`<div style="font-family:'Source Sans 3',sans-serif;min-width:180px"><strong style="font-size:0.95rem">${loc.title}</strong><br><span style="color:#6B5B8A;font-size:0.82rem">📌 ${loc.category}</span><br><span style="font-size:0.84rem">Status: <b>${loc.status}</b></span></div>`);
  });
  return map;
}
