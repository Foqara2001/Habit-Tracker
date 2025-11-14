// Resources Functions
let resourcesData = {};

async function loadResources() {
    try {
        const user = auth.currentUser;
        
        // Debug: Check admin status
        console.log('=== DEBUG ADMIN STATUS ===');
        await debugAdminStatus();
        
        // Rest of your existing code...
        const addResourceBtnContainer = document.getElementById('add-resource-btn-container');
        if (user) {
            const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = userSnapshot.val() || {};
            
            if (userData.isAdmin) {
                addResourceBtnContainer.style.display = 'block';
                console.log('Admin controls should be visible');
            } else {
                addResourceBtnContainer.style.display = 'none';
            }
        } else {
            addResourceBtnContainer.style.display = 'none';
        }

        // Load resources from database
        await loadResourcesFromDatabase();
        
        // Display resources in respective tabs
        displayResourcesByCategory();

    } catch (error) {
        console.error('Error loading resources:', error);
        showMessage('Error loading resources', 'error');
    }
}

async function loadResourcesFromDatabase() {
    try {
        const snapshot = await database.ref('resources').once('value');
        const data = snapshot.val() || {};
        
        // Convert Firebase object to array with IDs
        const processResources = (resourcesObj) => {
            if (!resourcesObj) return [];
            return Object.entries(resourcesObj).map(([id, resource]) => ({
                id: id,
                ...resource
            }));
        };

        resourcesData = {
            articles: processResources(data.articles) || getDefaultArticles(),
            learning: processResources(data.learning) || getDefaultLearning(),
            videos: processResources(data.videos) || getDefaultVideos(),
            books: processResources(data.books) || getDefaultBooks()
        };

    } catch (error) {
        console.error('Error loading resources from database:', error);
        // Fallback to default resources
        resourcesData = {
            articles: getDefaultArticles(),
            learning: getDefaultLearning(),
            videos: getDefaultVideos(),
            books: getDefaultBooks()
        };
    }
}

function getDefaultArticles() {
    return [
        {
            id: 'default-1',
            title: "The Power of Daily Habits",
            url: "https://example.com/power-of-daily-habits",
            author: "Alex Johnson",
            addedBy: "system"
        },
        // ... other default articles with IDs
    ];
}

function getDefaultLearning() {
    return [
        {
            title: "Introduction to Habit Formation",
            url: "https://example.com/intro-habit-formation",
            author: "Learning Team",
            addedBy: "system"
        },
        {
            title: "Advanced Tracking Techniques",
            url: "https://example.com/advanced-tracking",
            author: "Emily Davis",
            addedBy: "system"
        }
    ];
}

function getDefaultVideos() {
    return [
        {
            title: "Habit Tracking for Beginners",
            url: "https://youtube.com/watch?v=example1",
            author: "David Wilson",
            addedBy: "system"
        },
        {
            title: "Advanced Productivity Systems",
            url: "https://youtube.com/watch?v=example2",
            author: "Lisa Brown",
            addedBy: "system"
        }
    ];
}

function getDefaultBooks() {
    return [
        {
            title: "Atomic Habits by James Clear",
            url: "https://example.com/atomic-habits",
            author: "James Clear",
            addedBy: "system"
        },
        {
            title: "The Power of Now by Eckhart Tolle",
            url: "https://example.com/power-of-now",
            author: "Eckhart Tolle",
            addedBy: "system"
        }
    ];
}

async function displayResourcesByCategory() {
    const categories = ['articles', 'learning', 'videos', 'books'];
    const user = auth.currentUser;
    let isAdmin = false;
    
    // Check admin status
    if (user) {
        const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = userSnapshot.val() || {};
        isAdmin = userData.isAdmin === true;
    }
    
    console.log('Displaying resources - isAdmin:', isAdmin);
    
    categories.forEach(category => {
        const resourceList = document.getElementById(`${category}-resources`);
        if (resourceList) {
            const resources = resourcesData[category] || [];
            
            if (resources.length === 0) {
                resourceList.innerHTML = `
                    <li class="empty-resource">
                        <i class="fas fa-inbox"></i>
                        <span>No resources available yet</span>
                    </li>
                `;
            } else {
                resourceList.innerHTML = resources.map((resource, index) => {
                    const resourceId = resource.id || `temp-${index}`;
                    return `
                        <li class="resource-item" data-resource-id="${resourceId}">
                            <div class="resource-content">
                                <h4>${resource.title}</h4>
                                ${resource.author ? `<p class="resource-author">By ${resource.author}</p>` : ''}
                                <a href="${resource.url}" target="_blank" class="resource-link">
                                    <i class="fas fa-external-link-alt"></i>
                                    Visit Resource
                                </a>
                            </div>
                            ${isAdmin ? `
                            <div class="resource-actions">
                                <button class="edit-resource-btn" onclick="editResource('${category}', '${resourceId}', ${JSON.stringify(resource.title).replace(/"/g, '&quot;')}, ${JSON.stringify(resource.url).replace(/"/g, '&quot;')}, ${JSON.stringify(resource.author || '').replace(/"/g, '&quot;')})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-resource-btn" onclick="deleteResource('${category}', '${resourceId}', ${JSON.stringify(resource.title).replace(/"/g, '&quot;')})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                            ` : ''}
                        </li>
                    `;
                }).join('');
            }
        }
    });
}

function openTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Activate selected tab button
    event.currentTarget.classList.add('active');
}
function showAddResourceModal() {
    const modal = document.getElementById('resource-modal');
    if (modal) {
        resetResourceModal();
        modal.style.display = 'flex';
        
        // Show author field for books
        document.getElementById('resource-modal-type').addEventListener('change', function() {
            if (this.value === 'books') {
                document.getElementById('author-field').style.display = 'block';
            } else {
                document.getElementById('author-field').style.display = 'none';
            }
        });
    }
}

function closeResourceModal() {
    const modal = document.getElementById('resource-modal');
    if (modal) {
        modal.style.display = 'none';
        resetResourceModal();
    }
}

function closeResourceModal() {
    const modal = document.getElementById('resource-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function saveResource() {
    const user = auth.currentUser;
    if (!user) {
        showMessage('Please log in to add resources', 'error');
        return;
    }

    const type = document.getElementById('resource-modal-type').value;
    const title = document.getElementById('resource-modal-title').value.trim();
    const url = document.getElementById('resource-modal-url').value.trim();
    const author = document.getElementById('resource-modal-author').value.trim();

    // Validation
    if (!title || !url) {
        showResourceMessage('Please fill in all required fields', 'error');
        return;
    }

    if (!isValidUrl(url)) {
        showResourceMessage('Please enter a valid URL', 'error');
        return;
    }

    try {
        // Show loading state
        showResourceMessage('Adding resource...', 'info');

        // Create resource object
        const newResource = {
            title: title,
            url: url,
            addedBy: user.uid,
            addedAt: new Date().toISOString()
        };

        // Add author for books
        if (type === 'books' && author) {
            newResource.author = author;
        }

        // Add to database
        const resourceRef = database.ref(`resources/${type}`).push();
        await resourceRef.set(newResource);

        // Update local data and UI
        if (!resourcesData[type]) {
            resourcesData[type] = [];
        }
        resourcesData[type].push(newResource);

        // Success
        showResourceMessage('Resource added successfully!', 'success');
        
        // Close modal and refresh display
        setTimeout(() => {
            closeResourceModal();
            displayResourcesByCategory();
        }, 1000);

    } catch (error) {
        console.error('Error saving resource:', error);
        showResourceMessage('Error adding resource: ' + error.message, 'error');
    }
}

function showResourceMessage(message, type) {
    const messageElement = document.getElementById('resource-modal-message');
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.style.display = 'block';
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

async function deleteResource(category, resourceId, resourceTitle) {
    const user = auth.currentUser;
    if (!user) return;

    // Verify user is admin
    const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
    const userData = userSnapshot.val() || {};
    
    if (!userData.isAdmin) {
        showMessage('Only administrators can delete resources', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete "${resourceTitle}"?`)) {
        return;
    }

    try {
        // Remove the resource from database
        await database.ref(`resources/${category}/${resourceId}`).remove();

        // Update local data
        if (resourcesData[category]) {
            // If resourceId is numeric index (for default resources)
            if (!isNaN(resourceId)) {
                resourcesData[category].splice(resourceId, 1);
            } else {
                // If resourceId is Firebase key
                delete resourcesData[category][resourceId];
            }
        }

        // Update UI
        displayResourcesByCategory();
        
        showMessage('Resource deleted successfully', 'success');

    } catch (error) {
        console.error('Error deleting resource:', error);
        showMessage('Error deleting resource', 'error');
    }
}

// Set up event listener for save button
document.addEventListener('DOMContentLoaded', function() {
    const saveBtn = document.getElementById('save-resource-btn');
    if (saveBtn) {
        saveBtn.onclick = saveResource;
    }
});

// Function to edit resource
function editResource(category, resourceId, currentTitle, currentUrl, currentAuthor) {
    const user = auth.currentUser;
    if (!user) return;

    // Check if user is admin
    checkAdminStatus().then(isAdmin => {
        if (!isAdmin) {
            showMessage('Only administrators can edit resources', 'error');
            return;
        }

        // Populate modal with current data
        document.getElementById('resource-modal-title').value = currentTitle;
        document.getElementById('resource-modal-url').value = currentUrl;
        document.getElementById('resource-modal-author').value = currentAuthor || '';
        document.getElementById('resource-modal-type').value = category;
        
        // Show author field for books
        if (category === 'books') {
            document.getElementById('author-field').style.display = 'block';
        } else {
            document.getElementById('author-field').style.display = 'none';
        }

        // Change modal title and button
        document.querySelector('#resource-modal .modal-header h3').textContent = 'Edit Resource';
        const saveBtn = document.getElementById('save-resource-btn');
        saveBtn.textContent = 'Update Resource';
        saveBtn.onclick = () => updateResource(category, resourceId);

        // Show modal
        const modal = document.getElementById('resource-modal');
        modal.style.display = 'flex';
        modal.setAttribute('data-editing', 'true');
        modal.setAttribute('data-category', category);
        modal.setAttribute('data-resource-id', resourceId);
    });
}

// Function to update resource
async function updateResource(category, resourceId) {
    const user = auth.currentUser;
    if (!user) {
        showMessage('Please log in to edit resources', 'error');
        return;
    }

    const title = document.getElementById('resource-modal-title').value.trim();
    const url = document.getElementById('resource-modal-url').value.trim();
    const author = document.getElementById('resource-modal-author').value.trim();

    // Validation
    if (!title || !url) {
        showResourceMessage('Please fill in all required fields', 'error');
        return;
    }

    if (!isValidUrl(url)) {
        showResourceMessage('Please enter a valid URL', 'error');
        return;
    }

    try {
        showResourceMessage('Updating resource...', 'info');

        // Create updated resource object
        const updatedResource = {
            title: title,
            url: url,
            updatedBy: user.uid,
            updatedAt: new Date().toISOString()
        };

        // Add author for books
        if (category === 'books' && author) {
            updatedResource.author = author;
        }

        // Update in database
        await database.ref(`resources/${category}/${resourceId}`).update(updatedResource);

        // Update local data
        if (resourcesData[category] && resourcesData[category][resourceId]) {
            resourcesData[category][resourceId] = {
                ...resourcesData[category][resourceId],
                ...updatedResource
            };
        }

        showResourceMessage('Resource updated successfully!', 'success');
        
        setTimeout(() => {
            closeResourceModal();
            displayResourcesByCategory();
        }, 1000);

    } catch (error) {
        console.error('Error updating resource:', error);
        showResourceMessage('Error updating resource: ' + error.message, 'error');
    }
}

// Function to reset modal for adding new resource
function resetResourceModal() {
    document.getElementById('resource-modal-title').value = '';
    document.getElementById('resource-modal-url').value = '';
    document.getElementById('resource-modal-author').value = '';
    document.getElementById('resource-modal-type').value = 'articles';
    document.getElementById('author-field').style.display = 'none';
    
    document.querySelector('#resource-modal .modal-header h3').textContent = 'Add New Resource';
    const saveBtn = document.getElementById('save-resource-btn');
    saveBtn.textContent = 'Save Resource';
    saveBtn.onclick = saveResource;
    
    const modal = document.getElementById('resource-modal');
    modal.removeAttribute('data-editing');
    modal.removeAttribute('data-category');
    modal.removeAttribute('data-resource-id');
}

async function checkAdminStatus() {
    try {
        const user = auth.currentUser;
        if (!user) return false;
        
        const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = userSnapshot.val() || {};
        return userData.isAdmin === true;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}
// Add this to resources.js
async function debugAdminStatus() {
    const user = auth.currentUser;
    console.log('Current user:', user);
    
    if (user) {
        const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = userSnapshot.val() || {};
        console.log('User data:', userData);
        console.log('isAdmin:', userData.isAdmin);
        
        const addResourceBtnContainer = document.getElementById('add-resource-btn-container');
        console.log('Add resource button container:', addResourceBtnContainer);
        
        if (userData.isAdmin) {
            console.log('User is admin - should show admin controls');
            if (addResourceBtnContainer) {
                addResourceBtnContainer.style.display = 'block';
                console.log('Add resource button should be visible now');
            }
        } else {
            console.log('User is NOT admin');
        }
    } else {
        console.log('No user logged in');
    }
}

// Add this to resources.js
function refreshAdminControls() {
    const user = auth.currentUser;
    const addResourceBtnContainer = document.getElementById('add-resource-btn-container');
    
    if (user && addResourceBtnContainer) {
        database.ref(`users/${user.uid}/isAdmin`).once('value').then(snapshot => {
            const isAdmin = snapshot.val();
            console.log('Real-time admin check:', isAdmin);
            
            if (isAdmin) {
                addResourceBtnContainer.style.display = 'block';
                // Re-render resources with admin controls
                displayResourcesByCategory();
            } else {
                addResourceBtnContainer.style.display = 'none';
            }
        });
    }
}

// Call this when the resources page loads
document.addEventListener('DOMContentLoaded', function() {
    // Refresh admin controls when resources page is shown
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const resourcesPage = document.getElementById('resources-page');
                if (resourcesPage && resourcesPage.style.display === 'block') {
                    refreshAdminControls();
                }
            }
        });
    });
    
    const resourcesPage = document.getElementById('resources-page');
    if (resourcesPage) {
        observer.observe(resourcesPage, { attributes: true });
    }
});



// Make functions available globally
window.openTab = openTab;
window.showAddResourceModal = showAddResourceModal;
window.closeResourceModal = closeResourceModal;
window.saveResource = saveResource;
window.deleteResource = deleteResource;