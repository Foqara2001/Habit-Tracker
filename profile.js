// Profile Functions
let profileChart = null;

async function loadUserProfile() {
    try {
        const user = auth.currentUser;
        if (!user) {
            showPage('home');
            return;
        }

        // Show loading overlay
        showProfileLoading();

        // Load user data and progress
        const [userSnapshot, progressData] = await Promise.all([
            database.ref(`users/${user.uid}`).once('value'),
            loadUserProgressData(user.uid)
        ]);

        const userData = userSnapshot.val() || {};

        // Update profile information
        document.getElementById('profile-username').textContent = userData.username || 'No name';
        document.getElementById('profile-email').textContent = user.email;
        
        // Format and display join date
        if (userData.joinDate) {
            const joinDate = new Date(userData.joinDate);
            document.getElementById('profile-join-date').textContent = 
                joinDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
        }

        // Update profile avatar
        const profileAvatar = document.getElementById('profile-avatar-large');
        if (profileAvatar) {
            profileAvatar.textContent = (userData.username || user.email).charAt(0).toUpperCase();
        }

        // Update statistics
        document.getElementById('total-days').textContent = progressData.completedDays;
        document.getElementById('current-streak').textContent = progressData.currentStreak;
        document.getElementById('completion-rate').textContent = progressData.completionRate + '%';
        document.getElementById('total-activities').textContent = progressData.totalActivities;

        // Generate calendar
        await generateProfileCalendar(user.uid);

        // Generate progress chart
        generateProgressChart(progressData.monthlyProgress);

        // Hide loading overlay
        hideProfileLoading();

    } catch (error) {
        console.error('Error loading profile:', error);
        showMessage('Error loading profile data', 'error');
        hideProfileLoading();
    }
}

function showProfileLoading() {
    const loadingOverlay = document.getElementById('profile-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideProfileLoading() {
    const loadingOverlay = document.getElementById('profile-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

async function loadUserProgressData(userId) {
    try {
        const trackerSnap = await database.ref(`users/${userId}/tracker`).once('value');
        const trackerData = trackerSnap.val() || {};
        
        let stats = {
            completedDays: 0,
            currentStreak: 0,
            totalActivities: 0,
            completionRate: 0,
            monthlyProgress: []
        };

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const activities = ['morning', 'midday', 'afternoon', 'evening', 'night'];

        let lastCompletedDay = null;
        let currentStreak = 0;

        // Calculate statistics from all tracking data
        for (const year in trackerData) {
            for (const month in trackerData[year]) {
                const days = trackerData[year][month];
                let monthCompleted = 0;
                let monthTotal = 0;
                
                for (const dayKey in days) {
                    const dayData = days[dayKey];
                    
                    // Count ALL activities (including custom ones)
                    let dayActivities = 0;
                    let totalDayActivities = 0;
                    
                    for (const activityKey in dayData) {
                        // Skip customCategories object itself, but count its tasks
                        if (activityKey === 'customCategories') {
                            const customCats = dayData[activityKey];
                            for (const catId in customCats) {
                                const tasks = customCats[catId].tasks || {};
                                for (const taskId in tasks) {
                                    totalDayActivities++;
                                    // Custom tasks are tracked separately in the dayData
                                    const customTaskKey = `custom_${catId}_${taskId}`;
                                    if (dayData[customTaskKey]) {
                                        dayActivities++;
                                    }
                                }
                            }
                        } else {
                            // Count regular activities
                            totalDayActivities++;
                            if (dayData[activityKey]) {
                                dayActivities++;
                            }
                        }
                    }
                    
                    stats.totalActivities += dayActivities;
                    
                    // Consider day completed if all activities are done
                    if (totalDayActivities > 0 && dayActivities === totalDayActivities) {
                        stats.completedDays++;
                        monthCompleted++;
                        
                        // Calculate streak
                        const dayNumber = parseInt(dayKey.replace('day', ''));
                        const activityDate = new Date(parseInt(year), parseInt(month), dayNumber);
                        
                        if (!lastCompletedDay || 
                            this.isConsecutiveDay(lastCompletedDay, activityDate)) {
                            currentStreak++;
                        } else {
                            currentStreak = 1;
                        }
                        
                        lastCompletedDay = activityDate;
                    }
                    
                    monthTotal++;
                }
                
                // Store monthly progress
                if (parseInt(year) === currentYear && parseInt(month) === currentMonth) {
                    stats.completionRate = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;
                }
                
                stats.monthlyProgress.push({
                    month: `${year}-${parseInt(month) + 1}`,
                    completionRate: monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0
                });
            }
        }

        stats.currentStreak = currentStreak;
        
        // Only keep last 6 months for chart
        stats.monthlyProgress = stats.monthlyProgress.slice(-6);

        return stats;

    } catch (error) {
        console.error('Error loading user progress data:', error);
        return {
            completedDays: 0,
            currentStreak: 0,
            totalActivities: 0,
            completionRate: 0,
            monthlyProgress: []
        };
    }
}

// Add helper function to check consecutive days
function isConsecutiveDay(previousDate, currentDate) {
    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in one day
    const diffDays = Math.round((currentDate - previousDate) / oneDay);
    return diffDays === 1;
}

async function generateProfileCalendar(userId) {
    try {
        const calendarElement = document.getElementById('profile-calendar');
        if (!calendarElement) return;

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Get tracking data for current month
        const snapshot = await database.ref(`users/${userId}/tracker/${currentYear}/${currentMonth}`).once('value');
        const monthData = snapshot.val() || {};

        let calendarHTML = '';

        for (let day = 1; day <= daysInMonth; day++) {
            const dayKey = `day${day}`;
            const dayData = monthData[dayKey] || {};
            
            // Calculate completion percentage based on ALL activities
            let totalTasks = 0;
            let completedTasks = 0;
            
            for (const taskKey in dayData) {
                // Skip customCategories object itself
                if (taskKey !== 'customCategories') {
                    totalTasks++;
                    if (dayData[taskKey]) {
                        completedTasks++;
                    }
                }
            }
            
            // Also count custom categories tasks
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

        calendarElement.innerHTML = calendarHTML;

    } catch (error) {
        console.error('Error generating profile calendar:', error);
        document.getElementById('profile-calendar').innerHTML = 
            '<div class="error-message">Error loading calendar</div>';
    }
}

function generateProgressChart(monthlyProgress) {
    const ctx = document.getElementById('progress-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (profileChart) {
        profileChart.destroy();
    }

    const labels = monthlyProgress.map(item => {
        const [year, month] = item.month.split('-');
        return new Date(year, month - 1).toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
        });
    });

    const data = monthlyProgress.map(item => item.completionRate);

    profileChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Completion Rate (%)',
                data: data,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

function showEditProfileModal() {
    const user = auth.currentUser;
    if (!user) return;

    const userData = database.ref(`users/${user.uid}`);
    
    userData.once('value').then((snapshot) => {
        const data = snapshot.val() || {};
        document.getElementById('edit-username').value = data.username || '';
        document.getElementById('edit-email').value = user.email || '';
        
        document.getElementById('edit-profile-modal').style.display = 'flex';
    });
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').style.display = 'none';
}

function showDeleteAccountModal() {
    document.getElementById('delete-account-modal').style.display = 'flex';
}

function closeDeleteAccountModal() {
    document.getElementById('delete-account-modal').style.display = 'none';
    document.getElementById('confirm-delete').value = '';
}

async function updateProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const username = document.getElementById('edit-username').value;
    const email = document.getElementById('edit-email').value;

    try {
        // Update email if changed
        if (email !== user.email) {
            await user.updateEmail(email);
        }

        // Update profile in database
        await database.ref(`users/${user.uid}`).update({
            username: username,
            email: email
        });

        // Update display name
        await user.updateProfile({
            displayName: username
        });

        showMessage('Profile updated successfully!', 'success');
        closeEditProfileModal();
        loadUserProfile(); // Refresh profile data

    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('Error updating profile: ' + error.message, 'error');
    }
}

async function deleteAccount() {
    const user = auth.currentUser;
    if (!user) return;

    const confirmText = document.getElementById('confirm-delete').value;
    
    if (confirmText !== 'DELETE') {
        showMessage('Please type "DELETE" to confirm account deletion', 'error');
        return;
    }

    try {
        // Delete user data from database
        await database.ref(`users/${user.uid}`).remove();
        
        // Delete user's tracking data
        await database.ref(`users/${user.uid}/tracker`).remove();
        
        // Delete user account
        await user.delete();
        
        showMessage('Account deleted successfully', 'success');
        closeDeleteAccountModal();
        
    } catch (error) {
        console.error('Error deleting account:', error);
        showMessage('Error deleting account: ' + error.message, 'error');
    }
}

// Make functions available globally
window.loadUserProfile = loadUserProfile;
window.showEditProfileModal = showEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.showDeleteAccountModal = showDeleteAccountModal;
window.closeDeleteAccountModal = closeDeleteAccountModal;
window.updateProfile = updateProfile;
window.deleteAccount = deleteAccount;