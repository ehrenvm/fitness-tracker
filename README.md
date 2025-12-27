# Performance Tracker

A web application for tracking performance and progress in various activities.

## Features

- User registration and authentication
- Track multiple types of activities:
  - Push-ups
  - Pull-ups
  - Squats
  - Running (km)
  - Plank (seconds)
  - Deadlift (lbs)
  - Bench Press (lbs)
- Activity history with sorting and filtering
- Progress visualization with interactive graphs
- Admin panel for managing activities
- Activity leaderboard
- Responsive design

## Tech Stack

- React 18
- TypeScript
- Material-UI (MUI)
- Firebase (Firestore)
- Vite
- Chart.js
- Styled Components

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/ehrenvm/fitness-tracker.git
   cd fitness-tracker
   ```

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

4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

- `/src` - Source code
  - `/components` - React components
  - `/styles` - Styled components and theme
  - `/assets` - Images and static assets
  - `/types` - TypeScript type definitions
  - `firebase.ts` - Firebase configuration
  - `App.tsx` - Main application component
  - `main.tsx` - Application entry point

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
