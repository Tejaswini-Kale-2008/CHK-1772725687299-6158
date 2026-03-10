// Complaint Management System
// Handles CRUD operations for complaints and tracking

import { COMPLAINT_STATUS, PRIORITY_LEVELS, USER_ROLES } from './firebase-config.js';
import { authSystem } from './auth.js';

class ComplaintSystem {
  constructor() {
    this.complaints = this.loadComplaintsLocally();
  }

  /**
   * Submit a new complaint
   * @param {Object} complaintData - Complaint data
   * @returns {Promise<Object>} - Created complaint
   */
  async submitComplaint(complaintData) {
    const user = authSystem.getCurrentUser();
    
    if (!user) {
      throw new Error('User must be authenticated to submit a complaint');
    }

    if (!complaintData.title || !complaintData.description || !complaintData.category) {
      throw new Error('Title, description, and category are required');
    }

    console.log("[v0] Submitting complaint:", complaintData.title);

    try {
      const complaint = {
        id: this.generateComplaintID(),
        citizenId: user.id,
        citizenEmail: user.email,
        citizenName: user.fullName,
        citizenPhone: user.phone,
        title: complaintData.title,
        description: complaintData.description,
        category: complaintData.category,
        subCategory: complaintData.subCategory || '',
        location: {
          address: complaintData.address || '',
          city: complaintData.city || '',
          state: complaintData.state || '',
          zipCode: complaintData.zipCode || '',
          latitude: complaintData.latitude || null,
          longitude: complaintData.longitude || null
        },
        priority: complaintData.priority || PRIORITY_LEVELS.MEDIUM,
        status: COMPLAINT_STATUS.SUBMITTED,
        fileAttachments: complaintData.fileAttachments || [],
        tags: complaintData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedTo: null,
        assignedDepartment: complaintData.assignedDepartment || '',
        expectedResolutionDate: complaintData.expectedResolutionDate || null,
        resolutionNotes: '',
        rating: null,
        feedback: ''
      };

      this.saveComplaintLocally(complaint);
      
      // Dispatch complaint created event
      window.dispatchEvent(new CustomEvent('complaint:created', { detail: complaint }));

      return complaint;
    } catch (error) {
      console.error("[v0] Complaint submission error:", error);
      throw error;
    }
  }

  /**
   * Get complaint by ID
   * @param {string} complaintId - Complaint ID
   * @returns {Object|null} - Complaint or null
   */
  getComplaintById(complaintId) {
    return this.complaints[complaintId] || null;
  }

  /**
   * Get complaints for current user
   * @param {Object} filters - Filter options { status, priority, category, search }
   * @returns {Array<Object>} - Filtered complaints
   */
  getMyComplaints(filters = {}) {
    const user = authSystem.getCurrentUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    let complaints = Object.values(this.complaints).filter(
      c => c.citizenId === user.id
    );

    // Apply filters
    if (filters.status) {
      complaints = complaints.filter(c => c.status === filters.status);
    }
    if (filters.priority) {
      complaints = complaints.filter(c => c.priority === filters.priority);
    }
    if (filters.category) {
      complaints = complaints.filter(c => c.category === filters.category);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      complaints = complaints.filter(c =>
        c.title.toLowerCase().includes(search) ||
        c.description.toLowerCase().includes(search) ||
        c.id.toLowerCase().includes(search)
      );
    }

    return complaints.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  /**
   * Get all complaints (officials and admins)
   * @param {Object} filters - Filter options
   * @returns {Array<Object>} - Filtered complaints
   */
  getAllComplaints(filters = {}) {
    const user = authSystem.getCurrentUser();
    
    if (!user || !authSystem.hasAnyRole([USER_ROLES.OFFICIAL, USER_ROLES.ADMIN])) {
      throw new Error('Unauthorized: Only officials and admins can view all complaints');
    }

    let complaints = Object.values(this.complaints);

    // Officials can only see their department's complaints
    if (authSystem.hasRole(USER_ROLES.OFFICIAL)) {
      complaints = complaints.filter(c => 
        c.assignedDepartment === user.department || !c.assignedDepartment
      );
    }

    // Apply filters
    if (filters.status) {
      complaints = complaints.filter(c => c.status === filters.status);
    }
    if (filters.priority) {
      complaints = complaints.filter(c => c.priority === filters.priority);
    }
    if (filters.category) {
      complaints = complaints.filter(c => c.category === filters.category);
    }
    if (filters.assignedTo) {
      complaints = complaints.filter(c => c.assignedTo === filters.assignedTo);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      complaints = complaints.filter(c =>
        c.title.toLowerCase().includes(search) ||
        c.description.toLowerCase().includes(search) ||
        c.citizenName.toLowerCase().includes(search) ||
        c.id.toLowerCase().includes(search)
      );
    }

    return complaints.sort((a, b) => {
      // Sort by priority first, then by date
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  /**
   * Update complaint status
   * @param {string} complaintId - Complaint ID
   * @param {string} status - New status
   * @param {string} notes - Status update notes
   * @returns {Promise<Object>} - Updated complaint
   */
  async updateComplaintStatus(complaintId, status, notes = '') {
    const user = authSystem.getCurrentUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const complaint = this.getComplaintById(complaintId);
    
    if (!complaint) {
      throw new Error('Complaint not found');
    }

    // Check authorization
    if (!authSystem.hasAnyRole([USER_ROLES.OFFICIAL, USER_ROLES.ADMIN])) {
      throw new Error('Unauthorized: Only officials and admins can update complaint status');
    }

    console.log("[v0] Updating complaint status:", complaintId, "to", status);

    try {
      complaint.status = status;
      complaint.updatedAt = new Date().toISOString();

      // Add status update record
      if (notes) {
        if (!complaint.updates) {
          complaint.updates = [];
        }
        complaint.updates.push({
          timestamp: new Date().toISOString(),
          status: status,
          notes: notes,
          updatedBy: user.fullName,
          updatedByRole: user.role
        });
      }

      this.saveComplaintLocally(complaint);
      
      // Dispatch status update event
      window.dispatchEvent(new CustomEvent('complaint:updated', { 
        detail: { complaintId, status, notes }
      }));

      return complaint;
    } catch (error) {
      console.error("[v0] Status update error:", error);
      throw error;
    }
  }

  /**
   * Assign complaint to official
   * @param {string} complaintId - Complaint ID
   * @param {string} assignedTo - Official ID
   * @param {string} department - Department
   * @returns {Promise<Object>} - Updated complaint
   */
  async assignComplaint(complaintId, assignedTo, department) {
    const user = authSystem.getCurrentUser();
    
    if (!user || !authSystem.hasRole(USER_ROLES.ADMIN)) {
      throw new Error('Unauthorized: Only admins can assign complaints');
    }

    const complaint = this.getComplaintById(complaintId);
    
    if (!complaint) {
      throw new Error('Complaint not found');
    }

    console.log("[v0] Assigning complaint to:", assignedTo);

    try {
      complaint.assignedTo = assignedTo;
      complaint.assignedDepartment = department;
      complaint.updatedAt = new Date().toISOString();

      this.saveComplaintLocally(complaint);
      
      window.dispatchEvent(new CustomEvent('complaint:assigned', { 
        detail: { complaintId, assignedTo, department }
      }));

      return complaint;
    } catch (error) {
      console.error("[v0] Assignment error:", error);
      throw error;
    }
  }

  /**
   * Add update/comment to complaint
   * @param {string} complaintId - Complaint ID
   * @param {string} message - Update message
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - Updated complaint
   */
  async addComplaintUpdate(complaintId, message, metadata = {}) {
    const user = authSystem.getCurrentUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const complaint = this.getComplaintById(complaintId);
    
    if (!complaint) {
      throw new Error('Complaint not found');
    }

    // Check authorization - citizen can only update their own, officials/admins can update any
    if (authSystem.hasRole(USER_ROLES.CITIZEN) && complaint.citizenId !== user.id) {
      throw new Error('Unauthorized: Can only update own complaints');
    }

    console.log("[v0] Adding update to complaint:", complaintId);

    try {
      if (!complaint.updates) {
        complaint.updates = [];
      }

      const update = {
        id: 'update_' + Date.now(),
        timestamp: new Date().toISOString(),
        message: message,
        updatedBy: user.fullName,
        updatedByRole: user.role,
        isPublic: metadata.isPublic !== false, // Default to public
        ...metadata
      };

      complaint.updates.push(update);
      complaint.updatedAt = new Date().toISOString();

      this.saveComplaintLocally(complaint);
      
      window.dispatchEvent(new CustomEvent('complaint:update-added', { 
        detail: { complaintId, update }
      }));

      return update;
    } catch (error) {
      console.error("[v0] Update error:", error);
      throw error;
    }
  }

  /**
   * Rate and provide feedback on complaint resolution
   * @param {string} complaintId - Complaint ID
   * @param {number} rating - Rating 1-5
   * @param {string} feedback - Feedback text
   * @returns {Promise<Object>} - Updated complaint
   */
  async rateComplaintResolution(complaintId, rating, feedback = '') {
    const user = authSystem.getCurrentUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const complaint = this.getComplaintById(complaintId);
    
    if (!complaint) {
      throw new Error('Complaint not found');
    }

    if (complaint.citizenId !== user.id) {
      throw new Error('Unauthorized: Can only rate own complaints');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    console.log("[v0] Rating complaint:", complaintId, "rating:", rating);

    try {
      complaint.rating = rating;
      complaint.feedback = feedback;
      complaint.updatedAt = new Date().toISOString();

      this.saveComplaintLocally(complaint);
      
      window.dispatchEvent(new CustomEvent('complaint:rated', { 
        detail: { complaintId, rating, feedback }
      }));

      return complaint;
    } catch (error) {
      console.error("[v0] Rating error:", error);
      throw error;
    }
  }

  /**
   * Get complaint statistics
   * @returns {Object} - Statistics object
   */
  getStatistics() {
    const complaints = Object.values(this.complaints);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: complaints.length,
      totalThisMonth: complaints.filter(c => new Date(c.createdAt) > thirtyDaysAgo).length,
      byStatus: {
        submitted: complaints.filter(c => c.status === COMPLAINT_STATUS.SUBMITTED).length,
        acknowledged: complaints.filter(c => c.status === COMPLAINT_STATUS.ACKNOWLEDGED).length,
        inProgress: complaints.filter(c => c.status === COMPLAINT_STATUS.IN_PROGRESS).length,
        escalated: complaints.filter(c => c.status === COMPLAINT_STATUS.ESCALATED).length,
        resolved: complaints.filter(c => c.status === COMPLAINT_STATUS.RESOLVED).length,
        closed: complaints.filter(c => c.status === COMPLAINT_STATUS.CLOSED).length
      },
      byPriority: {
        low: complaints.filter(c => c.priority === PRIORITY_LEVELS.LOW).length,
        medium: complaints.filter(c => c.priority === PRIORITY_LEVELS.MEDIUM).length,
        high: complaints.filter(c => c.priority === PRIORITY_LEVELS.HIGH).length,
        critical: complaints.filter(c => c.priority === PRIORITY_LEVELS.CRITICAL).length
      },
      averageResolutionTime: this.calculateAverageResolutionTime(complaints),
      satisfactionRating: this.calculateAverageSatisfaction(complaints)
    };
  }

  // Helper methods

  /**
   * Generate complaint ID
   * @returns {string}
   */
  generateComplaintID() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `CR-${timestamp}-${random}`;
  }

  /**
   * Save complaint to localStorage
   * @param {Object} complaint - Complaint to save
   */
  saveComplaintLocally(complaint) {
    this.complaints[complaint.id] = complaint;
    const complaints = JSON.parse(localStorage.getItem('civicresolve_complaints') || '{}');
    complaints[complaint.id] = complaint;
    localStorage.setItem('civicresolve_complaints', JSON.stringify(complaints));
  }

  /**
   * Load complaints from localStorage
   * @returns {Object}
   */
  loadComplaintsLocally() {
    try {
      return JSON.parse(localStorage.getItem('civicresolve_complaints') || '{}');
    } catch {
      return {};
    }
  }

  /**
   * Calculate average resolution time
   * @param {Array<Object>} complaints - Array of complaints
   * @returns {number} - Average time in hours
   */
  calculateAverageResolutionTime(complaints) {
    const resolved = complaints.filter(c => c.status === COMPLAINT_STATUS.RESOLVED || c.status === COMPLAINT_STATUS.CLOSED);
    
    if (resolved.length === 0) return 0;

    const totalTime = resolved.reduce((sum, c) => {
      const created = new Date(c.createdAt);
      const updated = new Date(c.updatedAt);
      const diffHours = (updated - created) / (1000 * 60 * 60);
      return sum + diffHours;
    }, 0);

    return Math.round(totalTime / resolved.length);
  }

  /**
   * Calculate average satisfaction rating
   * @param {Array<Object>} complaints - Array of complaints
   * @returns {number} - Average rating
   */
  calculateAverageSatisfaction(complaints) {
    const rated = complaints.filter(c => c.rating !== null);
    
    if (rated.length === 0) return 0;

    const totalRating = rated.reduce((sum, c) => sum + c.rating, 0);
    return (totalRating / rated.length).toFixed(1);
  }
}

export const complaintSystem = new ComplaintSystem();
export default ComplaintSystem;
