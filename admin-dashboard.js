// Admin Dashboard JavaScript
// Comprehensive system analytics and management

import { authSystem } from './auth.js';
import { complaintSystem } from './complaints.js';
import { escalationSystem } from './escalation.js';
import { USER_ROLES, COMPLAINT_STATUS, PRIORITY_LEVELS } from './firebase-config.js';

let currentUserFilter = 'all';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log("[v0] Admin dashboard initialized");
    
    // Check authentication
    if (!authSystem.isAuthenticated()) {
        window.location.href = '/';
        return;
    }
    
    const user = authSystem.getCurrentUser();
    if (user.role !== USER_ROLES.ADMIN) {
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
    // Filter events
    document.getElementById('searchAll').addEventListener('input', loadAllComplaints);
    document.getElementById('filterStatusAll').addEventListener('change', loadAllComplaints);
    document.getElementById('filterCategory').addEventListener('change', loadAllComplaints);
    
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
        // Load analytics
        const complaints = complaintSystem.getAllComplaints();
        const escalations = escalationSystem.getMyEscalations();
        
        // Update analytics
        updateAnalytics(complaints);
        
        // Load initial data
        loadAllComplaints();
        loadUsers();
        loadEscalations();
        
        // Show section
        showSection('analytics');
        
        // Update notifications
        updateNotificationBadge();
        
    } catch (error) {
        console.error("[v0] Error loading dashboard data:", error);
    }
}

/**
 * Update analytics section
 */
function updateAnalytics(complaints) {
    // Calculate statistics
    const stats = complaintSystem.getStatistics();
    
    document.getElementById('totalComplaints').textContent = complaints.length;
    document.getElementById('avgResolutionTime').textContent = stats.averageResolutionTime + 'h';
    document.getElementById('satisfactionRate').textContent = stats.satisfactionRating === 0 ? '-' : stats.satisfactionRating + '⭐';
    
    // Count active users
    const allUsers = authSystem.getAllUsers();
    const citizens = allUsers.filter(u => u.role === USER_ROLES.CITIZEN).length;
    const officials = allUsers.filter(u => u.role === USER_ROLES.OFFICIAL).length;
    
    document.getElementById('activeUsers').textContent = allUsers.length;
    document.getElementById('citizenCount').textContent = citizens;
    document.getElementById('officialCount').textContent = officials;
    
    // Update status chart
    const statusHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: #3b82f6;">${stats.byStatus.submitted}</div>
                <div style="color: #6b7280; font-size: 0.875rem;">Submitted</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: #f59e0b;">${stats.byStatus.acknowledged}</div>
                <div style="color: #6b7280; font-size: 0.875rem;">Acknowledged</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: #8b5cf6;">${stats.byStatus.inProgress}</div>
                <div style="color: #6b7280; font-size: 0.875rem;">In Progress</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: #22c55e;">${stats.byStatus.resolved}</div>
                <div style="color: #6b7280; font-size: 0.875rem;">Resolved</div>
            </div>
        </div>
    `;
    document.getElementById('statusChart').innerHTML = statusHtml;
    
    // Update priority chart
    const priorityHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: #10b981;">${stats.byPriority.low}</div>
                <div style="color: #6b7280; font-size: 0.875rem;">Low</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: #f59e0b;">${stats.byPriority.medium}</div>
                <div style="color: #6b7280; font-size: 0.875rem;">Medium</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: #f97316;">${stats.byPriority.high}</div>
                <div style="color: #6b7280; font-size: 0.875rem;">High</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: #dc2626;">${stats.byPriority.critical}</div>
                <div style="color: #6b7280; font-size: 0.875rem;">Critical</div>
            </div>
        </div>
    `;
    document.getElementById('priorityChart').innerHTML = priorityHtml;
}

/**
 * Load all complaints
 */
function loadAllComplaints() {
    try {
        const search = document.getElementById('searchAll').value;
        const status = document.getElementById('filterStatusAll').value;
        const category = document.getElementById('filterCategory').value;
        
        const filters = {};
        if (search) filters.search = search;
        if (status) filters.status = status;
        if (category) filters.category = category;
        
        const complaints = complaintSystem.getAllComplaints(filters);
        
        const container = document.getElementById('allComplaintsList');
        
        if (complaints.length === 0) {
            container.innerHTML = '<p class="empty-state">No complaints found matching your criteria.</p>';
            return;
        }
        
        container.innerHTML = complaints.map(complaint => `
            <div class="complaint-item">
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
 * Load and display users
 */
function loadUsers() {
    try {
        const allUsers = authSystem.getAllUsers();
        
        let filteredUsers = allUsers;
        if (currentUserFilter !== 'all') {
            filteredUsers = allUsers.filter(u => u.role === currentUserFilter);
        }
        
        const container = document.getElementById('usersList');
        
        if (filteredUsers.length === 0) {
            container.innerHTML = '<p class="empty-state">No users found.</p>';
            return;
        }
        
        container.innerHTML = filteredUsers.map(user => {
            const initials = user.fullName.split(' ').map(n => n[0]).join('');
            return `
                <div class="user-card">
                    <div class="user-card-header">
                        <div style="display: flex; align-items: center;">
                            <div class="user-avatar">${initials}</div>
                            <div class="user-info">
                                <h4>${user.fullName}</h4>
                                <span class="user-role role-${user.role}">${capitalize(user.role)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="user-card-meta">
                        <span>📧 ${user.email}</span>
                        <span>📱 ${user.phone || 'N/A'}</span>
                        <span>📍 ${user.city || 'N/A'}</span>
                        <span>📅 Joined: ${formatDate(user.createdAt)}</span>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error("[v0] Error loading users:", error);
    }
}

/**
 * Filter users by role
 */
function filterUsers(role) {
    currentUserFilter = role;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadUsers();
}

/**
 * Load escalations
 */
function loadEscalations() {
    try {
        const escalations = escalationSystem.getMyEscalations();
        
        // Calculate stats
        const pending = escalations.filter(e => e.status === 'pending').length;
        const acknowledged = escalations.filter(e => e.status === 'acknowledged').length;
        const resolved = escalations.filter(e => e.status === 'resolved').length;
        
        document.getElementById('pendingEscalations').textContent = pending;
        document.getElementById('acknowledgedEscalations').textContent = acknowledged;
        document.getElementById('resolvedEscalations').textContent = resolved;
        
        // Display escalations list
        const container = document.getElementById('escalationsList');
        
        if (escalations.length === 0) {
            container.innerHTML = '<p class="empty-state">No escalations at this time.</p>';
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
                    <div class="meta-item">👤 By: ${esc.createdByName}</div>
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
        if (sectionId === 'all-complaints') {
            loadAllComplaints();
        } else if (sectionId === 'user-management') {
            loadUsers();
        } else if (sectionId === 'escalations') {
            loadEscalations();
        }
    }
}

/**
 * Export complaints to CSV
 */
function exportComplaints() {
    try {
        const complaints = complaintSystem.getAllComplaints();
        
        let csv = 'ID,Title,Status,Priority,Category,Citizen,Email,Phone,City,Date Submitted\n';
        
        complaints.forEach(c => {
            csv += `"${c.id}","${c.title}","${c.status}","${c.priority}","${c.category}","${c.citizenName}","${c.citizenEmail}","${c.citizenPhone}","${c.location.city}","${c.createdAt}"\n`;
        });
        
        // Download as file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `complaints-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        alert('Complaints exported successfully!');
    } catch (error) {
        console.error("[v0] Export error:", error);
        alert('Error exporting complaints');
    }
}

/**
 * Generate reports
 */
function generateReport(type) {
    console.log("[v0] Generating report:", type);
    alert(`Generating ${type} report... This would send data to generate a PDF/Excel file.`);
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
 * Go to settings
 */
function goToSettings() {
    alert('System settings coming soon!');
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
window.filterUsers = filterUsers;
window.exportComplaints = exportComplaints;
window.generateReport = generateReport;
window.markNotificationAsRead = markNotificationAsRead;
