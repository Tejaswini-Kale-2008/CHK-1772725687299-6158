// Escalation Management JavaScript
// Handle escalations and notifications

import { authSystem } from './auth.js';
import { escalationSystem } from './escalation.js';
import { complaintSystem } from './complaints.js';

let currentEscalation = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log("[v0] Escalation management page initialized");
    
    if (!authSystem.isAuthenticated()) {
        window.location.href = '/';
        return;
    }
    
    setupUI();
    setupEventListeners();
    loadEscalations();
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
    document.getElementById('filterEscalationStatus').addEventListener('change', loadEscalations);
    document.getElementById('searchEscalation').addEventListener('input', loadEscalations);
}

/**
 * Load escalations
 */
function loadEscalations() {
    try {
        const status = document.getElementById('filterEscalationStatus').value;
        const search = document.getElementById('searchEscalation').value;
        
        const escalations = escalationSystem.getMyEscalations({ status, search });
        
        // Update stats
        updateEscalationStats(escalations);
        
        // Display escalations
        const container = document.getElementById('escalationsList');
        
        if (escalations.length === 0) {
            container.innerHTML = '<p class="empty-state">No escalations found.</p>';
            return;
        }
        
        container.innerHTML = escalations.map(esc => {
            const complaint = complaintSystem.getComplaintById(esc.complaintId);
            return `
                <div class="escalation-item" onclick="openEscalationModal('${esc.id}')">
                    <div class="escalation-item-header">
                        <div>
                            <div class="escalation-item-title">${esc.complaintTitle}</div>
                            <div class="escalation-item-id">Complaint: ${esc.complaintId}</div>
                        </div>
                        <span class="escalation-badge badge-${esc.status}">${capitalize(esc.status)}</span>
                    </div>
                    <div class="escalation-meta">
                        <div><span class="meta-label">Reason:</span> ${esc.reason}</div>
                        <div><span class="meta-label">Priority:</span> <strong>${capitalize(esc.priority)}</strong></div>
                        <div><span class="meta-label">Created By:</span> ${esc.createdByName}</div>
                        <div><span class="meta-label">Date:</span> ${formatDate(esc.createdAt)}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error("[v0] Error loading escalations:", error);
    }
}

/**
 * Update escalation statistics
 */
function updateEscalationStats(escalations) {
    const pending = escalations.filter(e => e.status === 'pending').length;
    const acknowledged = escalations.filter(e => e.status === 'acknowledged').length;
    const resolved = escalations.filter(e => e.status === 'resolved').length;
    
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('acknowledgedCount').textContent = acknowledged;
    document.getElementById('resolvedCount').textContent = resolved;
    
    // Calculate average resolution time
    const resolvedEscalations = escalations.filter(e => e.status === 'resolved' && e.resolvedAt);
    if (resolvedEscalations.length > 0) {
        const avgTime = resolvedEscalations.reduce((sum, e) => {
            const created = new Date(e.createdAt);
            const resolved = new Date(e.resolvedAt);
            const hours = (resolved - created) / (1000 * 60 * 60);
            return sum + hours;
        }, 0) / resolvedEscalations.length;
        
        const days = Math.floor(avgTime / 24);
        const hours = Math.floor(avgTime % 24);
        document.getElementById('avgTime').textContent = `${days}d ${hours}h`;
    }
    
    // Update notification badge
    updateNotificationBadge();
}

/**
 * Open escalation details modal
 */
function openEscalationModal(escalationId) {
    try {
        const escalation = escalationSystem.getEscalationById(escalationId);
        if (!escalation) {
            alert('Escalation not found');
            return;
        }
        
        currentEscalation = escalation;
        const complaint = complaintSystem.getComplaintById(escalation.complaintId);
        
        // Generate details HTML
        const detailsHtml = `
            <div class="detail-item">
                <span class="detail-label">Complaint ID:</span>
                <span class="detail-value">${escalation.complaintId}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Complaint Title:</span>
                <span class="detail-value">${escalation.complaintTitle}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Category:</span>
                <span class="detail-value">${capitalize(complaint.category)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Priority:</span>
                <span class="detail-value"><strong>${capitalize(escalation.priority)}</strong></span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${complaint.location.city}, ${complaint.location.state}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${capitalize(escalation.status)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Escalation Reason:</span>
                <span class="detail-value">${escalation.reason}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Escalated By:</span>
                <span class="detail-value">${escalation.createdByName}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Created Date:</span>
                <span class="detail-value">${formatDate(escalation.createdAt)}</span>
            </div>
            ${escalation.description ? `
            <div class="detail-item">
                <span class="detail-label">Description:</span>
                <span class="detail-value">${escalation.description}</span>
            </div>
            ` : ''}
            ${escalation.resolutionNotes ? `
            <div class="detail-item">
                <span class="detail-label">Resolution Notes:</span>
                <span class="detail-value">${escalation.resolutionNotes}</span>
            </div>
            ` : ''}
        `;
        
        document.getElementById('escalationDetails').innerHTML = detailsHtml;
        
        // Update action buttons
        const acknowledgeBtn = document.getElementById('acknowledgeBtn');
        const resolveBtn = document.getElementById('resolveBtn');
        const resolveForm = document.getElementById('resolveForm');
        
        if (escalation.status === 'pending') {
            acknowledgeBtn.style.display = 'inline-block';
            resolveBtn.style.display = 'inline-block';
        } else if (escalation.status === 'acknowledged') {
            acknowledgeBtn.style.display = 'none';
            resolveBtn.style.display = 'inline-block';
        } else {
            acknowledgeBtn.style.display = 'none';
            resolveBtn.style.display = 'none';
        }
        
        resolveForm.style.display = 'none';
        document.getElementById('resolutionStatus').value = 'resolved';
        document.getElementById('resolutionNotes').value = '';
        
        // Show modal
        document.getElementById('escalationModal').classList.add('show');
        
    } catch (error) {
        console.error("[v0] Error opening escalation modal:", error);
        alert('Error opening escalation details');
    }
}

/**
 * Close escalation modal
 */
function closeEscalationModal() {
    document.getElementById('escalationModal').classList.remove('show');
    currentEscalation = null;
}

/**
 * Acknowledge escalation
 */
async function acknowledgeEscalation() {
    if (!currentEscalation) return;
    
    try {
        await escalationSystem.acknowledgeEscalation(currentEscalation.id);
        alert('Escalation acknowledged successfully!');
        closeEscalationModal();
        loadEscalations();
    } catch (error) {
        console.error("[v0] Error acknowledging escalation:", error);
        alert('Error acknowledging escalation');
    }
}

/**
 * Show resolve form
 */
function showResolveForm() {
    document.getElementById('resolveForm').style.display = 'block';
}

/**
 * Submit resolution
 */
async function submitResolution() {
    if (!currentEscalation) return;
    
    const notes = document.getElementById('resolutionNotes').value;
    const status = document.getElementById('resolutionStatus').value;
    
    if (!notes.trim()) {
        alert('Please enter resolution notes');
        return;
    }
    
    try {
        await escalationSystem.resolveEscalation(currentEscalation.id, {
            notes: notes,
            status: status
        });
        
        alert('Escalation resolved successfully!');
        closeEscalationModal();
        loadEscalations();
        
    } catch (error) {
        console.error("[v0] Error resolving escalation:", error);
        alert('Error resolving escalation');
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
                <small style="color: #999;">${formatDate(notif.createdAt)}</small>
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
 * Save notification preferences
 */
function savePreferences() {
    try {
        const prefs = {
            emailOnEscalation: document.getElementById('notifEscalation').checked,
            emailOnResolution: document.getElementById('notifResolution').checked,
            dailySummary: document.getElementById('notifDaily').checked,
            smsOnCritical: document.getElementById('notifSMS').checked
        };
        
        // Store preferences (would normally save to database)
        localStorage.setItem('escalation-prefs', JSON.stringify(prefs));
        alert('Preferences saved successfully!');
        
    } catch (error) {
        console.error("[v0] Error saving preferences:", error);
        alert('Error saving preferences');
    }
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

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function capitalize(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Export functions for HTML onclick handlers
window.openEscalationModal = openEscalationModal;
window.closeEscalationModal = closeEscalationModal;
window.acknowledgeEscalation = acknowledgeEscalation;
window.showResolveForm = showResolveForm;
window.submitResolution = submitResolution;
window.markNotificationAsRead = markNotificationAsRead;
window.savePreferences = savePreferences;
window.goBack = goBack;
window.handleLogout = handleLogout;
