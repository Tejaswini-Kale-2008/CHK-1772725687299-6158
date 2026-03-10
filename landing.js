// Landing Page JavaScript
// Handles authentication forms, modals, and navigation

import { authSystem } from './auth.js';
import { USER_ROLES } from './firebase-config.js';

// Initialize landing page
document.addEventListener('DOMContentLoaded', function() {
    console.log("[v0] Landing page initialized");
    
    // Check if user is already logged in
    if (authSystem.isAuthenticated()) {
        redirectToDashboard();
    }
    
    // Setup event listeners
    setupAuthForms();
    setupNavigation();
    setupContactForm();
});

/**
 * Setup authentication forms
 */
function setupAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    console.log("[v0] Attempting login for:", email);
    
    try {
        const user = await authSystem.login(email, password);
        console.log("[v0] Login successful for:", user.email);
        
        // Close modal
        closeLoginModal();
        
        // Redirect to appropriate dashboard
        redirectToDashboard();
        
    } catch (error) {
        showErrorMessage('Login failed: ' + error.message);
    }
}

/**
 * Handle signup form submission
 */
async function handleSignup(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const phone = document.getElementById('signupPhone').value;
    const role = document.getElementById('signupRole').value;
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
    
    // Validate passwords match
    if (password !== passwordConfirm) {
        showErrorMessage('Passwords do not match');
        return;
    }
    
    console.log("[v0] Attempting signup for:", email);
    
    try {
        const user = await authSystem.register({
            fullName,
            email,
            phone,
            role: role === 'official' ? USER_ROLES.OFFICIAL : USER_ROLES.CITIZEN,
            password
        });
        
        console.log("[v0] Signup successful for:", user.email);
        
        // Auto-login after signup
        await authSystem.login(email, password);
        
        // Close modal
        closeSignupModal();
        
        // Redirect to appropriate dashboard
        redirectToDashboard();
        
    } catch (error) {
        showErrorMessage('Signup failed: ' + error.message);
    }
}

/**
 * Redirect to appropriate dashboard based on user role
 */
function redirectToDashboard() {
    const user = authSystem.getCurrentUser();
    
    if (!user) return;
    
    console.log("[v0] Redirecting to dashboard for role:", user.role);
    
    let dashboardUrl = '/dashboard.html'; // Default for citizen
    
    if (user.role === USER_ROLES.OFFICIAL) {
        dashboardUrl = '/pages/official-dashboard.html';
    } else if (user.role === USER_ROLES.ADMIN) {
        dashboardUrl = '/pages/admin-dashboard.html';
    } else {
        dashboardUrl = '/pages/citizen-dashboard.html';
    }
    
    // Small delay to ensure session is saved
    setTimeout(() => {
        window.location.href = dashboardUrl;
    }, 500);
}

/**
 * Setup navigation interactions
 */
function setupNavigation() {
    const navbarToggle = document.getElementById('navbarToggle');
    const navbarMenu = document.getElementById('navbarMenu');
    
    if (navbarToggle) {
        navbarToggle.addEventListener('click', function() {
            navbarMenu.style.display = navbarMenu.style.display === 'flex' ? 'none' : 'flex';
        });
    }
}

/**
 * Setup contact form
 */
function setupContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            console.log("[v0] Contact form submitted:", Object.fromEntries(formData));
            
            // Show success message
            showSuccessMessage('Thank you for your message. We will get back to you soon!');
            contactForm.reset();
        });
    }
}

/**
 * Show login modal
 */
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('show');
    }
}

/**
 * Close login modal
 */
function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('show');
        document.getElementById('loginForm').reset();
    }
}

/**
 * Show signup modal
 */
function showSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) {
        modal.classList.add('show');
    }
}

/**
 * Close signup modal
 */
function closeSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) {
        modal.classList.remove('show');
        document.getElementById('signupForm').reset();
    }
}

/**
 * Switch from signup to login modal
 */
function switchToLogin() {
    closeSignupModal();
    showLoginModal();
}

/**
 * Switch from login to signup modal
 */
function switchToSignup() {
    closeLoginModal();
    showSignupModal();
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    console.error("[v0] Error:", message);
    alert(message); // In production, use a toast notification system
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    console.log("[v0] Success:", message);
    alert(message); // In production, use a toast notification system
}

// Close modals when clicking outside content
document.addEventListener('click', function(event) {
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === signupModal) {
        closeSignupModal();
    }
});

// Export functions for use in HTML
window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.showSignupModal = showSignupModal;
window.closeSignupModal = closeSignupModal;
window.switchToLogin = switchToLogin;
window.switchToSignup = switchToSignup;
