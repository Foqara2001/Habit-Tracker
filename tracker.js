// Tracker Functions
let selectedDay = null;
let selectedMonth = currentMonth;
let selectedYear = currentYear;

// In tracker.js - Update the loadTrackerCalendar function
async function loadTrackerCalendar() {
    try {
        const user = auth.currentUser;
        if (!user) {
            showPage('home');
            return;
        }

        console.log('Loading tracker calendar...'); // Debug log

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

// Add this function to refresh the calendar when task status changes
async function refreshTrackerCalendar() {
    if (document.getElementById('tracker-page').style.display === 'block') {
        await loadTrackerCalendar();
    }
}

function updateCalendarHeader() {
    const monthYearElement = document.getElementById('current-month-year');
    if (monthYearElement) {
        const date = new Date(selectedYear, selectedMonth);
        monthYearElement.textContent = date.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    }
}

// In tracker.js - Update the generateCalendarGrid function progress calculation
async function generateCalendarGrid() {
    const calendarElement = document.getElementById('calendar');
    if (!calendarElement) return;

    const user = auth.currentUser;
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();

    // Get tracking data for the month
    const snapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}`).once('value');
    const monthData = snapshot.val() || {};

    let calendarHTML = '';

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = `day${day}`;
        const dayData = monthData[dayKey] || {};
        
        // Calculate completion percentage based on all tasks
        const progressData = calculateDayProgress(dayData);
        const progressPercentage = progressData.percentage;

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

        // Check if day is today
        const today = new Date();
        const isToday = today.getDate() === day && 
                       today.getMonth() === selectedMonth && 
                       today.getFullYear() === selectedYear;

        calendarHTML += `
            <div class="calendar-day ${progressClass} ${isToday ? 'today' : ''}" 
                 onclick="selectDay(${day})"
                 data-day="${day}">
                <div class="day-number">${day}</div>
                <div class="day-progress">
                    ${progressPercentage > 0 ? `${progressPercentage}%` : ''}
                </div>
                ${isToday ? '<div class="today-indicator"></div>' : ''}
            </div>
        `;
    }

    calendarElement.innerHTML = calendarHTML;
}

function calculateDayProgress(dayData) {
    let totalTasks = 0;
    let completedTasks = 0;
    
    console.log('Calculating progress for day data:', dayData);
    
    // Count main category tasks (custom_learning_, custom_daily_, etc.)
    for (const taskKey in dayData) {
        // Skip non-task keys and customCategories object
        if (taskKey === 'customCategories') continue;
        
        // Count any task that starts with 'custom_' 
        if (taskKey.startsWith('custom_')) {
            totalTasks++;
            if (dayData[taskKey] === true) {
                completedTasks++;
            }
            console.log(`Task: ${taskKey}, completed: ${dayData[taskKey]}`);
        }
    }
    
    // Count tasks from custom categories structure
    if (dayData.customCategories) {
        for (const catId in dayData.customCategories) {
            const category = dayData.customCategories[catId];
            const tasks = category.tasks || {};
            
            for (const taskId in tasks) {
                totalTasks++;
                const customTaskKey = `custom_${catId}_${taskId}`;
                // Check if this custom task has a completion status
                if (dayData[customTaskKey] === true) {
                    completedTasks++;
                }
                console.log(`Custom category task: ${customTaskKey}, completed: ${dayData[customTaskKey]}`);
            }
        }
    }
    
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    console.log('Final progress calculation:', {
        totalTasks,
        completedTasks,
        percentage
    });
    
    return {
        totalTasks,
        completedTasks,
        percentage
    };
}

// In tracker.js - Update the setupCalendarEventListeners function
function setupCalendarEventListeners() {
    // Previous month button
    const prevMonthBtn = document.getElementById('prev-month');
    if (prevMonthBtn) {
        prevMonthBtn.onclick = () => changeMonth(-1);
    }

    // Next month button
    const nextMonthBtn = document.getElementById('next-month');
    if (nextMonthBtn) {
        nextMonthBtn.onclick = () => changeMonth(1);
    }
    
    console.log('Calendar event listeners setup'); // Debug log
}

// In tracker.js - Make sure the changeMonth function is correct
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
    
    console.log(`Changing to: ${selectedYear}-${selectedMonth}`); // Debug log
    
    // Reload calendar using the proper function
    loadTrackerCalendar();
}

function selectDay(day) {
    selectedDay = day;
    showDayTracker(day);
}

function showDayTracker(day) {
    const trackerContainer = document.getElementById('tracker-container');
    const trackerTitle = document.getElementById('tracker-title');
    
    if (trackerContainer && trackerTitle) {
        trackerTitle.textContent = `Day ${day} - ${new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long' })}`;
        trackerContainer.style.display = 'block';
        
        // Load day data
        loadDayData(day);
    }
}

function goBack() {
    const trackerContainer = document.getElementById('tracker-container');
    if (trackerContainer) {
        trackerContainer.style.display = 'none';
        selectedDay = null;
    }
}

async function loadDayData(day) {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const dayKey = `day${day}`;
        
        // Load day data from database
        const snapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}`).once('value');
        const dayData = snapshot.val() || {};

        console.log('Loaded day data for progress:', dayData);

        // Load custom tasks from main categories
        const customTasksSnapshot = await database.ref(`users/${user.uid}/customTasks`).once('value');
        const customTasks = customTasksSnapshot.val() || {};

        // Load template content
        const template = document.getElementById('template-content');
        const trackerContent = document.getElementById('tracker-content');
        
        if (template && trackerContent) {
            // Replace template variables with actual day number
            const templateHTML = template.innerHTML.replace(/\${selectedDay}/g, day);
            trackerContent.innerHTML = templateHTML;
            
            // Load ALL tasks into their respective groups
            await loadAllTasksIntoGroups(day, customTasks, dayData);
            
            // Set up event listeners for checkboxes
            setupCheckboxListeners(day, dayData);
            
            // Update progress IMMEDIATELY with current data
            updateDayProgress(dayData);
            
            // Load custom categories
            await loadCustomCategories(day, dayData);
        }

    } catch (error) {
        console.error('Error loading day data:', error);
        showMessage('Error loading day data', 'error');
    }
}

function setupCheckboxListeners(day, dayData) {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        const taskType = checkbox.dataset.task;
        
        if (!taskType) return; // Skip if no task type
        
        // Set initial state based on dayData
        checkbox.checked = !!dayData[taskType];
        
        // Add change listener if not already set via HTML
        if (!checkbox.hasAttribute('listener-attached')) {
            checkbox.setAttribute('listener-attached', 'true');
            checkbox.addEventListener('change', async () => {
                if (taskType.startsWith('custom_')) {
                    await updateCustomTaskStatus(day, taskType, checkbox.checked);
                }
                // For your template, all tasks are custom so we only need the custom handler
            });
        }
    });
}

// UPDATED FUNCTION: Properly update task status and progress
async function updateTaskStatus(day, taskType, isCompleted) {       
    try {
        const user = auth.currentUser;      
        if (!user) return;

        const dayKey = `day${day}`;
        const updates = {};
        updates[`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/${taskType}`] = isCompleted;

        await database.ref().update(updates);
        
        // Reload day data to update progress
        const snapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}`).once('value');
        const dayData = snapshot.val() || {};
        
        // Update progress bar with new data
        updateDayProgress(dayData);
        
        // Refresh calendar to show updated progress
        await refreshTrackerCalendar();

    } catch (error) {
        console.error('Error updating task status:', error);
        showMessage('Error updating task', 'error');
    }
}

// UPDATED FUNCTION: Proper custom task status update
async function updateCustomTaskStatus(day, taskKey, isCompleted) {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const dayKey = `day${day}`;
        const updates = {};
        updates[`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/${taskKey}`] = isCompleted;

        await database.ref().update(updates);
        
        // Reload day data to update progress
        const snapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}`).once('value');
        const dayData = snapshot.val() || {};
        
        // Update progress with new data
        await updateDayProgress(dayData);
        
        // Refresh calendar
        await refreshTrackerCalendar();

    } catch (error) {
        console.error('Error updating custom task status:', error);
        showMessage('Error updating task', 'error');
    }
}


function updateDayProgress(dayData) {
    const progressBar = document.getElementById('day-progress-bar');
    const progressText = document.querySelector('.progress-text');
    
    if (progressBar && progressText) {
        // Use the same calculation function for consistency
        const progressData = calculateDayProgress(dayData);
        const progress = progressData.percentage;
        
        console.log('Progress calculation:', {
            totalTasks: progressData.totalTasks,
            completedTasks: progressData.completedTasks,
            percentage: progress,
            dayData: dayData
        });
        
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}% complete (${progressData.completedTasks}/${progressData.totalTasks} tasks)`;
        
        // Update progress bar color based on percentage
        progressBar.className = 'progress-fill';
        if (progress === 100) {
            progressBar.style.background = 'var(--gradient-success)';
        } else if (progress >= 70) {
            progressBar.style.background = 'var(--success)';
        } else if (progress >= 30) {
            progressBar.style.background = 'var(--warning)';
        } else {
            progressBar.style.background = 'var(--error)';
        }
    }
}

// In tracker.js - Update the loadCustomCategories function
async function loadCustomCategories(day, dayData) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const dayKey = `day${day}`;
        
        // Load custom categories specific to this day
        const snapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/customCategories`).once('value');
        const customCategories = snapshot.val() || {};
        
        const container = document.getElementById('custom-categories-container');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        // Add each custom category
        for (const [categoryId, category] of Object.entries(customCategories)) {
            const categoryHTML = `
                <div class="custom-category" data-category-id="${categoryId}">
                    <div class="category-header">
                        <h5><i class="fas ${category.icon || 'fa-tasks'}"></i> ${category.name}</h5>
                        <div class="category-actions">
                            <button class="icon-btn" onclick="editCustomCategory('${categoryId}', ${day})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="icon-btn" onclick="deleteCustomCategory('${categoryId}', ${day})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="category-tasks">
                        ${await generateCategoryTasks(day, categoryId, category, dayData)}
                    </div>
                </div>
            `;
            container.innerHTML += categoryHTML;
        }

    } catch (error) {
        console.error('Error loading custom categories:', error);
    }
}

// In tracker.js - Update the generateCategoryTasks function
async function generateCategoryTasks(day, categoryId, category, dayData) {
    const user = auth.currentUser;
    if (!user) return '';

    try {
        const dayKey = `day${day}`;
        
        // Load tasks for this specific day and category
        const tasksSnapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/customCategories/${categoryId}/tasks`).once('value');
        const tasks = tasksSnapshot.val() || {};
        
        let tasksHTML = '';

        for (const [taskId, task] of Object.entries(tasks)) {
            const taskKey = `custom_${categoryId}_${taskId}`;
            const isCompleted = dayData[taskKey] || false;
            
            tasksHTML += `
                <label class="checkbox-item">
                    <span>${task.name}</span>
                    <input type="checkbox" 
                           data-task="${taskKey}"
                           ${isCompleted ? 'checked' : ''}
                           onchange="updateCustomTaskStatus(${day}, '${taskKey}', this.checked)">
                    <button class="icon-btn small" onclick="deleteCustomTaskFromCategory('${categoryId}', '${taskId}', ${day})" style="margin-left: 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </label>
            `;
        }

        // Add button to manage tasks for this specific day category
        tasksHTML += `
            <button class="add-task-btn" onclick="manageDayCategoryTasks('${categoryId}', ${day})">
                <i class="fas fa-tasks"></i> Manage Tasks
            </button>
        `;

        return tasksHTML;

    } catch (error) {
        console.error('Error generating category tasks:', error);
        return '<p>Error loading tasks</p>';
    }
}

// UPDATED FUNCTION: Proper custom task status update
async function updateCustomTaskStatus(day, taskKey, isCompleted) {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const dayKey = `day${day}`;
        const updates = {};
        updates[`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/${taskKey}`] = isCompleted;

        await database.ref().update(updates);
        
        // Reload day data to update progress
        const snapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}`).once('value');
        const dayData = snapshot.val() || {};
        
        // Update progress with new data
        updateDayProgress(dayData);
        
        // Refresh calendar
        await refreshTrackerCalendar();

    } catch (error) {
        console.error('Error updating custom task status:', error);
        showMessage('Error updating task', 'error');
    }
}

function showAddCategoryModal(day) {
    const modal = document.getElementById('category-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('category-name').value = '';
        document.getElementById('category-icon').value = 'fa-book';
    }
}

function closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// UPDATED FUNCTION: Create new category and update progress
async function createNewCategory(day) {
    const user = auth.currentUser;
    if (!user) return;

    const categoryName = document.getElementById('category-name').value.trim();
    const categoryIcon = document.getElementById('category-icon').value;

    if (!categoryName) {
        showCategoryMessage('Please enter a category name', 'error');
        return;
    }

    try {
        // Create category specific to this day
        const dayKey = `day${day}`;
        const categoryRef = database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/customCategories`).push();
        await categoryRef.set({
            name: categoryName,
            icon: categoryIcon,
            created: new Date().toISOString(),
            daySpecific: true
        });

        showCategoryMessage('Category created successfully!', 'success');
        
        setTimeout(async () => {
            closeCategoryModal();
            if (selectedDay) {
                // Reload day data to show the new category
                await loadDayData(selectedDay);
                
                // Force progress update
                const snapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}`).once('value');
                const dayData = snapshot.val() || {};
                updateDayProgress(dayData);
                
                // Refresh calendar
                await refreshTrackerCalendar();
            }
        }, 1000);

    } catch (error) {
        console.error('Error creating category:', error);
        showCategoryMessage('Error creating category', 'error');
    }
}

function showCategoryMessage(message, type) {
    // You can implement a proper message display here
    alert(message); // Simple alert for now
}

function getCurrentDayFromTracker() {
    return selectedDay;
}


// UPDATED FUNCTION: Add custom task and immediately update progress
async function addCustomTaskToCategory(categoryType, day) {
    try {
        const user = auth.currentUser;
        if (!user) {
            showMessage('Please log in to add tasks', 'error');
            return;
        }

        const categoryNames = {
            'daily': 'Daily Activities',
            'learning': 'Learning & Reading',
            'mindfulness': 'Mindfulness & Reflection', 
            'extra': 'Additional Activities'
        };

        const taskName = prompt(`Enter a new task for ${categoryNames[categoryType]}:`);
        if (!taskName || !taskName.trim()) {
            return;
        }

        // Create a unique task ID
        const taskId = Date.now().toString();
        
        // Save the task to the user's custom tasks under the specific category
        await database.ref(`users/${user.uid}/customTasks/${categoryType}/${taskId}`).set({
            name: taskName.trim(),
            created: new Date().toISOString(),
            category: categoryType
        });

        showMessage('Task added successfully!', 'success');
        
        // IMMEDIATELY reload the current day data and update progress
        if (selectedDay) {
            await loadDayData(selectedDay);
            
            // Force immediate progress recalculation with updated data
            const dayKey = `day${selectedDay}`;
            const snapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}`).once('value');
            const dayData = snapshot.val() || {};
            updateDayProgress(dayData);
            
            // Also refresh the calendar to show updated progress
            await refreshTrackerCalendar();
        }

        refreshProgressBar(day);

    } catch (error) {
        console.error('Error adding custom task:', error);
        showMessage('Error adding task', 'error');
    }
}


// Add this function to load custom tasks into their groups

// UPDATED FUNCTION: Load custom tasks into their respective groups and update progress
function loadCustomTasksIntoGroups(customTasks, dayData) {
    const groups = {
        'daily': 'daily-activities-group',
        'learning': 'learning-group',
        'mindfulness': 'mindfulness-group', 
        'extra': 'extra-group'
    };

    for (const [categoryType, groupId] of Object.entries(groups)) {
        const groupElement = document.getElementById(groupId);
        if (!groupElement) continue;

        const categoryTasks = customTasks[categoryType] || {};
        
        // Clear the group but keep the structure
        groupElement.innerHTML = '';

        // Add existing tasks
        for (const [taskId, task] of Object.entries(categoryTasks)) {
            const taskKey = `custom_${categoryType}_${taskId}`;
            const isCompleted = dayData[taskKey] || false;
            
            const taskHTML = `
                <label class="checkbox-item">
                    <span>${task.name}</span>
                    <input type="checkbox" 
                           data-task="${taskKey}"
                           ${isCompleted ? 'checked' : ''}
                           onchange="updateCustomTaskStatus(${selectedDay}, '${taskKey}', this.checked)">
                    <button class="icon-btn small" onclick="deleteCustomTask('${categoryType}', '${taskId}')" style="margin-left: 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </label>
            `;
            groupElement.innerHTML += taskHTML;
        }

        // Add the "Add Activity" button
        const addButton = document.createElement('button');
        addButton.className = 'add-task-btn';
        addButton.innerHTML = '<i class="fas fa-plus"></i> Add Activity';
        addButton.onclick = () => addCustomTask(getCategoryDisplayName(categoryType), categoryType);
        groupElement.appendChild(addButton);
    }
    
    // Update progress after loading all tasks
    updateDayProgress(dayData);
}

// Helper function to get display names for categories
function getCategoryDisplayName(categoryType) {
    const names = {
        'daily': 'Daily Activities',
        'learning': 'Learning & Reading',
        'mindfulness': 'Mindfulness & Reflection', 
        'extra': 'Additional Activities'
    };
    return names[categoryType] || categoryType;
}

// ENHANCED FUNCTION: Delete custom tasks and update progress immediately
async function deleteCustomTask(categoryType, taskId, day = null) {
    const user = auth.currentUser;
    if (!user) return;

    // Use provided day or current selected day
    const targetDay = day || selectedDay;
    if (!targetDay) return;

    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        // Remove from custom tasks
        await database.ref(`users/${user.uid}/customTasks/${categoryType}/${taskId}`).remove();
        
        // Also remove from day data if it exists
        const taskKey = `custom_${categoryType}_${taskId}`;
        const dayKey = `day${targetDay}`;
        await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/${taskKey}`).remove();

        showMessage('Task deleted!', 'success');
        
        // Reload the current day and update progress immediately
        if (selectedDay) {
            await loadDayData(selectedDay);
        }

    } catch (error) {
        console.error('Error deleting task:', error);
        showMessage('Error deleting task', 'error');
    }
}

// Add this function to tracker.js
function setupTrackerRealTimeListener() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Listen for changes in the current month's tracker data
        database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}`)
            .on('value', (snapshot) => {
                // Only refresh if we're on the tracker page
                if (document.getElementById('tracker-page').style.display === 'block') {
                    generateCalendarGrid();
                }
            });
        
        console.log('Real-time tracker listener setup');
    } catch (error) {
        console.error('Error setting up real-time listener:', error);
    }
}

// Make sure all functions are available globally
window.addCustomTask = addCustomTask;
window.loadCustomTasksIntoGroups = loadCustomTasksIntoGroups;
window.deleteCustomTask = deleteCustomTask;
window.getCategoryDisplayName = getCategoryDisplayName;
window.setupTrackerRealTimeListener = setupTrackerRealTimeListener;
window.loadTrackerCalendar = loadTrackerCalendar;
window.selectDay = selectDay;
window.goBack = goBack;
window.changeMonth = changeMonth;
window.showAddCategoryModal = showAddCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.createNewCategory = createNewCategory;
window.getCurrentDayFromTracker = getCurrentDayFromTracker;
window.refreshTrackerCalendar = refreshTrackerCalendar;

// Also add these related functions for managing custom tasks
async function manageDayCategoryTasks(categoryId, day) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const dayKey = `day${day}`;
        
        // Load current tasks for this specific day category
        const snapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/customCategories/${categoryId}/tasks`).once('value');
        const tasks = snapshot.val() || {};
        
        let taskList = "Current tasks for today:\n";
        Object.entries(tasks).forEach(([taskId, task]) => {
            taskList += `• ${task.name}\n`;
        });
        
        const action = prompt(`${taskList}\n\nEnter:\n1. "add" to add a new task\n2. Task name to delete it`);
        
        if (action === 'add' || action === '1') {
            await addTaskToDayCategory(categoryId, day);
        } else if (action) {
            await deleteTaskFromDayCategory(categoryId, action, tasks, day);
        }
        
    } catch (error) {
        console.error('Error managing day category tasks:', error);
        showMessage('Error managing tasks', 'error');
    }
}

async function addTaskToDayCategory(categoryType, day) {
    const user = auth.currentUser;
    if (!user) {
        showMessage('Please log in to add tasks', 'error');
        return;
    }

    const categoryNames = {
        'daily': 'Daily Activities',
        'learning': 'Learning & Reading',
        'mindfulness': 'Mindfulness & Reflection', 
        'extra': 'Additional Activities'
    };

    const taskName = prompt(`Enter a new task for ${categoryNames[categoryType]}:`);
    if (!taskName || !taskName.trim()) {
        return;
    }

    try {
        const taskId = Date.now().toString();
        
        await database.ref(`users/${user.uid}/customTasks/${categoryType}/${taskId}`).set({
            name: taskName.trim(),
            created: new Date().toISOString(),
            category: categoryType
        });

        showMessage('Task added successfully!', 'success');
        
        // CALL REFRESH PROGRESS BAR IMMEDIATELY
        await refreshProgressBar(selectedDay);
        
        // Also reload the day data to show the new task in the list
        await loadDayData(selectedDay);

    } catch (error) {
        console.error('Error adding task:', error);
        showMessage('Error adding task', 'error');
    }
}

// UPDATED FUNCTION: Delete task from day category and update progress
async function deleteCustomTaskFromCategory(categoryId, taskId, day) {
    const user = auth.currentUser;
    if (!user) return;

    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const dayKey = `day${day}`;
        await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/customCategories/${categoryId}/tasks/${taskId}`).remove();
        showMessage('Task deleted!', 'success');
        
        // Reload the current day and update progress immediately
        if (selectedDay) {
            await loadDayData(selectedDay);
            
            // Force immediate progress recalculation
            const snapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}`).once('value');
            const dayData = snapshot.val() || {};
            updateDayProgress(dayData);
        }

    } catch (error) {
        console.error('Error deleting task:', error);
        showMessage('Error deleting task', 'error');
    }
}

async function deleteTaskFromDayCategory(categoryId, taskName, tasks, day) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const dayKey = `day${day}`;
        
        // Find the task ID that matches the task name
        const taskEntry = Object.entries(tasks).find(([id, task]) => task.name === taskName);
        
        if (taskEntry) {
            const [taskId] = taskEntry;
            await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/customCategories/${categoryId}/tasks/${taskId}`).remove();
            showMessage('Task deleted!', 'success');
            
            // Reload the current day
            if (selectedDay) {
                loadDayData(selectedDay);
            }
        } else {
            showMessage('Task not found', 'error');
        }
        
    } catch (error) {
        console.error('Error deleting task from day category:', error);
        showMessage('Error deleting task', 'error');
    }
}

async function editCustomCategory(categoryId, day) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const dayKey = `day${day}`;
        const snapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/customCategories/${categoryId}`).once('value');
        const category = snapshot.val();
        
        if (!category) return;

        const newName = prompt('Enter new category name:', category.name);
        if (!newName || !newName.trim()) return;

        await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/customCategories/${categoryId}/name`).set(newName.trim());
        showMessage('Category updated!', 'success');
        
        // Reload the current day
        if (selectedDay) {
            loadDayData(selectedDay);
        }

    } catch (error) {
        console.error('Error editing category:', error);
        showMessage('Error editing category', 'error');
    }
}

async function deleteCustomCategory(categoryId, day) {
    const user = auth.currentUser;
    if (!user) return;

    if (!confirm('Are you sure you want to delete this category? This will also delete all tasks in this category for today.')) {
        return;
    }

    try {
        const dayKey = `day${day}`;
        await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/customCategories/${categoryId}`).remove();
        showMessage('Category deleted!', 'success');
        
        // Reload the current day
        if (selectedDay) {
            loadDayData(selectedDay);
        }

    } catch (error) {
        console.error('Error deleting category:', error);
        showMessage('Error deleting category', 'error');
    }
}

// Update the function name for deleting tasks from day categories
async function deleteCustomTaskFromCategory(categoryId, taskId, day) {
    const user = auth.currentUser;
    if (!user) return;

    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const dayKey = `day${day}`;
        await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}/customCategories/${categoryId}/tasks/${taskId}`).remove();
        showMessage('Task deleted!', 'success');
        
        // Reload the current day
        if (selectedDay) {
            loadDayData(selectedDay);
        }

    } catch (error) {
        console.error('Error deleting task:', error);
        showMessage('Error deleting task', 'error');
    }
}

// NEW FUNCTION: Load all tasks including main categories and custom categories
async function loadAllTasksIntoGroups(day, customTasks, dayData) {
    const user = auth.currentUser;
    if (!user) return;

    // Load main category tasks (daily, learning, mindfulness, extra)
    await loadMainCategoryTasks(day, customTasks, dayData);
    
    // Load custom categories (already handled by loadCustomCategories)
    // This will ensure both types are counted in progress
}

// UPDATED FUNCTION: Load main category tasks with proper structure
async function loadMainCategoryTasks(day, customTasks, dayData) {
    const categories = {
        'daily': {
            container: 'daily-activities-group',
            name: 'Daily Activities'
        },
        'learning': {
            container: 'learning-group', 
            name: 'Learning & Reading'
        },
        'mindfulness': {
            container: 'mindfulness-group',
            name: 'Mindfulness & Reflection'
        },
        'extra': {
            container: 'extra-group',
            name: 'Additional Activities'
        }
    };

    for (const [categoryType, categoryInfo] of Object.entries(categories)) {
        const container = document.getElementById(categoryInfo.container);
        if (!container) continue;

        // Clear container
        container.innerHTML = '';

        // Get tasks for this category
        const categoryTasks = customTasks[categoryType] || {};
        
        // Add each task to the container
        for (const [taskId, task] of Object.entries(categoryTasks)) {
            const taskKey = `custom_${categoryType}_${taskId}`;
            const isCompleted = dayData[taskKey] || false;
            
            const taskHTML = `
                <div class="task-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 8px;">
                    <label style="flex: 1; display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" 
                               data-task="${taskKey}"
                               ${isCompleted ? 'checked' : ''}
                               onchange="updateCustomTaskStatus(${day}, '${taskKey}', this.checked)"
                               style="width: 18px; height: 18px;">
                        <span>${task.name}</span>
                    </label>
                    <button class="icon-btn small" onclick="deleteCustomTask('${categoryType}', '${taskId}', ${day})" style="background: none; border: none; color: #dc3545; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.innerHTML += taskHTML;
        }

        // If no tasks, show empty state
        if (Object.keys(categoryTasks).length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #6c757d;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No activities yet</p>
                </div>
            `;
        }
    }
    
    // Update progress after loading all main category tasks
    updateDayProgress(dayData);
}

// NEW FUNCTION: Load main category tasks with proper structure
async function loadMainCategoryTasks(day, customTasks, dayData) {
    const categories = {
        'daily': {
            container: 'daily-activities-group',
            name: 'Daily Activities'
        },
        'learning': {
            container: 'learning-group', 
            name: 'Learning & Reading'
        },
        'mindfulness': {
            container: 'mindfulness-group',
            name: 'Mindfulness & Reflection'
        },
        'extra': {
            container: 'extra-group',
            name: 'Additional Activities'
        }
    };

    for (const [categoryType, categoryInfo] of Object.entries(categories)) {
        const container = document.getElementById(categoryInfo.container);
        if (!container) continue;

        // Clear container
        container.innerHTML = '';

        // Get tasks for this category
        const categoryTasks = customTasks[categoryType] || {};
        
        // Add each task to the container
        for (const [taskId, task] of Object.entries(categoryTasks)) {
            const taskKey = `custom_${categoryType}_${taskId}`;
            const isCompleted = dayData[taskKey] || false;
            
            const taskHTML = `
                <div class="task-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 8px;">
                    <label style="flex: 1; display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" 
                               data-task="${taskKey}"
                               ${isCompleted ? 'checked' : ''}
                               onchange="updateCustomTaskStatus(${day}, '${taskKey}', this.checked)"
                               style="width: 18px; height: 18px;">
                        <span>${task.name}</span>
                    </label>
                    <button class="icon-btn small" onclick="deleteCustomTask('${categoryType}', '${taskId}', ${day})" style="background: none; border: none; color: #dc3545; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.innerHTML += taskHTML;
        }

        // If no tasks, show empty state
        if (Object.keys(categoryTasks).length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #6c757d;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No activities yet</p>
                </div>
            `;
        }
    }
}

// NEW FUNCTION: Force progress bar refresh
async function refreshProgressBar(day) {
    try {
        const user = auth.currentUser;
        if (!user || !day) return;

        const dayKey = `day${day}`;
        const snapshot = await database.ref(`users/${user.uid}/tracker/${selectedYear}/${selectedMonth}/${dayKey}`).once('value');
        const dayData = snapshot.val() || {};
        
        console.log('Refreshing progress with data:', dayData);
        updateDayProgress(dayData);
        
    } catch (error) {
        console.error('Error refreshing progress bar:', error);
    }
}

// Make sure all functions are available globally
window.manageDayCategoryTasks = manageDayCategoryTasks;
window.addTaskToDayCategory = addTaskToDayCategory;
window.deleteTaskFromDayCategory = deleteTaskFromDayCategory;
window.editCustomCategory = editCustomCategory;
window.deleteCustomCategory = deleteCustomCategory;
window.deleteCustomTaskFromCategory = deleteCustomTaskFromCategory;
window.addCustomTaskToCategory = addCustomTaskToCategory;
window.loadAllTasksIntoGroups = loadAllTasksIntoGroups;
window.loadMainCategoryTasks = loadMainCategoryTasks;
window.refreshProgressBar = refreshProgressBar; 
window.addTaskToDayCategory = addTaskToDayCategory;