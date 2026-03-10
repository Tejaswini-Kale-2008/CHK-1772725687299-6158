// Geolocation and Map Functionality
// Visualize complaints on interactive map

import { authSystem } from './auth.js';
import { complaintSystem } from './complaints.js';

let map = null;
let markers = [];
let userLocation = null;

// Mock city coordinates for demo (in production, use actual geolocation)
const cityCoordinates = {
    'new york': { lat: 40.7128, lng: -74.0060, name: 'New York, NY' },
    'los angeles': { lat: 34.0522, lng: -118.2437, name: 'Los Angeles, CA' },
    'chicago': { lat: 41.8781, lng: -87.6298, name: 'Chicago, IL' },
    'houston': { lat: 29.7604, lng: -95.3698, name: 'Houston, TX' },
    'phoenix': { lat: 33.4484, lng: -112.0742, name: 'Phoenix, AZ' },
    'philadelphia': { lat: 39.9526, lng: -75.1652, name: 'Philadelphia, PA' },
    'san antonio': { lat: 29.4241, lng: -98.4936, name: 'San Antonio, TX' },
    'san diego': { lat: 32.7157, lng: -117.1611, name: 'San Diego, CA' },
    'dallas': { lat: 32.7767, lng: -96.7970, name: 'Dallas, TX' },
    'san jose': { lat: 37.3382, lng: -121.8863, name: 'San Jose, CA' }
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log("[v0] Map page initialized");
    
    if (!authSystem.isAuthenticated()) {
        window.location.href = '/';
        return;
    }
    
    setupUI();
    initializeMap();
    loadComplaints();
});

/**
 * Setup UI
 */
function setupUI() {
    const user = authSystem.getCurrentUser();
    document.getElementById('userName').textContent = user.fullName.split(' ')[0];
    
    // Setup user dropdown
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    userMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.user-menu')) {
            userDropdown.classList.remove('show');
        }
    });
}

/**
 * Initialize map
 */
function initializeMap() {
    try {
        // Create map centered on USA
        map = L.map('mapElement').setView([39.8283, -98.5795], 4);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            opacity: 0.85
        }).addTo(map);
        
        console.log("[v0] Map initialized successfully");
        
    } catch (error) {
        console.error("[v0] Error initializing map:", error);
        alert('Error loading map');
    }
}

/**
 * Load complaints onto map
 */
function loadComplaints() {
    try {
        const complaints = complaintSystem.getAllComplaints();
        
        // Clear existing markers
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        
        // Add markers for each complaint
        complaints.forEach(complaint => {
            addComplaintMarker(complaint);
        });
        
        // Update stats
        updateMapStats(complaints);
        
        // Filter if needed
        updateMap();
        
    } catch (error) {
        console.error("[v0] Error loading complaints:", error);
    }
}

/**
 * Add complaint marker to map
 */
function addComplaintMarker(complaint) {
    try {
        const coords = getCoordinates(complaint.location.city);
        if (!coords) return;
        
        // Determine marker color based on status/priority
        const color = getMarkerColor(complaint);
        
        // Create custom marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'complaint-marker';
        markerElement.style.background = color;
        markerElement.innerHTML = '📍';
        
        // Create marker
        const marker = L.marker([coords.lat, coords.lng], {
            icon: L.divIcon({
                html: markerElement.outerHTML,
                className: '',
                iconSize: [40, 40],
                popupAnchor: [0, -20]
            })
        });
        
        // Create popup content
        const popupContent = `
            <div class="complaint-popup">
                <div class="complaint-popup-title">${complaint.title}</div>
                <div class="complaint-popup-meta">
                    <div><strong>ID:</strong> ${complaint.id}</div>
                    <div><strong>Category:</strong> ${capitalize(complaint.category)}</div>
                    <div><strong>Location:</strong> ${complaint.location.city}, ${complaint.location.state}</div>
                    <div>
                        <span class="complaint-popup-status status-${complaint.status}">
                            ${formatStatus(complaint.status)}
                        </span>
                        <span class="complaint-popup-status" style="background: #e0e7ff; color: #3730a3;">
                            ${capitalize(complaint.priority)}
                        </span>
                    </div>
                </div>
                <div class="complaint-popup-actions">
                    <button class="popup-btn" onclick="viewComplaintDetails('${complaint.id}')">View Details</button>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        marker.addTo(map);
        
        // Store marker with complaint data
        marker.complaintData = complaint;
        markers.push(marker);
        
    } catch (error) {
        console.error("[v0] Error adding marker:", error);
    }
}

/**
 * Get marker color based on complaint status/priority
 */
function getMarkerColor(complaint) {
    // Prioritize critical priority
    if (complaint.priority === 'critical') {
        return '#ef4444'; // Red
    }
    
    // Then by status
    switch (complaint.status) {
        case 'resolved':
            return '#22c55e'; // Green
        case 'in_progress':
            return '#f59e0b'; // Orange
        case 'acknowledged':
            return '#3b82f6'; // Blue
        case 'submitted':
        default:
            return '#8b5cf6'; // Purple
    }
}

/**
 * Update map based on filters
 */
function updateMap() {
    try {
        const status = document.getElementById('filterStatus').value;
        const priority = document.getElementById('filterPriority').value;
        const category = document.getElementById('filterCategory').value;
        
        // Filter and show/hide markers
        markers.forEach(marker => {
            const complaint = marker.complaintData;
            let visible = true;
            
            if (status && complaint.status !== status) visible = false;
            if (priority && complaint.priority !== priority) visible = false;
            if (category && complaint.category !== category) visible = false;
            
            if (visible) {
                marker.setOpacity(1);
            } else {
                marker.setOpacity(0.2);
            }
        });
        
        // Update stats with filtered data
        const complaints = complaintSystem.getAllComplaints();
        const filtered = complaints.filter(c => {
            let match = true;
            if (status && c.status !== status) match = false;
            if (priority && c.priority !== priority) match = false;
            if (category && c.category !== category) match = false;
            return match;
        });
        
        updateMapStats(filtered);
        
    } catch (error) {
        console.error("[v0] Error updating map:", error);
    }
}

/**
 * Update map statistics
 */
function updateMapStats(complaints) {
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const inProgress = complaints.filter(c => c.status === 'in_progress').length;
    
    document.getElementById('totalComplaints').textContent = complaints.length;
    document.getElementById('resolvedComplaints').textContent = resolved;
    document.getElementById('inProgressComplaints').textContent = inProgress;
}

/**
 * Center map on user location
 */
function centerMapOnUser() {
    try {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Center map on user
                map.setView([userLocation.lat, userLocation.lng], 13);
                
                // Add user location marker
                L.marker([userLocation.lat, userLocation.lng], {
                    icon: L.icon({
                        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI4IiBmaWxsPSIjMWU0MGFmIi8+PC9zdmc+',
                        iconSize: [32, 32],
                        popupAnchor: [0, -16]
                    })
                }).bindPopup('Your Location').addTo(map);
                
            }, function(error) {
                console.error("[v0] Geolocation error:", error);
                alert('Unable to get your location. Please enable location services.');
            });
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    } catch (error) {
        console.error("[v0] Error centering map:", error);
    }
}

/**
 * View complaint details
 */
function viewComplaintDetails(complaintId) {
    try {
        const complaint = complaintSystem.getComplaintById(complaintId);
        if (!complaint) return;
        
        const html = `
            <div class="detail-section">
                <div class="detail-label">Complaint ID</div>
                <div class="detail-value">${complaint.id}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Title</div>
                <div class="detail-value">${complaint.title}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Description</div>
                <div class="detail-value">${complaint.description}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Category</div>
                <div class="detail-value">${capitalize(complaint.category)}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Location</div>
                <div class="detail-value">${complaint.location.address}, ${complaint.location.city}, ${complaint.location.state}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Status</div>
                <div class="detail-value">${formatStatus(complaint.status)}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Priority</div>
                <div class="detail-value">${capitalize(complaint.priority)}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Submitted By</div>
                <div class="detail-value">${complaint.citizenName}</div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Date Submitted</div>
                <div class="detail-value">${formatDate(complaint.createdAt)}</div>
            </div>
        `;
        
        document.getElementById('detailsContent').innerHTML = html;
        document.getElementById('detailsPanel').classList.add('show');
        
    } catch (error) {
        console.error("[v0] Error viewing details:", error);
    }
}

/**
 * Close details panel
 */
function closeDetailsPanel() {
    document.getElementById('detailsPanel').classList.remove('show');
}

/**
 * Go back to dashboard
 */
function goBack() {
    const user = authSystem.getCurrentUser();
    if (user.role === 'citizen') {
        window.location.href = '/pages/citizen-dashboard.html';
    } else if (user.role === 'official') {
        window.location.href = '/pages/official-dashboard.html';
    } else {
        window.location.href = '/pages/admin-dashboard.html';
    }
}

/**
 * Logout handler
 */
async function handleLogout() {
    try {
        await authSystem.logout();
        window.location.href = '/';
    } catch (error) {
        console.error("[v0] Logout error:", error);
    }
}

// Helper functions

/**
 * Get coordinates for a city (demo version)
 */
function getCoordinates(city) {
    const normalized = city.toLowerCase().trim();
    return cityCoordinates[normalized] || null;
}

function formatStatus(status) {
    const statuses = {
        'submitted': 'Submitted',
        'acknowledged': 'Acknowledged',
        'in_progress': 'In Progress',
        'escalated': 'Escalated',
        'resolved': 'Resolved',
        'closed': 'Closed'
    };
    return statuses[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    });
}

function capitalize(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Export functions for onclick handlers
window.updateMap = updateMap;
window.centerMapOnUser = centerMapOnUser;
window.viewComplaintDetails = viewComplaintDetails;
window.closeDetailsPanel = closeDetailsPanel;
window.goBack = goBack;
window.handleLogout = handleLogout;
