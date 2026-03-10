// Citizen Dashboard JavaScript
// Manages citizen-specific functionality including complaint submission and tracking

import { authSystem } from './auth.js';
import { complaintSystem } from './complaints.js';
import { escalationSystem } from './escalation.js';
import { USER_ROLES } from './firebase-config.js';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log("[v0] Citizen dashboard initialized");
    
    // Check authentication
    if (!authSystem.isAuthenticated()) {
        window.location.href = '/';
        return;
    }
    
    const user = authSystem.getCurrentUser();
    if (user.role !== USER_ROLES.CITIZEN) {
        window.location.href = '/';
        return;
    }
    
    // Setup UI
    setupDashboardUI();
    setupEventListeners();
    loadDashboardData();
});

/**
 * Setup dashboard UI
 */
function setupDashboardUI() {
    const user = authSystem.getCurrentUser();
    
    // Update user name in UI
    document.getElementById('dashboardUserName').textContent = user.fullName;
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
    
    // Setup notification bell
    const notificationBell = document.getElementById('notificationBell');
    const notificationPanel = document.getElementById('notificationPanel');
    
    notificationBell.addEventListener('click', function(e) {
        e.stopPropagation();
        notificationPanel.classList.toggle('show');
        updateNotificationPanel();
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.notification-bell')) {
            notificationPanel.classList.remove('show');
        }
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Submit complaint form
    const submitForm = document.getElementById('submitComplaintForm');
    submitForm.addEventListener('submit', handleSubmitComplaint);
    
    // Filter events
    document.getElementById('searchComplaints').addEventListener('input', loadComplaints);
    document.getElementById('filterStatus').addEventListener('change', loadComplaints);
    document.getElementById('filterPriority').addEventListener('change', loadComplaints);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            const sectionId = this.getAttribute('href').substring(1);
            showSection(sectionId);
        });
    });
}

/**
 * Load dashboard data
 */
function loadDashboardData() {
    try {
        // Load complaints
        const complaints = complaintSystem.getMyComplaints();
        const stats = complaintSystem.getStatistics();
        
        // Update stats
        updateDashboardStats(complaints);
        
        // Load recent complaints
        loadRecentComplaints(complaints.slice(0, 5));
        
        // Show section
        showSection('dashboard');
        
        // Update notifications
        updateNotificationBadge();
        
    } catch (error) {
        console.error("[v0] Error loading dashboard data:", error);
    }
}

/**
 * Update dashboard statistics
 */
function updateDashboardStats(complaints) {
    const resolved = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;
    const pending = complaints.filter(c => ['submitted', 'acknowledged', 'in_progress'].includes(c.status)).length;
    
    document.getElementById('totalComplaints').textContent = complaints.length;
    document.getElementById('pendingComplaints').textContent = pending;
    document.getElementById('resolvedComplaints').textContent = resolved;
    
    // Calculate average rating
    const rated = complaints.filter(c => c.rating !== null);
    if (rated.length > 0) {
        const avgRating = (rated.reduce((sum, c) => sum + c.rating, 0) / rated.length).toFixed(1);
        document.getElementById('avgRating').textContent = avgRating + '⭐';
    }
}

/**
 * Load recent complaints
 */
function loadRecentComplaints(complaints) {
    const container = document.getElementById('recentComplaints');
    
    if (complaints.length === 0) {
        container.innerHTML = '<p class="empty-state">No complaints submitted yet. Start by submitting your first complaint!</p>';
        return;
    }
    
    container.innerHTML = complaints.map(complaint => `
        <div class="complaint-item" onclick="viewComplaintDetails('${complaint.id}')">
            <div class="complaint-item-header">
                <div>
                    <div class="complaint-item-title">${complaint.title}</div>
                    <div class="complaint-item-id">ID: ${complaint.id}</div>
                </div>
                <span class="status-badge status-${complaint.status}">${formatStatus(complaint.status)}</span>
            </div>
            <div class="complaint-item-meta">
                <div class="meta-item">📅 ${formatDate(complaint.createdAt)}</div>
                <div class="meta-item">📍 ${complaint.location.address}</div>
                <div class="meta-item">Priority: <strong class="priority-${complaint.priority}">${capitalize(complaint.priority)}</strong></div>
            </div>
            <p>${complaint.description.substring(0, 100)}...</p>
        </div>
    `).join('');
}

/**
 * Load all complaints with filters
 */
function loadComplaints() {
    try {
        const search = document.getElementById('searchComplaints').value;
        const status = document.getElementById('filterStatus').value;
        const priority = document.getElementById('filterPriority').value;
        
        const filters = {};
        if (search) filters.search = search;
        if (status) filters.status = status;
        if (priority) filters.priority = priority;
        
        const complaints = complaintSystem.getMyComplaints(filters);
        
        const container = document.getElementById('complaintsList');
        
        if (complaints.length === 0) {
            container.innerHTML = '<p class="empty-state">No complaints found matching your criteria.</p>';
            return;
        }
        
        container.innerHTML = complaints.map(complaint => `
            <div class="complaint-item" onclick="viewComplaintDetails('${complaint.id}')">
                <div class="complaint-item-header">
                    <div>
                        <div class="complaint-item-title">${complaint.title}</div>
                        <div class="complaint-item-id">ID: ${complaint.id}</div>
                    </div>
                    <span class="status-badge status-${complaint.status}">${formatStatus(complaint.status)}</span>
                </div>
                <div class="complaint-item-meta">
                    <div class="meta-item">📅 ${formatDate(complaint.createdAt)}</div>
                    <div class="meta-item">📍 ${complaint.location.city}, ${complaint.location.state}</div>
                    <div class="meta-item">Category: ${capitalize(complaint.category)}</div>
                    <div class="meta-item">Priority: <strong class="priority-${complaint.priority}">${capitalize(complaint.priority)}</strong></div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error("[v0] Error loading complaints:", error);
    }
}

/**
 * Handle submit complaint form
 */
async function handleSubmitComplaint(e) {
    e.preventDefault();
    
    try {
        const complaintData = {
            title: document.getElementById('complaintTitle').value,
            description: document.getElementById('complaintDescription').value,
            category: document.getElementById('complaintCategory').value,
            address: document.getElementById('complaintAddress').value,
            city: document.getElementById('complaintCity').value,
            state: document.getElementById('complaintState').value,
            zipCode: document.getElementById('complaintZipCode').value,
            priority: document.getElementById('complaintPriority').value
        };
        
        // Validate
        if (!complaintData.title || !complaintData.description || !complaintData.category) {
            alert('Please fill in all required fields');
            return;
        }
        
        console.log("[v0] Submitting complaint:", complaintData.title);
        
        // Submit complaint
        const complaint = await complaintSystem.submitComplaint(complaintData);
        
        // Reset form
        e.target.reset();
        
        // Show success message
        alert(`Complaint submitted successfully!\nComplaint ID: ${complaint.id}\nPlease save this ID to track your complaint.`);
        
        // Reload dashboard
        loadDashboardData();
        showSection('dashboard');
        
    } catch (error) {
        console.error("[v0] Complaint submission error:", error);
        alert('Error submitting complaint: ' + error.message);
    }
}

/**
 * View complaint details
 */
function viewComplaintDetails(complaintId) {
    const complaint = complaintSystem.getComplaintById(complaintId);
    
    if (!complaint) {
        alert('Complaint not found');
        return;
    }
    
    const result = document.getElementById('trackingResult');
    document.getElementById('trackComplaintId').value = complaintId;
    
    displayTrackingResult(complaint);
    showSection('track-complaint');
}

/**
 * Track complaint
 */
function trackComplaint() {
    try {
        const complaintId = document.getElementById('trackComplaintId').value.trim();
        
        if (!complaintId) {
            alert('Please enter a complaint ID');
            return;
        }
        
        const complaint = complaintSystem.getComplaintById(complaintId);
        
        if (!complaint) {
            alert('Complaint not found. Please check the ID and try again.');
            return;
        }
        
        displayTrackingResult(complaint);
        
    } catch (error) {
        console.error("[v0] Tracking error:", error);
        alert('Error tracking complaint: ' + error.message);
    }
}

/**
 * Display tracking result
 */
function displayTrackingResult(complaint) {
    document.getElementById('trackTitle').textContent = complaint.title;
    document.getElementById('trackStatus').textContent = formatStatus(complaint.status);
    document.getElementById('trackStatus').className = `status-badge status-${complaint.status}`;
    
    // Build timeline
    const timelineHtml = `
        <div style="margin-bottom: 1rem;">
            <div style="display: flex; gap: 1rem;">
                <div style="min-width: 100px; font-weight: 600; color: #1e3a8a;">Submitted</div>
                <div>${formatDate(complaint.createdAt)}</div>
            </div>
            ${complaint.status !== 'submitted' ? `
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <div style="min-width: 100px; font-weight: 600; color: #1e3a8a;">Status</div>
                    <div>${formatStatus(complaint.status)} - ${formatDate(complaint.updatedAt)}</div>
                </div>
            ` : ''}
        </div>
    `;
    document.getElementById('statusTimeline').innerHTML = timelineHtml;
    
    // Load updates
    const updatesHtml = complaint.updates && complaint.updates.length > 0 
        ? complaint.updates.map(update => `
            <div class="update-item">
                <div class="update-message">${update.message}</div>
                <div class="update-time">${formatDate(update.timestamp)}</div>
                <div class="update-by">By: ${update.updatedBy} (${update.updatedByRole})</div>
            </div>
        `).join('')
        : '<p class="empty-state">No updates yet.</p>';
    
    document.getElementById('trackUpdates').innerHTML = updatesHtml;
    
    document.getElementById('trackingResult').style.display = 'block';
}

/**
 * Update notification panel
 */
function updateNotificationPanel() {
    try {
        const notifications = escalationSystem.getMyNotifications({ read: false });
        const panel = document.getElementById('notificationPanel');
        
        if (notifications.length === 0) {
            panel.innerHTML = '<div style="padding: 1rem; text-align: center; color: #6b7280;">No new notifications</div>';
            return;
        }
        
        panel.innerHTML = notifications.map(notif => `
            <div class="notification-item unread" onclick="markNotificationAsRead('${notif.id}')">
                <strong>${notif.title}</strong>
                <p style="margin: 0.5rem 0; color: #6b7280; font-size: 0.875rem;">${notif.message}</p>
                <small style="color: #6b7280;">${formatDate(notif.createdAt)}</small>
            </div>
        `).join('');
        
    } catch (error) {
        console.error("[v0] Error updating notification panel:", error);
    }
}

/**
 * Update notification badge
 */
function updateNotificationBadge() {
    try {
        const count = escalationSystem.getUnreadCount();
        const badge = document.getElementById('notificationBadge');
        
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error("[v0] Error updating badge:", error);
    }
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId) {
    try {
        await escalationSystem.markNotificationAsRead(notificationId);
        updateNotificationPanel();
        updateNotificationBadge();
    } catch (error) {
        console.error("[v0] Error marking notification as read:", error);
    }
}

/**
 * Show/hide sections
 */
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === '#' + sectionId) {
            item.classList.add('active');
        }
    });
    
    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        
        // Load data for specific sections
        if (sectionId === 'my-complaints') {
            loadComplaints();
        }
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

/**
 * Go to profile (placeholder)
 */
function goToProfile() {
    alert('Profile page coming soon!');
}

/**
 * Go to settings (placeholder)
 */
function goToSettings() {
    alert('Settings page coming soon!');
}

// Helper functions

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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function capitalize(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Export functions for HTML onclick handlers
window.showSection = showSection;
window.handleLogout = handleLogout;
window.goToProfile = goToProfile;
window.goToSettings = goToSettings;
window.viewComplaintDetails = viewComplaintDetails;
window.trackComplaint = trackComplaint;
window.markNotificationAsRead = markNotificationAsRead;
