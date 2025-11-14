// Enhanced admin.js initialization
console.log('🔧 admin.js loading...');

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM loaded, admin.js ready');
    
    // Check if we're on the admin page
    if (document.getElementById('admin-page')) {
        console.log('🏠 Admin page detected');
    }
});

// Make sure all functions are available globally
window.loadAdminPage = loadAdminPage;
window.loadUserProgress = loadUserProgress;
window.searchUsers = searchUsers;
window.viewUserDetails = viewUserDetails;
window.closeUserProfileModal = closeUserProfileModal;
window.loadUsersTable = loadUsersTable;
window.viewUserProfile = viewUserProfile;

console.log('🔧 admin.js loaded successfully');
// In admin.js - Update the loadAdminPage function
async function loadAdminPage() {
  try {
    console.log('🚀 Loading admin page...');
    
    // Show admin loading screen
    showAdminLoading();
    
    const user = auth.currentUser;
    if (!user) {
      console.log('No user logged in, redirecting to home');
      showPage('home');
      hideAdminLoading();
      return;
    }
    
    // Verify admin status
    const userData = await database.ref(`users/${user.uid}`).once('value');
    if (!userData.exists() || !userData.val().isAdmin) {
      console.log('User is not admin, redirecting to home');
      showMessage('Access denied. Admin privileges required.', 'error');
      showPage('home');
      hideAdminLoading();
      return;
    }
    
    console.log('✅ User is admin, loading admin dashboard');
    
    // Create admin page content
    const adminPage = document.getElementById('admin-page');
    if (!adminPage) {
      console.error('❌ Admin page element not found');
      hideAdminLoading();
      return;
    }
    
    // Clear any existing content and show the admin content
    adminPage.innerHTML = `
      <div class="container">
        <div class="admin-content">
          <div class="admin-header">
            <h2><i class="fas fa-tachometer-alt"></i> Admin Dashboard</h2>
            <div class="admin-stats-summary" id="admin-stats-summary">
              <div class="spinner"></div>
            </div>
          </div>
          
          <div class="admin-section">
            <div class="section-header">
              <h3><i class="fas fa-users"></i> User Management</h3>
              <div class="section-actions">
                <div class="search-container">
                  <i class="fas fa-search"></i>
                  <input type="text" id="user-search" class="form-input" placeholder="Search users..." style="padding-left: 35px;">
                </div>
                <select id="user-filter" class="form-input">
                  <option value="all">All Users</option>
                  <option value="active">Active (5+ days)</option>
                  <option value="very-active">Very Active (15+ days)</option>
                  <option value="inactive">Inactive (< 2 days)</option>
                  <option value="new">New Users</option>
                </select>
              </div>
            </div>
            
            <div class="table-responsive">
              <table class="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th class="text-center">Completed Days</th>
                    <th class="text-center">Activities</th>
                    <th class="text-center">Completion Rate</th>
                    <th class="text-center">Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="users-table-body">
                  <tr>
                    <td colspan="6" class="text-center">
                      <div class="spinner"></div>
                      <p>Loading users...</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Load initial data
    await loadAdminSummary();
    await loadUsersTable();
    
    // Setup event listeners
    setupAdminEventListeners();
    
    hideAdminLoading();
    
  } catch (error) {
    console.error('❌ Error loading admin page:', error);
    showAdminError('Error loading dashboard', error);
    hideAdminLoading();
  }
}

function setupAdminEventListeners() {
  // Search and filter events
  document.getElementById('user-filter')?.addEventListener('change', loadUsersTable);
  
  const searchInput = document.getElementById('user-search');
  if (searchInput) {
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadUsersTable, 500);
    });
  }
}

function showAdminLoading() {
  const adminPage = document.getElementById('admin-page');
  if (adminPage) {
    adminPage.innerHTML = `
      <div class="container">
        <div class="admin-loading-screen">
          <div class="loading-content">
            <div class="spinner"></div>
            <p>Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    `;
  }
}

function hideAdminLoading() {
  const loadingElement = document.querySelector('.admin-loading-screen');
  if (loadingElement) {
    loadingElement.style.opacity = '0';
    setTimeout(() => {
      if (loadingElement.parentNode) {
        loadingElement.parentNode.removeChild(loadingElement);
      }
    }, 300);
  }
}

function showAdminError(message, error) {
  const adminPage = document.getElementById('admin-page');
  if (adminPage) {
    adminPage.innerHTML = `
      <div class="admin-error-screen">
        <div class="error-content">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>${message}</h3>
          <p>${error.message || 'Error details not available'}</p>
          <button onclick="loadAdminPage()" class="btn-retry">
            <i class="fas fa-redo"></i> Try Again
          </button>
        </div>
      </div>
    `;
  }
}

function closeUserProfileModal() {
  const modal = document.getElementById('user-profile-modal');
  if (modal) modal.style.display = 'none';
}

function getProgressClass(days) {
  if (days >= 15) return 'excellent';
  if (days >= 10) return 'very-good';
  if (days >= 5) return 'good';
  if (days >= 1) return 'fair';
  return 'poor';
}

async function loadAdminSummary() {
  try {
    const summaryElement = document.getElementById('admin-stats-summary');
    if (!summaryElement) {
      console.error('Summary element not found');
      return;
    }
    
    // Show loading state
    summaryElement.innerHTML = `
      <div class="summary-item">
        <div class="spinner" style="width: 20px; height: 20px;"></div>
        <div class="summary-label">Loading...</div>
      </div>
    `;
    
    const usersSnapshot = await database.ref('users').once('value');
    const users = usersSnapshot.val() || {};
    
    let stats = {
      totalUsers: 0,
      activeUsers: 0,
      veryActiveUsers: 0,
      newUsers: 0,
      totalActivities: 0
    };
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentUser = auth.currentUser;
    
    // Calculate basic stats
    for (const [uid, user] of Object.entries(users)) {
      // Skip admin users and current user for stats
      if (user.isAdmin || uid === currentUser?.uid) continue;
      
      stats.totalUsers++;
      
      // Check if user is new (joined this month)
      if (user.joinDate) {
        const joinDate = new Date(user.joinDate);
        if (joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear) {
          stats.newUsers++;
        }
      }
      
      // Get user progress to determine activity level
      const progress = await getUserProgressData(uid);
      
      if (progress.completedDays >= 5) {
        stats.activeUsers++;
      }
      if (progress.completedDays >= 15) {
        stats.veryActiveUsers++;
      }
      
      stats.totalActivities += progress.totalActivities;
    }
    
    // Update summary UI
    summaryElement.innerHTML = `
      <div class="summary-item">
        <div class="summary-value">${stats.totalUsers}</div>
        <div class="summary-label">Total Users</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${stats.activeUsers}</div>
        <div class="summary-label">Active Users</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${stats.veryActiveUsers}</div>
        <div class="summary-label">Very Active</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${stats.newUsers}</div>
        <div class="summary-label">New Users</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${stats.totalActivities}</div>
        <div class="summary-label">Activities</div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading admin summary:', error);
    const summaryElement = document.getElementById('admin-stats-summary');
    if (summaryElement) {
      summaryElement.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <span>Failed to load statistics</span>
        </div>
      `;
    }
  }
}

async function loadUsersTable() {
    try {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody) {
            console.error('Users table body not found');
            return;
        }
        
        // Show loading state
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner"></div>
                    <p>Loading users...</p>
                </td>
            </tr>
        `;
        
        const filter = document.getElementById('user-filter')?.value || 'all';
        const searchQuery = document.getElementById('user-search')?.value.toLowerCase() || '';
        const usersSnapshot = await database.ref('users').once('value');
        
        const users = usersSnapshot.val() || {};
        const currentUser = auth.currentUser;
        
        // Prepare user data with progress
        const usersWithProgress = [];
        
        for (const [uid, user] of Object.entries(users)) {
            // Skip current user from the list
            if (uid === currentUser?.uid) continue;
            
            // Apply search filter
            const username = (user.username || 'No Name').toLowerCase();
            const email = (user.email || '').toLowerCase();
            
            if (searchQuery && !username.includes(searchQuery) && !email.includes(searchQuery)) {
                continue;
            }
            
            // Get user progress data
            const progress = await getUserProgressData(uid);
            
            usersWithProgress.push({
                uid,
                user,
                progress
            });
        }
        
        // Apply additional filters
        const filteredUsers = usersWithProgress.filter(({progress, user}) => {
            if (filter === 'active') return progress.completedDays >= 5;
            if (filter === 'very-active') return progress.completedDays >= 15;
            if (filter === 'inactive') return progress.completedDays < 2;
            if (filter === 'new') {
                if (!user.joinDate) return false;
                const joinDate = new Date(user.joinDate);
                const currentDate = new Date();
                const oneMonthAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
                return joinDate >= oneMonthAgo;
            }
            return true;
        });
        
        // Sort by most active first
        filteredUsers.sort((a, b) => b.progress.completedDays - a.progress.completedDays);
        
        // Render table rows
        if (filteredUsers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-user-slash"></i>
                        <p>No users found</p>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = filteredUsers.map(({uid, user, progress}) => `
                <tr>
                    <td>
                        <div class="user-info-cell">
                            <div class="user-avatar">
                                ${(user.username || user.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="user-name">${user.username || 'No Name'}</div>
                                <div class="user-email">${user.email || 'No email'}</div>
                            </div>
                        </div>
                    </td>
                    <td class="text-center">
                        <div class="progress-badge ${getProgressClass(progress.completedDays)}">
                            ${progress.completedDays}
                        </div>
                    </td>
                    <td class="text-center">${progress.totalActivities}</td>
                    <td class="text-center">
                        <div class="completion-rate">${progress.completionRate}%</div>
                    </td>
                    <td class="text-center">
                        ${progress.lastActiveDate}
                    </td>
                    <td>
                        <button onclick="viewUserDetails('${uid}')" class="btn-view">
                            <i class="fas fa-user-circle"></i> View Profile
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        
    } catch (error) {
        console.error('Error loading users table:', error);
        const tableBody = document.getElementById('users-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading user data</p>
                        <button onclick="loadUsersTable()" class="btn-retry">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

async function getUserProgressData(userId) {
    try {
        const trackerSnap = await database.ref(`users/${userId}/tracker`).once('value');
        const trackerData = trackerSnap.val() || {};
        
        let stats = {
            completedDays: 0,
            totalActivities: 0,
            lastActiveDate: null,
            completionRate: 0,
            currentStreak: 0
        };

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        // Calculate statistics from ALL tracking data
        for (const year in trackerData) {
            for (const month in trackerData[year]) {
                const days = trackerData[year][month];
                
                for (const dayKey in days) {
                    const dayData = days[dayKey];
                    
                    // Count ALL activities (including custom ones)
                    let dayActivities = 0;
                    let totalDayActivities = 0;
                    
                    // Count regular activities
                    for (const activityKey in dayData) {
                        if (activityKey !== 'customCategories') {
                            totalDayActivities++;
                            if (dayData[activityKey]) {
                                dayActivities++;
                            }
                        }
                    }
                    
                    // Count custom category activities
                    if (dayData.customCategories) {
                        for (const catId in dayData.customCategories) {
                            const tasks = dayData.customCategories[catId].tasks || {};
                            for (const taskId in tasks) {
                                totalDayActivities++;
                                const customTaskKey = `custom_${catId}_${taskId}`;
                                if (dayData[customTaskKey]) {
                                    dayActivities++;
                                }
                            }
                        }
                    }
                    
                    stats.totalActivities += dayActivities;
                    
                    // Track last active date
                    if (dayActivities > 0) {
                        const dayNumber = parseInt(dayKey.replace('day', ''));
                        const activityDate = new Date(parseInt(year), parseInt(month), dayNumber);
                        
                        if (!stats.lastActiveDate || activityDate > stats.lastActiveDate) {
                            stats.lastActiveDate = activityDate;
                        }
                    }
                    
                    // Check if day is completed (all activities done)
                    if (totalDayActivities > 0 && dayActivities === totalDayActivities) {
                        stats.completedDays++;
                    }
                }
            }
        }

        // Calculate completion rate for current month
        const currentMonthData = trackerData[currentYear]?.[currentMonth] || {};
        let currentMonthCompleted = 0;
        let currentMonthTotal = Object.keys(currentMonthData).length;

        for (const dayKey in currentMonthData) {
            const dayData = currentMonthData[dayKey];
            let dayCompleted = true;
            let hasActivities = false;
            
            // Check regular activities
            for (const activityKey in dayData) {
                if (activityKey !== 'customCategories') {
                    hasActivities = true;
                    if (!dayData[activityKey]) {
                        dayCompleted = false;
                    }
                }
            }
            
            // Check custom category activities
            if (dayData.customCategories) {
                for (const catId in dayData.customCategories) {
                    const tasks = dayData.customCategories[catId].tasks || {};
                    for (const taskId in tasks) {
                        hasActivities = true;
                        const customTaskKey = `custom_${catId}_${taskId}`;
                        if (!dayData[customTaskKey]) {
                            dayCompleted = false;
                        }
                    }
                }
            }
            
            if (hasActivities && dayCompleted) {
                currentMonthCompleted++;
            }
        }

        stats.completionRate = currentMonthTotal > 0 ? Math.round((currentMonthCompleted / currentMonthTotal) * 100) : 0;
        
        // Format last active date
        if (stats.lastActiveDate) {
            stats.lastActiveDate = stats.lastActiveDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } else {
            stats.lastActiveDate = 'Never';
        }

        return stats;

    } catch (error) {
        console.error('Error getting user progress data for user', userId, ':', error);
        return {
            completedDays: 0,
            totalActivities: 0,
            lastActiveDate: 'Never',
            completionRate: 0,
            currentStreak: 0
        };
    }
}



async function viewUserDetails(userId) {
    try {
        const modal = document.getElementById('user-profile-modal');
        const modalContent = document.getElementById('user-profile-modal-content');
        if (!modal || !modalContent) return;

        // Show modal with loading state
        modal.style.display = 'flex';
        modalContent.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading user data...</p>
            </div>
        `;

        // Load user data and progress
        const [userSnapshot, progressData] = await Promise.all([
            database.ref(`users/${userId}`).once('value'),
            getUserProgressData(userId)
        ]);

        const user = userSnapshot.val() || {};
        
        // Format join date
        let joinDate = 'Unknown';
        if (user.joinDate) {
            const date = new Date(user.joinDate);
            joinDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Create profile content - REMOVE THE DUPLICATE CLOSE BUTTON FROM HEADER
        modalContent.innerHTML = `
            
            
            <div class="modal-body">
                <div class="user-profile-header">
                    <div class="user-avatar large">${(user.username || user.email || 'U').charAt(0).toUpperCase()}</div>
                    <div class="user-info">
                        <h2>${user.username || 'No Name'}</h2>
                        <p class="user-email">${user.email || 'No email'}</p>
                        <p class="join-date">Member since: ${joinDate}</p>
                    </div>
                </div>
                
                <!-- Rest of your content remains the same -->
                <div class="user-stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${progressData.completedDays}</div>
                        <div class="stat-label">Completed Days</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${progressData.totalActivities}</div>
                        <div class="stat-label">Activities Recorded</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${progressData.completionRate}%</div>
                        <div class="stat-label">Completion Rate</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${progressData.lastActiveDate}</div>
                        <div class="stat-label">Last Active</div>
                    </div>
                </div>
                
                <div class="monthly-calendar">
                    <h3><i class="fas fa-calendar-alt"></i> Current Month Progress</h3>
                    <div class="calendar-grid" id="user-calendar-grid">
                        ${await generateUserCalendarForCurrentMonth(userId)}
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error viewing user details:', error);
        modalContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading User Data</h3>
                <p>${error.message}</p>
                <button onclick="viewUserDetails('${userId}')" class="btn-retry">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

function generateUserCalendar(calendarDays) {
  if (!calendarDays || calendarDays.length === 0) {
    return '<div class="empty-calendar">No data available for this month</div>';
  }
  
  return calendarDays.map(day => `
    <div class="calendar-day ${day.completed ? 'completed' : day.activities > 0 ? 'partial' : ''}">
      <div class="day-number">${day.day}</div>
      <div class="day-status">
        ${day.completed ? '<i class="fas fa-check-circle"></i>' : 
         day.activities > 0 ? `${day.activities}/5` : ''}
      </div>
    </div>
  `).join('');
}

function viewUserProfile(userId) {
    viewUserDetails(userId);
}

async function generateUserCalendarForCurrentMonth(userId) {
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();

        // Get tracking data for current month
        const snapshot = await database.ref(`users/${userId}/tracker/${currentYear}/${currentMonth}`).once('value');
        const monthData = snapshot.val() || {};

        let calendarHTML = '';

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayKey = `day${day}`;
            const dayData = monthData[dayKey] || {};
            
            // Calculate completion percentage based on ALL activities
            let totalTasks = 0;
            let completedTasks = 0;
            
            // Count regular activities
            for (const activityKey in dayData) {
                if (activityKey !== 'customCategories') {
                    totalTasks++;
                    if (dayData[activityKey]) {
                        completedTasks++;
                    }
                }
            }
            
            // Count custom category activities
            if (dayData.customCategories) {
                for (const catId in dayData.customCategories) {
                    const tasks = dayData.customCategories[catId].tasks || {};
                    for (const taskId in tasks) {
                        totalTasks++;
                        const customTaskKey = `custom_${catId}_${taskId}`;
                        if (dayData[customTaskKey]) {
                            completedTasks++;
                        }
                    }
                }
            }
            
            const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Determine progress class
            let progressClass = 'no-progress';
            if (progressPercentage === 100) {
                progressClass = 'complete-day';
            } else if (progressPercentage >= 70) {
                progressClass = 'high-progress';
            } else if (progressPercentage >= 30) {
                progressClass = 'medium-progress';
            } else if (progressPercentage > 0) {
                progressClass = 'low-progress';
            }

            // Add calendar day
            calendarHTML += `
                <div class="calendar-day ${progressClass}" title="Day ${day}: ${progressPercentage}% complete (${completedTasks}/${totalTasks} tasks)">
                    <div class="day-number">${day}</div>
                    <div class="day-progress">
                        ${progressPercentage > 0 ? `${progressPercentage}%` : ''}
                    </div>
                </div>
            `;
        }

        return calendarHTML;

    } catch (error) {
        console.error('Error generating calendar for user', userId, ':', error);
        return '<div class="error-message">Error loading calendar data</div>';
    }
}
// Add this function to admin.js
async function searchUsers() {
    await loadUsersTable();
}

// Also add this function if it's missing
function loadUserProgress() {
    // Implementation for loading user progress
    console.log('loadUserProgress function called');
}
// In admin.js - Add more detailed logging
function showAdminLoading() {
  const adminPage = document.getElementById('admin-page');
  if (adminPage) {
    console.log('Showing admin loading screen');
    adminPage.innerHTML = `
      <div class="admin-loading-screen">
        <div class="loading-content">
          <div class="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    `;
  }
}

function hideAdminLoading() {
  console.log('Hiding admin loading screen');
  const loadingElement = document.querySelector('.admin-loading-screen');
  if (loadingElement) {
    loadingElement.style.opacity = '0';
    setTimeout(() => loadingElement.remove(), 300);
  }
}
// In admin.js - Add at the very top
console.log('🔧 admin.js loading...');

// Add this function to verify admin.js is working
function verifyAdminJSLoaded() {
    console.log('✅ admin.js verified and working');
    return true;
}
window.verifyAdminJSLoaded = verifyAdminJSLoaded;

// Debug function to test admin page
function debugAdminPage() {
    console.log('=== ADMIN PAGE DEBUG ===');
    console.log('1. Admin page element:', document.getElementById('admin-page'));
    console.log('2. Current user:', auth.currentUser);
    console.log('3. loadAdminPage function:', typeof loadAdminPage);
    console.log('4. Firebase auth:', typeof auth);
    console.log('5. Firebase database:', typeof database);
    
    // Test if we can manually load the admin page
    if (document.getElementById('admin-page')) {
        console.log('✅ Admin page element exists');
        loadAdminPage();
    } else {
        console.log('❌ Admin page element not found');
    }
}

// Make it available globally
window.debugAdminPage = debugAdminPage;

// In admin.js - Make sure these are at the bottom
window.loadAdminPage = loadAdminPage;
window.loadUserProgress = loadUserProgress;
window.searchUsers = searchUsers;
window.viewUserDetails = viewUserDetails;
window.closeUserProfileModal = closeUserProfileModal;
window.loadUsersTable = loadUsersTable;
window.viewUserProfile = viewUserProfile;