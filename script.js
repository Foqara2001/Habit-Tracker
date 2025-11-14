

// Initialize Firebase
let auth, database;
// Add this variable to track if user specifically requested profile
 let userRequestedProfile = false;

// Update the profile link click handler
document.addEventListener('DOMContentLoaded', function() {
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
        profileLink.addEventListener('click', function(e) {
            e.preventDefault();
            userRequestedProfile = true;
            showPage('profile');
        });
    }
    
    // Reset the flag when other pages are clicked
    const otherLinks = document.querySelectorAll('.nav-links a:not(#profile-link)');
    otherLinks.forEach(link => {
        link.addEventListener('click', function() {
            userRequestedProfile = false;
        });
    });
});



try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    database = firebase.database();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    showError('Failed to initialize the application. Please refresh the page.');
}


// DOM Elements
const calendar = document.getElementById("calendar");
const trackerContainer = document.getElementById("tracker-container");
const trackerTitle = document.getElementById("tracker-title");
const trackerContent = document.getElementById("tracker-content");
const dayProgressBar = document.getElementById("day-progress-bar");
const navbar = document.querySelector(".navbar");

// Month names in English
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Use global variables from app.js - don't redeclare them here
// currentMonth and currentYear are already declared in app.js

// Initialize the app
async function initializeApp() {
    try {
        console.log('Starting app initialization...');
        
        // 1. Set current year in footer
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }

        // 2. Wait for DOM to be fully loaded
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('DOMContentLoaded', resolve);
            });
        }

        // 3. Check Firebase connection
        if (!auth || !database) {
            throw new Error('Firebase not initialized');
        }

        // 4. Set up basic UI
        showInitialContent();

        // 5. Check authentication status
        await checkAuthStatus();

        // 6. Set current date display
        setCurrentDate();

        // 7. Load initial page based on auth status
       
        const initialPage = auth.currentUser ? 'home' : 'home'; // Always start with home page
        showPage(initialPage);

        // 8. Add scroll event for navbar
        window.addEventListener('scroll', handleScroll);

        // 9. Hamburger menu toggle
        setupHamburgerMenu();

        // 10. Setup month navigation
        setupMonthNavigation();

        // 11. Hide splash screen after 1 second
        setTimeout(() => {
            const splashScreen = document.getElementById('splash-screen');
            if (splashScreen) {
                splashScreen.classList.add('hidden');
            }
        }, 1000);

        console.log('Application initialized successfully');

    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Error initializing application: ' + error.message);
    }
}


// Calendar generation

function generateCalendar(year, month) {
    if (!calendar) return;
    
    calendar.innerHTML = '';
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const today = new Date();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement("div");
        dayElement.className = "day calendar-day";
        dayElement.setAttribute("data-day", day);
        dayElement.setAttribute("data-month", month);
        dayElement.setAttribute("data-year", year);
        
        // Add progress classes based on tracker data
        const isToday = today.getDate() === day && 
                       today.getMonth() === month && 
                       today.getFullYear() === year;
        
        if (isToday) {
            dayElement.classList.add("today");
        }
        
        // Remove the "Day" label - only show the number
        dayElement.innerHTML = `
            <div class="day-number">${day}</div>
            <div class="day-progress"></div>
            ${isToday ? '<div class="today-indicator"></div>' : ''}
        `;
        
        dayElement.addEventListener('click', () => {
            const year = parseInt(dayElement.getAttribute('data-year'));
            const month = parseInt(dayElement.getAttribute('data-month'));
            const day = parseInt(dayElement.getAttribute('data-day'));
            openTracker(year, month, day);
        });
        
        calendar.appendChild(dayElement);
        updateDayStyle(dayElement, year, month, day);
    }
}

// Update month navigation to modify global variables

function setupMonthNavigation() {
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    if (prevMonthBtn) {
        prevMonthBtn.onclick = () => changeMonth(-1);
    }

    if (nextMonthBtn) {
        nextMonthBtn.onclick = () => changeMonth(1);
    }

    updateMonthYearTitle();
}

// Update month/year title using global variables
function updateMonthYearTitle() {
    const monthYearElement = document.getElementById('current-month-year');
    if (monthYearElement) {
        monthYearElement.textContent = `${monthNames[window.currentMonth]} ${window.currentYear}`;
    }
}


// Handle scroll for navbar effect
function handleScroll() {
    if (!navbar) return;
    
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

// Set current date display
function setCurrentDate() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Calculate remaining days in the current month
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const remainingDays = lastDay - now.getDate();
    
    // Update elements in the interface
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        currentDateElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }
    
    const remainingDaysElement = document.getElementById('remaining-days');
    if (remainingDaysElement) {
        remainingDaysElement.textContent = remainingDays;
    }
}

// Setup hamburger menu
function setupHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) {
                navLinks.classList.toggle('active');
            }
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        const navLinks = document.querySelector('.nav-links');
        const hamburger = document.querySelector('.hamburger');
        
        if (navLinks && navLinks.classList.contains('active') && 
            !e.target.closest('.nav-links') && 
            !e.target.closest('.hamburger')) {
            navLinks.classList.remove('active');
        }
    });
}

// Show initial content
function showInitialContent() {
    // Hide splash screen
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.classList.add('hidden');
    }
    
    // Show home page
    document.getElementById('home-page').style.display = 'block';
    
    // Show navigation bar
    if (navbar) {
        navbar.style.visibility = 'visible';
    }
}

// Show error message
function showError(message) {
    console.error('App Error:', message);
    
    // You can show a user-friendly error message here
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div style="background: #fee; border: 1px solid #fcc; padding: 20px; margin: 20px; border-radius: 5px;">
            <h3>Application Error</h3>
            <p>${message}</p>
            <button onclick="window.location.reload()" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 3px; cursor: pointer;">
                Reload Page
            </button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
}

// Page Navigation
function showPage(pageId) {
    console.log('Showing page:', pageId);
    
    // Hide all pages
    document.querySelectorAll('[id$="-page"]').forEach(page => {
        if (page) page.style.display = 'none';
    });

    // Hide tracker if open
    if (trackerContainer) {
        trackerContainer.style.display = "none";
    }

    // Close mobile menu if open
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.classList.remove('active');
    }

    // Show the requested page
    const page = document.getElementById(`${pageId}-page`);
    if (page) {
        page.style.display = 'block';
        window.scrollTo(0, 0);

        // Update active nav links
        updateActiveNavLinks(pageId);
        
        // Handle page-specific actions
        handlePageSpecificActions(pageId);
    } else {
        // Fallback to home page
        document.getElementById('home-page').style.display = 'block';
    }
}

// Update active navigation links
function updateActiveNavLinks(activePageId) {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        const linkPageId = link.getAttribute('data-page') || 
                          link.getAttribute('onclick')?.match(/showPage\('(\w+)'\)/)?.[1];
        
        if (linkPageId === activePageId) {
            link.classList.add('active');
        }
    });
}

// Handle page-specific actions

function handlePageSpecificActions(pageId) {
    switch (pageId) {
        case 'tracker':
            if (auth.currentUser) {
                loadTrackerCalendar();
            } else {
                showPage('home');
            }
            break;
            
        case 'profile':
            if (userRequestedProfile) {
                loadUserProfile();
            }
            break;
            
        case 'resources':
            if (document.getElementById('articles-resources').children.length === 0) {
                loadResources();
            }
            break;
            
        case 'admin':
            // Remove the old loadAdminPage() call and use the proper function
            if (auth.currentUser) {
                console.log('Admin page requested, checking permissions...');
                checkAdminStatus().then(isAdmin => {
                    if (isAdmin) {
                        console.log('User is admin, loading admin dashboard');
                        if (typeof loadAdminPage === 'function') {
                            loadAdminPage();
                        } else {
                            console.error('loadAdminPage function not found');
                            showFallbackAdminPage();
                        }
                    } else {
                        console.log('User is NOT admin, redirecting to home');
                        showMessage('Access denied. Admin privileges required.', 'error');
                        showPage('home');
                    }
                });
            } else {
                showPage('home');
            }
            break;
    }
}

// In tracker.js - Add this function for real-time updates
function setupTrackerRealTimeListener() {
    const user = auth.currentUser;
    if (!user) return;

    // Listen for changes in the current month's tracker data
    database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}`)
        .on('value', (snapshot) => {
            // Only refresh if we're on the tracker page
            if (document.getElementById('tracker-page').style.display === 'block') {
                generateCalendarGrid();
            }
        });
}

// Update the loadTrackerCalendar function to include the real-time listener
async function loadTrackerCalendar() {
    try {
        const user = auth.currentUser;
        if (!user) {
            showPage('home');
            return;
        }

        console.log('Loading tracker calendar...');

        // Update month/year display
        updateCalendarHeader();
        
        // Generate calendar grid
        await generateCalendarGrid();
        
        // Set up event listeners
        setupCalendarEventListeners();
        
        // Set up real-time listener
        setupTrackerRealTimeListener();

    } catch (error) {
        console.error('Error loading tracker calendar:', error);
        showMessage('Error loading calendar', 'error');
    }
}

// Update the changeMonth function to update the real-time listener
function changeMonth(direction) {
    selectedMonth += direction;
    
    // Handle year boundaries
    if (selectedMonth < 0) {
        selectedMonth = 11;
        selectedYear--;
    } else if (selectedMonth > 11) {
        selectedMonth = 0;
        selectedYear++;
    }
    
    // Reload calendar
    loadTrackerCalendar();
}

// Calendar generation
function generateCalendar(year, month) {
    if (!calendar) return;
    
    calendar.innerHTML = '';
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = new Date().getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement("div");
        dayElement.className = "day";
        dayElement.setAttribute("data-day", day);
        dayElement.setAttribute("data-month", month);
        dayElement.setAttribute("data-year", year);
        dayElement.innerHTML = `
            <div class="day-number">${day}</div>
            <div class="day-label">Day</div>
        `;
        
        if (day === currentDay && new Date().getMonth() === month && new Date().getFullYear() === year) {
            dayElement.classList.add("current-day");
        }
        
        dayElement.addEventListener('click', () => {
            const year = parseInt(dayElement.getAttribute('data-year'));
            const month = parseInt(dayElement.getAttribute('data-month'));
            const day = parseInt(dayElement.getAttribute('data-day'));
            openTracker(year, month, day);
        });
        
        calendar.appendChild(dayElement);
        updateDayStyle(dayElement, year, month, day);
    }
}

// Setup month navigation
function setupMonthNavigation() {
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            generateCalendar(currentYear, currentMonth);
            updateMonthYearTitle();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            generateCalendar(currentYear, currentMonth);
            updateMonthYearTitle();
        });
    }

    updateMonthYearTitle();
}

// Update month/year title

function updateMonthYearTitle() {
    const monthYearElement = document.getElementById('current-month-year');
    if (monthYearElement) {
        // Use the selectedMonth and selectedYear from tracker.js
        const date = new Date(selectedYear, selectedMonth);
        monthYearElement.textContent = date.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    }
}


// Basic tracker functions (simplified for now)
async function openTracker(year, month, day) {
    if (!auth.currentUser) {
        alert('Please log in to track your activities');
        showAuthModal();
        return;
    }

    // Use the proper tracker functions from tracker.js
    selectedYear = year;
    selectedMonth = month;
    selectedDay = day;
    
    showDayTracker(day);
}

function goBack() {
    if (trackerContainer) {
        trackerContainer.style.display = "none";
    }
}

// Authentication Functions
async function checkAuthStatus() {
    return new Promise((resolve) => {
        if (!auth) {
            resolve();
            return;
        }

        auth.onAuthStateChanged(async (user) => {
            try {
                const authLink = document.getElementById('auth-link');
                const profileLink = document.getElementById('profile-link');
                const adminLink = document.getElementById('admin-link');
                const trackerLink = document.getElementById('tracker-link');
                
                if (user) {
                    // User is signed in
                    if (authLink) {
                        authLink.textContent = 'Logout';
                        authLink.onclick = logout;
                    }
                    
                    if (profileLink) profileLink.style.display = 'block';
                    if (trackerLink) trackerLink.style.display = 'block';

                    // Load user data
                    const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
                    const userData = userSnapshot.val() || {};

                    // Update avatar
                    updateUserAvatar(user, userData);

                    // Check admin permissions
                    if (adminLink) {
                        adminLink.style.display = userData.isAdmin ? 'block' : 'none';
                    }

                } else {
                    // User is signed out
                    if (authLink) {
                        authLink.textContent = 'Login';
                        authLink.onclick = showAuthModal;
                    }
                    
                    if (profileLink) profileLink.style.display = 'none';
                    if (adminLink) adminLink.style.display = 'none';
                    if (trackerLink) trackerLink.style.display = 'none';
                }

                resolve();
            } catch (error) {
                console.error('Error in auth state change:', error);
                resolve();
            }
        });
    });
}

// Make sure the real auth functions are available globally
window.login = login;
window.register = register;
window.logout = logout;

function updateUserAvatar(user, userData) {
    const avatar = document.getElementById('profile-avatar');
    const avatarText = userData.username 
        ? userData.username.charAt(0).toUpperCase() 
        : user.email.charAt(0).toUpperCase();
  
    if (avatar) avatar.textContent = avatarText;
}

// Authentication modal functions
function showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'block';
        showLoginForm();
    }
}

function closeModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.style.display = 'none';
}

function showLoginForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
}

function showRegisterForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
}

// Placeholder functions for unimplemented features
async function loadResources() {
    console.log('Loading resources...');
    // Basic implementation
    const resources = {
        articles: [
            { title: "The Power of Daily Habits", url: "#" },
            { title: "Building Consistent Routines", url: "#" }
        ],
        learning: [
            { title: "Introduction to Habit Formation", url: "#" }
        ],
        videos: [
            { title: "Habit Tracking for Beginners", url: "#" }
        ],
        books: [
            { title: "Atomic Habits by James Clear", url: "#" }
        ]
    };

    // Display resources
    displayResources(resources.articles, 'articles-resources');
    displayResources(resources.learning, 'learning-resources');
    displayResources(resources.videos, 'videos-resources');
    displayResources(resources.books, 'books-resources');
}

function displayResources(resources, elementId) {
    const container = document.getElementById(elementId);
    if (!container) return;

    container.innerHTML = '';
    resources.forEach(resource => {
        const li = document.createElement('li');
        li.className = 'resource-item';
        li.innerHTML = `
            <a href="${resource.url}" target="_blank">${resource.title}</a>
        `;
        container.appendChild(li);
    });
}

function openTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Deactivate all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const tabContent = document.getElementById(tabId);
    if (tabContent) tabContent.classList.add('active');
    
    // Activate selected tab button
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });
}

// Placeholder functions
function updateDayStyle(dayElement, year, month, day) {
    // Basic implementation
    dayElement.classList.add('no-progress');
}

function loadProfilePage() {
    console.log('Loading profile page...');
    // Basic implementation
    document.getElementById('profile-username').textContent = 'User Name';
    document.getElementById('profile-email').textContent = 'user@example.com';
}



// Make sure DOM is loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

// In script.js - Replace the loadAdminPageFallback function
async function loadAdminPageFallback() {
    console.log('loadAdminPageFallback called');
    
    const adminPage = document.getElementById('admin-page');
    if (!adminPage) {
        console.error('Admin page element not found');
        return;
    }
    
    // Show loading state
    adminPage.innerHTML = `
        <div class="container">
            <div class="admin-loading">
                <div class="spinner"></div>
                <p>Checking admin privileges...</p>
            </div>
        </div>
    `;
    
    // Check if user is admin first
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user logged in, redirecting to home');
            showPage('home');
            return;
        }
        
        console.log('Checking admin status for user:', user.uid);
        const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = userSnapshot.val() || {};
        
        console.log('User data:', userData);
        console.log('isAdmin:', userData.isAdmin);
        
        if (!userData.isAdmin) {
            console.log('User is not admin, redirecting to home');
            showMessage('Access denied. Admin privileges required.', 'error');
            showPage('home');
            return;
        }
        
        console.log('User is admin, loading admin dashboard');
        
        // Now try to load the real admin page
        if (typeof loadAdminPage === 'function') {
            console.log('Calling loadAdminPage function');
            loadAdminPage();
        } else {
            console.error('loadAdminPage function not found, showing fallback');
            showFallbackAdminPage();
        }
        
    } catch (error) {
        console.error('Error in loadAdminPageFallback:', error);
        showFallbackAdminPage(error);
    }
}

function showFallbackAdminPage(error = null) {
    const adminPage = document.getElementById('admin-page');
    adminPage.innerHTML = `
        <div class="container">
            <h2>Admin Panel</h2>
            <div class="admin-content">
                <div class="error-message">
                    <h3>Admin Dashboard Loading Issue</h3>
                    <p>There was a problem loading the admin dashboard.</p>
                    ${error ? `<p><strong>Error:</strong> ${error.message}</p>` : ''}
                    <p><strong>Debug Information:</strong></p>
                    <ul>
                        <li>loadAdminPage function: ${typeof loadAdminPage}</li>
                        <li>Current User: ${auth.currentUser ? auth.currentUser.email : 'None'}</li>
                        <li>User ID: ${auth.currentUser ? auth.currentUser.uid : 'None'}</li>
                    </ul>
                    <button onclick="checkAdminStatusDebug()" class="digital-btn">Check Admin Status</button>
                    <button onclick="makeMeAdmin()" class="digital-btn" style="background: #dc2626;">Make Me Admin</button>
                    <button onclick="location.reload()" class="digital-btn">Refresh Page</button>
                </div>
            </div>
        </div>
    `;
}

// Make functions available globally
// Make tracker functions available globally
window.showDayTracker = showDayTracker;
window.loadDayData = loadDayData;
window.updateTaskStatus = updateTaskStatus;
window.updateDayProgress = updateDayProgress;
window.showAddCategoryModal = showAddCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.createNewCategory = createNewCategory;
window.getCurrentDayFromTracker = getCurrentDayFromTracker;



// Add placeholder functions for auth (to be implemented)
window.login = login;
window.register = register;
window.logout = function() { 
    if (auth) {
        auth.signOut().then(() => {
            showPage('home');
            checkAuthStatus();
        });
    }
};

// Variable for profile page control
 userRequestedProfile = false;

// Update profile link to set the flag
document.addEventListener('DOMContentLoaded', () => {
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            userRequestedProfile = true;
            showPage('profile');
        });
    }
});
// In script.js - Add error handling at the very top
window.addEventListener('error', function(e) {
    console.error('Global error caught:', e.error);
    console.error('In file:', e.filename);
    console.error('At line:', e.lineno);
});

// Add this to handle promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
});

