# NOCO Performance Fitness Tracker

A web application for tracking fitness activities and progress, built with React, TypeScript, and Firebase.

## Features

- User authentication (signup, login, logout)
- Activity tracking with multiple activity types
- Progress visualization with interactive graphs
- Data normalization for comparing different activities
- Admin panel for managing activities and user data
- Responsive design for mobile and desktop

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your Firebase configuration:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_ADMIN_PASSWORD=your_admin_password
   ```

## Development

Start the development server:
```bash
npm start
```

## Deployment

1. Build the project:
   ```bash
   npm run build
   ```
2. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

## Firebase Configuration

1. Set up Firebase Authentication with email/password
2. Configure Firestore security rules
3. Deploy Firebase Functions for admin functionality
4. Set up Firebase Hosting

## License

MIT License - see LICENSE file for details
