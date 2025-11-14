// Main Application Script
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Initialize the application
async function initApp() {
    try {
        console.log('Initializing application...');
        
        // Check if Firebase config is available
        if (typeof firebaseConfig === 'undefined') {
            throw new Error('Firebase configuration not found');
        }
        
        // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Set global references
        window.auth = firebase.auth();
        window.database = firebase.database();
        
        console.log('Firebase initialized successfully');
        
        // Rest of your initialization code...
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showMessage('Error initializing application: ' + error.message, 'error');
        
        // Hide splash screen even on error
        setTimeout(() => {
            const splashScreen = document.getElementById('splash-screen');
            if (splashScreen) {
                splashScreen.classList.add('hidden');
            }
        }, 1000);
    }
}

// Handle user sign in
// In app.js - Update the handleUserSignedIn function
async function handleUserSignedIn(user) {
    try {
        // Update UI for signed in user
        document.getElementById('auth-link').textContent = 'Logout';
        document.getElementById('auth-link').onclick = logout;
        
        // Show profile avatar
        const profileAvatar = document.getElementById('profile-avatar');
        if (profileAvatar) {
            profileAvatar.textContent = (user.displayName || user.email).charAt(0).toUpperCase();
            profileAvatar.style.display = 'flex';
        }
        
        // Check if user exists in database, if not create user record
        const userRef = database.ref(`users/${user.uid}`);
        const userSnapshot = await userRef.once('value');
        
        if (!userSnapshot.exists()) {
            // Create new user record
            await userRef.set({
                username: user.displayName || user.email.split('@')[0],
                email: user.email,
                joinDate: new Date().toISOString(),
                isAdmin: false // Default to non-admin
            });
        } else {
            // Update user data if needed
            const userData = userSnapshot.val();
            if (!userData.joinDate) {
                await userRef.update({
                    joinDate: new Date().toISOString()
                });
            }
        }
        
        // Check admin status and show/hide admin link
        const userData = (await userRef.once('value')).val();
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            if (userData.isAdmin) {
                adminLink.style.display = 'block';
                console.log('User is admin, showing admin link');
            } else {
                adminLink.style.display = 'none';
                console.log('User is not admin, hiding admin link');
            }
        }
        
        // Update currentUser global variable
        window.currentUser = user;
        
        // Show current page or default to home
        const currentPage = window.location.hash.replace('#', '') || 'home';
        showPage(currentPage);
        
    } catch (error) {
        console.error('Error handling user sign in:', error);
        showMessage('Error loading user data', 'error');
    }
}

// Handle user sign out
function handleUserSignedOut() {
    // Update UI for signed out user
    document.getElementById('auth-link').textContent = 'Login';
    document.getElementById('auth-link').onclick = () => showAuthModal('login');
    
    // Hide profile avatar
    const profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar) {
        profileAvatar.style.display = 'none';
    }
    
    // Hide admin link
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.style.display = 'none';
    }
    
    // Show home page
    showPage('home');
}

// Initialize navigation
function initializeNavigation() {
    // Handle page navigation
    window.addEventListener('hashchange', () => {
        const page = window.location.hash.replace('#', '') || 'home';
        showPage(page);
    });
    
    // Set initial page
    const initialPage = window.location.hash.replace('#', '') || 'home';
    showPage(initialPage);
}

// Show specific page
function showPage(pageName) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.style.display = 'none';
    });
    
    // Show selected page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.style.display = 'block';
        
        // Update URL hash
        window.location.hash = pageName;
        
        // Load page-specific content
        loadPageContent(pageName);
    } else {
        // Fallback to home page
        document.getElementById('home-page').style.display = 'block';
        window.location.hash = 'home';
    }
    
    // Close any open modals
    closeAuthModal();
}

// Load page-specific content

// In app.js - Update the loadPageContent function with detailed logging
function loadPageContent(pageName) {
    console.log('Loading page content for:', pageName);
    
    switch (pageName) {
        case 'tracker':
            console.log('Calling loadTrackerCalendar');
            loadTrackerCalendar();
            break;
        case 'profile':
            console.log('Calling loadUserProfile');
            // Only load profile if user specifically requested it
            if (window.userRequestedProfile) {
                loadUserProfile();
            } else {
                // If profile was not specifically requested, redirect to home
                showPage('home');
            }
            break;
        case 'resources':
            console.log('Calling loadResources');
            loadResources();
            break;
        case 'admin':
            console.log('Admin page requested, currentUser:', currentUser);
            if (currentUser) {
                console.log('User is logged in, checking admin status...');
                checkAdminStatus().then(isAdmin => {
                    console.log('Admin check result:', isAdmin);
                    if (isAdmin) {
                        console.log('User is admin, calling loadAdminPage');
                        loadAdminPage();
                    } else {
                        console.log('User is NOT admin, redirecting to home');
                        showMessage('Access denied. Admin privileges required.', 'error');
                        showPage('home');
                    }
                }).catch(error => {
                    console.error('Error checking admin status:', error);
                    showPage('home');
                });
            } else {
                console.log('No user logged in, redirecting to home');
                showPage('home');
            }
            break;
        case 'home':
            console.log('Calling updateHomePage');
            updateHomePage();
            break;
        default:
            // Default to home page for any unknown page
            showPage('home');
            break;
    }
}


async function checkAdminStatus() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user in checkAdminStatus');
            return false;
        }
        
        console.log('Checking admin status for user:', user.uid);
        const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
        
        if (!userSnapshot.exists()) {
            console.log('User data not found in database');
            return false;
        }
        
        const userData = userSnapshot.val();
        console.log('User data from database:', userData);
        console.log('isAdmin value:', userData.isAdmin);
        
        return userData.isAdmin === true;
    } catch (error) {
        console.error('Error in checkAdminStatus:', error);
        return false;
    }
}

// Update home page content
function updateHomePage() {
    const currentDateElement = document.getElementById('current-date');
    const remainingDaysElement = document.getElementById('remaining-days');
    
    if (currentDateElement && remainingDaysElement) {
        const now = new Date();
        const currentMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const remainingDays = lastDay - now.getDate();
        
        currentDateElement.textContent = currentMonth;
        remainingDaysElement.textContent = remainingDays;
    }
}

// Show authentication modal
function showAuthModal(type = 'login') {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'flex';
        if (type === 'login') {
            showLoginForm();
        } else {
            showRegisterForm();
        }
    }
}

// Close authentication modal
function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show login form
function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('auth-modal-title').textContent = 'Login';
}

// Show register form
function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('auth-modal-title').textContent = 'Register';
}

// Show message to user
function showMessage(message, type = 'info') {
    // You can implement a toast or notification system here
    console.log(`${type}: ${message}`);
    alert(message); // Simple alert for now
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Make functions available globally
window.showPage = showPage;
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;