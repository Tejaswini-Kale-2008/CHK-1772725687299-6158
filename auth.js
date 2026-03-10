// Authentication System
// Handles user authentication, session management, and role-based access

import { USER_ROLES, COLLECTIONS } from './firebase-config.js';

class AuthSystem {
  constructor() {
    this.currentUser = null;
    this.userRole = null;
    this.sessionToken = null;
    this.loadSessionFromStorage();
  }

  /**
   * Register a new user
   * @param {Object} userData - User data { email, password, fullName, phone, role }
   * @returns {Promise<Object>} - User object
   */
  async register(userData) {
    console.log("[v0] Registering user:", userData.email);
    
    try {
      // Validate input
      if (!userData.email || !userData.password || !userData.fullName) {
        throw new Error('Email, password, and full name are required');
      }

      // Check password strength
      if (userData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Prepare user document
      const userDoc = {
        id: this.generateUID(),
        email: userData.email.toLowerCase(),
        fullName: userData.fullName,
        phone: userData.phone || '',
        role: userData.role || USER_ROLES.CITIZEN,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        avatar: null,
        address: userData.address || '',
        city: userData.city || '',
        state: userData.state || '',
        zipCode: userData.zipCode || ''
      };

      // Store user in localStorage (demo mode)
      // In production, this would be sent to Firebase
      this.saveUserLocally(userDoc);

      this.currentUser = userDoc;
      this.userRole = userDoc.role;
      this.createSession(userDoc);

      return userDoc;
    } catch (error) {
      console.error("[v0] Registration error:", error);
      throw error;
    }
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - User object
   */
  async login(email, password) {
    console.log("[v0] Logging in user:", email);
    
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Retrieve user from localStorage (demo mode)
      const user = this.getUserLocally(email);
      
      if (!user) {
        throw new Error('User not found');
      }

      // In production, verify password hash
      // This is a demo - just verify it exists
      this.currentUser = user;
      this.userRole = user.role;
      this.createSession(user);

      // Dispatch login event
      window.dispatchEvent(new CustomEvent('auth:login', { detail: user }));

      return user;
    } catch (error) {
      console.error("[v0] Login error:", error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    console.log("[v0] Logging out user");
    
    try {
      this.currentUser = null;
      this.userRole = null;
      this.sessionToken = null;
      localStorage.removeItem('civicresolve_session');
      localStorage.removeItem('civicresolve_user');
      
      // Dispatch logout event
      window.dispatchEvent(new CustomEvent('auth:logout'));
    } catch (error) {
      console.error("[v0] Logout error:", error);
      throw error;
    }
  }

  /**
   * Get current authenticated user
   * @returns {Object|null} - Current user or null
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get current user role
   * @returns {string|null} - User role or null
   */
  getUserRole() {
    return this.userRole;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.currentUser !== null && this.sessionToken !== null;
  }

  /**
   * Check if user has specific role
   * @param {string} role - Role to check
   * @returns {boolean}
   */
  hasRole(role) {
    return this.userRole === role;
  }

  /**
   * Check if user has one of multiple roles
   * @param {Array<string>} roles - Roles to check
   * @returns {boolean}
   */
  hasAnyRole(roles) {
    return roles.includes(this.userRole);
  }

  /**
   * Create a session for the user
   * @param {Object} user - User object
   */
  createSession(user) {
    this.sessionToken = this.generateSessionToken();
    const sessionData = {
      token: this.sessionToken,
      userId: user.id,
      role: user.role,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    
    localStorage.setItem('civicresolve_session', JSON.stringify(sessionData));
    localStorage.setItem('civicresolve_user', JSON.stringify(user));
  }

  /**
   * Load session from localStorage
   */
  loadSessionFromStorage() {
    try {
      const sessionData = localStorage.getItem('civicresolve_session');
      const userData = localStorage.getItem('civicresolve_user');

      if (sessionData && userData) {
        const session = JSON.parse(sessionData);
        const user = JSON.parse(userData);

        // Check if session is still valid
        if (new Date(session.expiresAt) > new Date()) {
          this.currentUser = user;
          this.userRole = user.role;
          this.sessionToken = session.token;
          console.log("[v0] Session loaded from storage for user:", user.email);
        } else {
          // Session expired
          localStorage.removeItem('civicresolve_session');
          localStorage.removeItem('civicresolve_user');
        }
      }
    } catch (error) {
      console.error("[v0] Error loading session:", error);
    }
  }

  /**
   * Update user profile
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated user
   */
  async updateProfile(updates) {
    if (!this.currentUser) {
      throw new Error('No user is currently authenticated');
    }

    try {
      const updatedUser = {
        ...this.currentUser,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.currentUser = updatedUser;
      localStorage.setItem('civicresolve_user', JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error("[v0] Profile update error:", error);
      throw error;
    }
  }

  /**
   * Reset password
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async resetPassword(email) {
    console.log("[v0] Resetting password for:", email);
    
    try {
      // In production, send password reset email via Firebase
      // For demo, just show confirmation
      return { success: true, message: 'Password reset email would be sent' };
    } catch (error) {
      console.error("[v0] Password reset error:", error);
      throw error;
    }
  }

  /**
   * Verify email
   * @param {string} email - Email to verify
   * @returns {Promise<void>}
   */
  async verifyEmail(email) {
    console.log("[v0] Verifying email:", email);
    
    try {
      // In production, send verification email via Firebase
      return { success: true, message: 'Verification email would be sent' };
    } catch (error) {
      console.error("[v0] Email verification error:", error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Generate unique user ID
   * @returns {string}
   */
  generateUID() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate session token
   * @returns {string}
   */
  generateSessionToken() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
  }

  /**
   * Save user to localStorage (demo mode)
   * @param {Object} user - User to save
   */
  saveUserLocally(user) {
    const users = JSON.parse(localStorage.getItem('civicresolve_users') || '{}');
    users[user.email] = user;
    localStorage.setItem('civicresolve_users', JSON.stringify(users));
  }

  /**
   * Get user from localStorage (demo mode)
   * @param {string} email - User email
   * @returns {Object|null}
   */
  getUserLocally(email) {
    const users = JSON.parse(localStorage.getItem('civicresolve_users') || '{}');
    return users[email.toLowerCase()] || null;
  }

  /**
   * Get all users (admin only)
   * @returns {Array<Object>}
   */
  getAllUsers() {
    if (this.userRole !== USER_ROLES.ADMIN) {
      throw new Error('Unauthorized: Only admins can view all users');
    }

    const users = JSON.parse(localStorage.getItem('civicresolve_users') || '{}');
    return Object.values(users);
  }

  /**
   * Get users by role
   * @param {string} role - User role to filter by
   * @returns {Array<Object>}
   */
  getUsersByRole(role) {
    if (this.userRole !== USER_ROLES.ADMIN) {
      throw new Error('Unauthorized: Only admins can filter users');
    }

    const users = JSON.parse(localStorage.getItem('civicresolve_users') || '{}');
    return Object.values(users).filter(user => user.role === role);
  }
}

// Export singleton instance
export const authSystem = new AuthSystem();
export default AuthSystem;
