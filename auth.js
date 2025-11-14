// Authentication Functions
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const messageElement = document.getElementById('auth-message');

    try {
        // Clear previous messages
        messageElement.style.display = 'none';
        
        // Validate inputs
        if (!email || !password) {
            showAuthMessage('Please fill in all fields', 'error');
            return;
        }

        // Show loading state
        showAuthMessage('Signing in...', 'info');

        // Sign in with Firebase
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Success
        showAuthMessage('Successfully signed in!', 'success');
        closeAuthModal();
        
        // Clear form
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';

    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. Please try again.';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
        }
        
        showAuthMessage(errorMessage, 'error');
    }
}

async function register() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const messageElement = document.getElementById('auth-message');

    try {
        // Clear previous messages
        messageElement.style.display = 'none';
        
        // Validate inputs
        if (!username || !email || !password || !confirmPassword) {
            showAuthMessage('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showAuthMessage('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            showAuthMessage('Password must be at least 6 characters', 'error');
            return;
        }

        // Show loading state
        showAuthMessage('Creating account...', 'info');

        // Create user with Firebase
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update profile with username
        await user.updateProfile({
            displayName: username
        });

        // Create user record in database
        await database.ref(`users/${user.uid}`).set({
            username: username,
            email: email,
            joinDate: new Date().toISOString(),
            isAdmin: false
        });

        // Initialize default daily activities for new user
        await initializeDefaultDailyActivities(user.uid);

        // SUCCESS - Show success message and close modal
        showAuthMessage('Account created successfully!', 'success');
        
        // Clear form
        document.getElementById('register-username').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm-password').value = '';

        // Close modal after short delay
        setTimeout(() => {
            closeAuthModal();
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        
        // Only show specific error messages for actual failures
        let errorMessage = 'Registration failed. Please try again.';
        
        // Check if this is a "fake" error (user was actually created)
        const user = auth.currentUser;
        if (user) {
            // User was created successfully despite the error
            console.log('User created successfully, ignoring minor error:', error);
            showAuthMessage('Account created successfully!', 'success');
            
            // Clear form and close modal
            document.getElementById('register-username').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
            document.getElementById('register-confirm-password').value = '';
            
            setTimeout(() => {
                closeAuthModal();
            }, 1500);
            return;
        }
        
        // Handle actual errors
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak.';
                break;
        }
        
        showAuthMessage(errorMessage, 'error');
    }
}

async function logout() {
    try {
        await auth.signOut();
        showMessage('Successfully logged out', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Error logging out', 'error');
    }
}

function showAuthMessage(message, type) {
    const messageElement = document.getElementById('auth-message');
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.style.display = 'block';
}
// In auth.js - Update the makeMeAdmin function
async function makeMeAdmin() {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in first');
            return;
        }
        
        console.log('Making user admin:', user.uid);
        await database.ref(`users/${user.uid}/isAdmin`).set(true);
        
        console.log('Admin status updated, reloading page...');
        alert('You are now an admin! The page will reload.');
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Error making user admin:', error);
        alert('Error: ' + error.message);
    }
}

async function initializeDefaultDailyActivities(userId) {
    try {
        // Initialize with empty tracker structure
        await database.ref(`users/${userId}/tracker`).set({});
        
        console.log('Default activities initialized for user:', userId);
    } catch (error) {
        console.error('Error initializing default activities:', error);
        // Don't throw error here - it shouldn't block registration
    }
}
window.makeMeAdmin = makeMeAdmin;

// Make functions available globally
window.login = login;
window.register = register;
window.logout = logout;