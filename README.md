# Daily Habit Tracker 📊
A modern, responsive web application for tracking daily habits and activities. Built with Firebase for real-time data synchronization, this tool helps users monitor their progress, build consistent routines, and achieve personal goals through intuitive visual tracking.

<img width="1711" height="853" alt="image" src="https://github.com/user-attachments/assets/ad4aab28-d9a0-40b0-801f-4bdde9af44bc" />


# ✨ Features

🎯 Core Functionality

Daily Activity Tracking - Customizable habit monitoring with progress visualization.

Interactive Calendar - Color-coded completion overview with real-time updates.

Progress Analytics - Detailed statistics and completion rates.

Custom Categories - Create personalized activity groups.

<img width="897" height="825" alt="image" src="https://github.com/user-attachments/assets/407a624e-9d02-4d1c-b512-c3ca5d2abbcb" />




<img width="1689" height="812" alt="image" src="https://github.com/user-attachments/assets/5a2acef3-7761-499f-8e57-8af1cfd13ee4" />




# 👥 User Management

Secure Authentication - Firebase-powered user registration and login

<img width="633" height="605" alt="image" src="https://github.com/user-attachments/assets/20027ecc-bb5c-4949-95e2-f48e69efebe0" />

<img width="623" height="651" alt="image" src="https://github.com/user-attachments/assets/70bca813-17b5-4f1b-b455-bad2cac0d7ab" />



User Profiles - Personal statistics, streaks, and progress history

<img width="1732" height="791" alt="image" src="https://github.com/user-attachments/assets/06585c5e-074c-49c4-9818-8cf9d189621c" />

<img width="1348" height="683" alt="image" src="https://github.com/user-attachments/assets/a669e3d9-4cd0-4f4a-88a5-dbe0fe414907" />



# Admin Dashboard - Comprehensive user management and analytics

<img width="1618" height="547" alt="image" src="https://github.com/user-attachments/assets/fb346539-9fbc-4b43-98c6-ad104af37537" />

<img width="1335" height="547" alt="image" src="https://github.com/user-attachments/assets/f6d7696e-14ad-410a-ac84-39bed04e3d92" />


# 📚 Resources
Learning Library - Curated articles, videos, and books

Admin Controls - Add/edit/delete resources (admin only)

Categorized Content - Organized by type for easy browsing

<img width="1584" height="557" alt="image" src="https://github.com/user-attachments/assets/660be635-6639-4f5b-b6d1-728f1f725793" />


# 🎨 User Experience
Responsive Design - Works seamlessly across all devices

Modern UI - Clean, intuitive interface with smooth animations

Real-time Updates - Instant synchronization across all devices

# 🚀 Quick Start
Prerequisites
Modern web browser (Chrome, Firefox, Safari, Edge)

Firebase project with Realtime Database

# Installation
Clone the repository

bash
git clone https://github.com/yourusername/daily-habit-tracker.git
cd daily-habit-tracker
Set up Firebase

Create a new Firebase project at Firebase Console

Enable Authentication (Email/Password) and Realtime Database

Update config.js with your Firebase configuration

Launch the application

Open index.html in your web browser

Or serve using a local server:

bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server
🛠️ Technology Stack
Frontend: HTML5, CSS3, Vanilla JavaScript

Backend: Firebase (Authentication & Realtime Database)

Styling: Custom CSS with CSS Variables and Modern Design

Charts: Chart.js for progress visualization

Icons: Font Awesome

# 📁 Project Structure
text
daily-habit-tracker/

├── index.html          # Main application file

├── styles.css          # Comprehensive styling

├── config.js           # Firebase configuration

├── app.js              # Main application logic

├── auth.js             # Authentication functions

├── tracker.js          # Daily tracking functionality

├── profile.js          # User profile management

├── admin.js            # Admin dashboard

├── resources.js        # Resource management

└── script.js           # Utility functions and initialization

# 🔧 Configuration
Firebase Setup
Create a new Firebase project

Enable Email/Password authentication

Create a Realtime Database with rules:

json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "resources": {
      ".read": true,
      ".write": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() === true"
    }
  }
}
Copy your Firebase config to config.js

# 🎮 Usage
For Users
Register/Login - Create an account or sign in

Track Habits - Use the daily tracker to mark completed activities

View Progress - Check calendar and statistics for completion overview

Explore Resources - Browse learning materials in the resources section

For Admins
Access Admin Panel - Available after admin privileges are granted

Manage Users - View user statistics and activity

Modify Resources - Add, edit, or delete learning materials

# 📊 Features in Detail
Daily Tracker
Add custom activities and categories

Real-time progress calculation

Monthly calendar view with completion indicators

Custom task management

Profile Management
Personal statistics (streaks, completion rates)

Progress charts and historical data

Account customization options

Admin Features
User activity monitoring

System-wide analytics

Content management capabilities

# 🤝 Contributing
We welcome contributions! Please feel free to submit pull requests or open issues for bugs and feature requests.

Development Setup
Fork the repository

Create a feature branch: git checkout -b feature/amazing-feature

Commit your changes: git commit -m 'Add amazing feature'

Push to the branch: git push origin feature/amazing-feature

Open a pull request


# 🙏 Acknowledgments
Firebase for backend services

Chart.js for data visualization

Font Awesome for icons

Modern CSS techniques and design patterns

# 📞 Support
If you have any questions or need help with setup, please open an issue on GitHub.

Built with ❤️ for better habit formation and personal growth

