// Official Dashboard JavaScript
// Manages official-specific functionality including complaint management and updates

import { authSystem } from './auth.js';
import { complaintSystem } from './complaints.js';
import { escalationSystem } from './escalation.js';
import { USER_ROLES, COMPLAINT_STATUS } from './firebase-config.js';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log("[v0] Official dashboard initialized");
    
    // Check authentication
    if (!authSystem.isAuthenticated()) {
        window.location.href = '/';
        return;
    }
    
    const user = authSystem.getCurrentUser();
    if (user.role !== USER_ROLES.OFFICIAL) {
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
    document.getElementById('officialName').textContent = user.fullName;
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
    // Update complaint form
    const updateForm = document.getElementById('updateComplaintForm');
    if (updateForm) {
        updateForm.addEventListener('submit', handleUpdateComplaint);
    }
    
    // Filter events
    document.getElementById('searchComplaintsOfficial').addEventListener('input', loadAssignedComplaints);
    document.getElementById('filterStatusOfficial').addEventListener('change', loadAssignedComplaints);
    document.getElementById('filterPriorityOfficial').addEventListener('change', loadAssignedComplaints);
    
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
        // Load assigned complaints
        const complaints = complaintSystem.getAllComplaints();
        
        // Update stats
        updateDashboardStats(complaints);
        
        // Load recent activity
        loadRecentActivity(complaints.slice(0, 5));
        
        // Show section
        showSection('overview');
        
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
    const pending = complaints.filter(c => ['submitted', 'acknowledged'].includes(c.status)).length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const escalated = complaints.filter(c => c.status === 'escalated').length;
    
    document.getElementById('totalAssigned').textContent = complaints.length;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('resolvedCount').textContent = resolved;
    document.getElementById('escalationCount').textContent = escalated;
}

/**
 * Load recent activity
 */
function loadRecentActivity(complaints) {
    const container = document.getElementById('recentActivity');
    
    if (complaints.length === 0) {
        container.innerHTML = '<p class="empty-state">No assigned complaints yet.</p>';
        return;
    }
    
    container.innerHTML = complaints.map(complaint => `
        <div class="complaint-item" onclick="loadComplaintForUpdate('${complaint.id}')">
            <div class="complaint-item-header">
                <div>
                    <div class="complaint-item-title">${complaint.title}</div>
                    <div class="complaint-item-id">ID: ${complaint.id}</div>
                </div>
                <span class="status-badge status-${complaint.status}">${formatStatus(complaint.status)}</span>
            </div>
            <div class="complaint-item-meta">
                <div class="meta-item">👤 ${complaint.citizenName}</div>
                <div class="meta-item">📍 ${complaint.location.address}</div>
                <div class="meta-item">Priority: <strong class="priority-${complaint.priority}">${capitalize(complaint.priority)}</strong></div>
            </div>
        </div>
    `).join('');
}

/**
 * Load assigned complaints with filters
 */
function loadAssignedComplaints() {
    try {
        const search = document.getElementById('searchComplaintsOfficial').value;
        const status = document.getElementById('filterStatusOfficial').value;
        const priority = document.getElementById('filterPriorityOfficial').value;
        
        const filters = {};
        if (search) filters.search = search;
        if (status) filters.status = status;
        if (priority) filters.priority = priority;
        
        const complaints = complaintSystem.getAllComplaints(filters);
        
        const container = document.getElementById('assignedComplaintsList');
        
        if (complaints.length === 0) {
            container.innerHTML = '<p class="empty-state">No complaints found matching your criteria.</p>';
            return;
        }
        
        container.innerHTML = complaints.map(complaint => `
            <div class="complaint-item" onclick="loadComplaintForUpdate('${complaint.id}')">
                <div class="complaint-item-header">
                    <div>
                        <div class="complaint-item-title">${complaint.title}</div>
                        <div class="complaint-item-id">ID: ${complaint.id}</div>
                    </div>
                    <span class="status-badge status-${complaint.status}">${formatStatus(complaint.status)}</span>
                </div>
                <div class="complaint-item-meta">
                    <div class="meta-item">👤 ${complaint.citizenName}</div>
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
 * Load complaint for updating
 */
function loadComplaintForUpdate(complaintId = null) {
    try {
        const id = complaintId || document.getElementById('updateComplaintId').value.trim();
        
        if (!id) {
            alert('Please enter or select a complaint ID');
            return;
        }
        
        const complaint = complaintSystem.getComplaintById(id);
        
        if (!complaint) {
            alert('Complaint not found');
            return;
        }
        
        // Populate details
        document.getElementById('updateComplaintId').value = complaint.id;
        document.getElementById('updateComplaintTitle').textContent = complaint.title;
        document.getElementById('updateCurrentStatus').textContent = formatStatus(complaint.status);
        document.getElementById('updateCurrentStatus').className = `status-badge status-${complaint.status}`;
        document.getElementById('updateComplaintPriority').textContent = capitalize(complaint.priority);
        document.getElementById('updateCitizenName').textContent = complaint.citizenName + ' - ' + complaint.citizenPhone;
        
        // Store complaint ID for form submission
        document.getElementById('updateComplaintForm').complaintId = complaint.id;
        
        // Show form
        document.getElementById('complaintDetailsUpdate').style.display = 'block';
        document.getElementById('updateComplaintForm').style.display = 'block';
        
        showSection('update-complaint');
        
    } catch (error) {
        console.error("[v0] Error loading complaint:", error);
        alert('Error loading complaint: ' + error.message);
    }
}

/**
 * Handle update complaint form
 */
async function handleUpdateComplaint(e) {
    e.preventDefault();
    
    try {
        const complaintId = document.getElementById('updateComplaintForm').complaintId;
        const newStatus = document.getElementById('newStatus').value;
        const message = document.getElementById('updateMessage').value;
        
        if (!complaintId || !newStatus || !message) {
            alert('Please fill in all fields');
            return;
        }
        
        console.log("[v0] Updating complaint status:", complaintId);
        
        // Update status
        await complaintSystem.updateComplaintStatus(complaintId, newStatus, message);
        
        // Add update record
        await complaintSystem.addComplaintUpdate(complaintId, message, {
            isPublic: true
        });
        
        // Reset form
        e.target.reset();
        document.getElementById('complaintDetailsUpdate').style.display = 'none';
        
        // Show success message
        alert('Complaint updated successfully!');
        
        // Reload data
        loadDashboardData();
        loadAssignedComplaints();
        loadEscalations();
        
    } catch (error) {
        console.error("[v0] Update error:", error);
        alert('Error updating complaint: ' + error.message);
    }
}

/**
 * Load escalations
 */
function loadEscalations() {
    try {
        const escalations = escalationSystem.getMyEscalations();
        
        const container = document.getElementById('escalationsList');
        
        if (escalations.length === 0) {
            container.innerHTML = '<p class="empty-state">No escalations assigned to you.</p>';
            return;
        }
        
        container.innerHTML = escalations.map(esc => `
            <div class="complaint-item" style="border-left: 4px solid #dc2626;">
                <div class="complaint-item-header">
                    <div>
                        <div class="complaint-item-title">${esc.complaintTitle}</div>
                        <div class="complaint-item-id">Escalation ID: ${esc.id}</div>
                    </div>
                    <span class="status-badge" style="background-color: #fee2e2; color: #991b1b;">${capitalize(esc.status)}</span>
                </div>
                <div class="complaint-item-meta">
                    <div class="meta-item">📋 Reason: ${esc.reason}</div>
                    <div class="meta-item">🔴 Priority: <strong>${capitalize(esc.priority)}</strong></div>
                    <div class="meta-item">📅 Created: ${formatDate(esc.createdAt)}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error("[v0] Error loading escalations:", error);
    }
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
        if (sectionId === 'assigned-complaints') {
            loadAssignedComplaints();
        } else if (sectionId === 'escalations') {
            loadEscalations();
        } else if (sectionId === 'performance') {
            loadPerformanceMetrics();
        }
    }
}

/**
 * Load performance metrics
 */
function loadPerformanceMetrics() {
    try {
        const complaints = complaintSystem.getAllComplaints();
        const resolved = complaints.filter(c => c.status === 'resolved' || c.status === 'closed');
        
        // Calculate metrics
        const avgResolutionTime = complaintSystem.complaints ? 
            Object.values(complaintSystem.complaints)
                .filter(c => c.status === 'resolved' || c.status === 'closed')
                .reduce((sum, c) => {
                    const created = new Date(c.createdAt);
                    const updated = new Date(c.updatedAt);
                    return sum + ((updated - created) / (1000 * 60 * 60));
                }, 0) / (resolved.length || 1) 
            : 0;
        
        const satisfaction = resolved.length > 0
            ? (resolved.reduce((sum, c) => sum + (c.rating || 0), 0) / resolved.length).toFixed(1)
            : 0;
        
        const resolutionRate = complaints.length > 0
            ? Math.round((resolved.length / complaints.length) * 100)
            : 0;
        
        // Update UI
        document.getElementById('avgResolutionTime').textContent = Math.round(avgResolutionTime) + 'h';
        document.getElementById('satisfactionRating').textContent = satisfaction === 0 ? '-' : satisfaction + '⭐';
        document.getElementById('totalHandled').textContent = complaints.length;
        document.getElementById('resolutionRate').textContent = resolutionRate + '%';
        
    } catch (error) {
        console.error("[v0] Error loading performance metrics:", error);
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
 * Go to profile
 */
function goToProfile() {
    alert('Profile page coming soon!');
}

/**
 * Go to team
 */
function goToTeam() {
    alert('Team management coming soon!');
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
window.goToTeam = goToTeam;
window.loadComplaintForUpdate = loadComplaintForUpdate;
window.markNotificationAsRead = markNotificationAsRead;
