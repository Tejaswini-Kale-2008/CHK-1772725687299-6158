// Escalation and Notification System
// Handles complaint escalation and real-time notifications

import { USER_ROLES, COMPLAINT_STATUS } from './firebase-config.js';
import { authSystem } from './auth.js';
import { complaintSystem } from './complaints.js';

class EscalationSystem {
  constructor() {
    this.escalations = this.loadEscalationsLocally();
    this.notifications = this.loadNotificationsLocally();
    this.escalationRules = this.initializeEscalationRules();
  }

  /**
   * Initialize escalation rules
   * @returns {Object} - Escalation rules
   */
  initializeEscalationRules() {
    return {
      autoEscalate: {
        enabled: true,
        thresholds: {
          high: { daysBeforeEscalate: 7, escalateTo: 'senior_official' },
          critical: { daysBeforeEscalate: 3, escalateTo: 'department_head' }
        }
      },
      manualEscalation: {
        enabled: true,
        reasons: [
          'Stuck for too long',
          'Needs higher authority',
          'Citizen requested',
          'Policy violation',
          'Public interest issue'
        ]
      }
    };
  }

  /**
   * Create an escalation
   * @param {string} complaintId - Complaint ID
   * @param {string} reason - Escalation reason
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - Escalation object
   */
  async createEscalation(complaintId, reason, metadata = {}) {
    const user = authSystem.getCurrentUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const complaint = complaintSystem.getComplaintById(complaintId);
    
    if (!complaint) {
      throw new Error('Complaint not found');
    }

    console.log("[v0] Creating escalation for complaint:", complaintId);

    try {
      const escalation = {
        id: 'esc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        complaintId: complaintId,
        citizenId: complaint.citizenId,
        complaintTitle: complaint.title,
        reason: reason,
        createdBy: user.id,
        createdByName: user.fullName,
        createdByRole: user.role,
        createdAt: new Date().toISOString(),
        escalatedTo: metadata.escalatedTo || 'admin',
        status: 'pending', // pending, acknowledged, resolved
        priority: complaint.priority,
        notes: metadata.notes || '',
        attachments: metadata.attachments || []
      };

      this.saveEscalationLocally(escalation);

      // Update complaint status
      await complaintSystem.updateComplaintStatus(
        complaintId,
        COMPLAINT_STATUS.ESCALATED,
        `Escalated: ${reason}`
      );

      // Create notifications
      this.createNotification(
        'escalation_created',
        'Complaint Escalated',
        `Your complaint "${complaint.title}" has been escalated.`,
        complaint.citizenId,
        'warning'
      );

      // Notify admins
      this.createNotification(
        'escalation_admin',
        'New Escalation',
        `Complaint "${complaint.title}" has been escalated. Reason: ${reason}`,
        null,
        'critical',
        { forRole: 'admin', complaintId }
      );

      window.dispatchEvent(new CustomEvent('escalation:created', { detail: escalation }));

      return escalation;
    } catch (error) {
      console.error("[v0] Escalation creation error:", error);
      throw error;
    }
  }

  /**
   * Check for auto-escalation eligibility
   * @param {Object} complaint - Complaint object
   * @returns {Promise<Object|null>} - Escalation if created, null otherwise
   */
  async checkAutoEscalation(complaint) {
    if (!this.escalationRules.autoEscalate.enabled) {
      return null;
    }

    const rules = this.escalationRules.autoEscalate.thresholds;
    const rule = rules[complaint.priority];

    if (!rule) return null;

    const createdDate = new Date(complaint.createdAt);
    const daysElapsed = (new Date() - createdDate) / (1000 * 60 * 60 * 24);

    if (daysElapsed >= rule.daysBeforeEscalate && complaint.status !== COMPLAINT_STATUS.ESCALATED) {
      console.log("[v0] Auto-escalating complaint:", complaint.id);
      
      return await this.createEscalation(
        complaint.id,
        `Auto-escalation: ${rule.daysBeforeEscalate} days threshold reached`,
        { escalatedTo: rule.escalateTo }
      );
    }

    return null;
  }

  /**
   * Get escalations for current user
   * @param {Object} filters - Filter options
   * @returns {Array<Object>} - Filtered escalations
   */
  getMyEscalations(filters = {}) {
    const user = authSystem.getCurrentUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    let escalations = Object.values(this.escalations);

    if (authSystem.hasRole(USER_ROLES.ADMIN)) {
      // Admins see all escalations
      escalations = escalations.filter(e => e.escalatedTo === 'admin' || true);
    } else if (authSystem.hasRole(USER_ROLES.CITIZEN)) {
      // Citizens see only their escalations
      escalations = escalations.filter(e => e.citizenId === user.id);
    } else if (authSystem.hasRole(USER_ROLES.OFFICIAL)) {
      // Officials see escalations from their assigned complaints
      escalations = escalations.filter(e => {
        const complaint = complaintSystem.getComplaintById(e.complaintId);
        return complaint && complaint.assignedTo === user.id;
      });
    }

    // Apply filters
    if (filters.status) {
      escalations = escalations.filter(e => e.status === filters.status);
    }

    return escalations.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  /**
   * Update escalation status
   * @param {string} escalationId - Escalation ID
   * @param {string} newStatus - New status
   * @param {string} notes - Resolution notes
   * @returns {Promise<Object>} - Updated escalation
   */
  async updateEscalationStatus(escalationId, newStatus, notes = '') {
    const user = authSystem.getCurrentUser();
    
    if (!user || !authSystem.hasRole(USER_ROLES.ADMIN)) {
      throw new Error('Unauthorized: Only admins can update escalation status');
    }

    const escalation = this.escalations[escalationId];
    
    if (!escalation) {
      throw new Error('Escalation not found');
    }

    console.log("[v0] Updating escalation status:", escalationId, "to", newStatus);

    try {
      escalation.status = newStatus;
      escalation.resolvedAt = new Date().toISOString();
      escalation.resolvedBy = user.id;
      escalation.resolutionNotes = notes;

      this.saveEscalationLocally(escalation);

      // Notify citizen
      const complaint = complaintSystem.getComplaintById(escalation.complaintId);
      if (complaint) {
        this.createNotification(
          'escalation_resolved',
          'Escalation Resolved',
          `The escalation for your complaint has been ${newStatus}.`,
          escalation.citizenId,
          newStatus === 'resolved' ? 'success' : 'info'
        );
      }

      window.dispatchEvent(new CustomEvent('escalation:updated', { detail: escalation }));

      return escalation;
    } catch (error) {
      console.error("[v0] Escalation update error:", error);
      throw error;
    }
  }

  /**
   * Create a notification
   * @param {string} type - Notification type
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} userId - User ID (null for broadcast)
   * @param {string} severity - Severity level (info, success, warning, critical)
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Notification object
   */
  createNotification(type, title, message, userId, severity = 'info', metadata = {}) {
    const notification = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: type,
      title: title,
      message: message,
      userId: userId,
      severity: severity,
      read: false,
      createdAt: new Date().toISOString(),
      ...metadata
    };

    this.saveNotificationLocally(notification);

    // Dispatch notification event
    window.dispatchEvent(new CustomEvent('notification:created', { detail: notification }));

    // Trigger browser notification if user granted permission
    if (Notification.permission === 'granted' && userId === authSystem.getCurrentUser()?.id) {
      new Notification(title, {
        body: message,
        icon: '/images/logo.png',
        tag: type,
        requireInteraction: severity === 'critical'
      });
    }

    return notification;
  }

  /**
   * Get notifications for current user
   * @param {Object} filters - Filter options { read, type, severity }
   * @returns {Array<Object>} - Notifications
   */
  getMyNotifications(filters = {}) {
    const user = authSystem.getCurrentUser();
    
    if (!user) {
      return [];
    }

    let notifications = Object.values(this.notifications).filter(n =>
      n.userId === user.id || (n.userId === null && n.forRole === user.role)
    );

    if (filters.read !== undefined) {
      notifications = notifications.filter(n => n.read === filters.read);
    }

    if (filters.type) {
      notifications = notifications.filter(n => n.type === filters.type);
    }

    if (filters.severity) {
      notifications = notifications.filter(n => n.severity === filters.severity);
    }

    return notifications.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} - Updated notification
   */
  async markNotificationAsRead(notificationId) {
    const notification = this.notifications[notificationId];
    
    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.read = true;
    notification.readAt = new Date().toISOString();

    this.saveNotificationLocally(notification);
    
    window.dispatchEvent(new CustomEvent('notification:read', { detail: notification }));

    return notification;
  }

  /**
   * Mark all notifications as read
   * @returns {Promise<number>} - Number of notifications marked as read
   */
  async markAllNotificationsAsRead() {
    const user = authSystem.getCurrentUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    let count = 0;
    Object.values(this.notifications).forEach(notification => {
      if ((notification.userId === user.id || notification.forRole === user.role) && !notification.read) {
        notification.read = true;
        notification.readAt = new Date().toISOString();
        this.saveNotificationLocally(notification);
        count++;
      }
    });

    return count;
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<void>}
   */
  async deleteNotification(notificationId) {
    delete this.notifications[notificationId];
    const stored = JSON.parse(localStorage.getItem('civicresolve_notifications') || '{}');
    delete stored[notificationId];
    localStorage.setItem('civicresolve_notifications', JSON.stringify(stored));
  }

  /**
   * Request notification permission
   * @returns {Promise<string>} - Permission status
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Get unread notification count
   * @returns {number}
   */
  getUnreadCount() {
    return this.getMyNotifications({ read: false }).length;
  }

  // Helper methods

  /**
   * Save escalation to localStorage
   * @param {Object} escalation - Escalation to save
   */
  saveEscalationLocally(escalation) {
    this.escalations[escalation.id] = escalation;
    const stored = JSON.parse(localStorage.getItem('civicresolve_escalations') || '{}');
    stored[escalation.id] = escalation;
    localStorage.setItem('civicresolve_escalations', JSON.stringify(stored));
  }

  /**
   * Load escalations from localStorage
   * @returns {Object}
   */
  loadEscalationsLocally() {
    try {
      return JSON.parse(localStorage.getItem('civicresolve_escalations') || '{}');
    } catch {
      return {};
    }
  }

  /**
   * Save notification to localStorage
   * @param {Object} notification - Notification to save
   */
  saveNotificationLocally(notification) {
    this.notifications[notification.id] = notification;
    const stored = JSON.parse(localStorage.getItem('civicresolve_notifications') || '{}');
    stored[notification.id] = notification;
    localStorage.setItem('civicresolve_notifications', JSON.stringify(stored));
  }

  /**
   * Load notifications from localStorage
   * @returns {Object}
   */
  loadNotificationsLocally() {
    try {
      return JSON.parse(localStorage.getItem('civicresolve_notifications') || '{}');
    } catch {
      return {};
    }
  }
}

export const escalationSystem = new EscalationSystem();
export default EscalationSystem;
