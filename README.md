# Performance Tracker

A web application for tracking performance and progress in various activities with comprehensive user management and administrative features.

## Features

### User Management
- **User Registration**: Register new users with first name, last name, gender, birthdate, and tags
- **User Search & Selection**: Search and select users with multi-select support (Ctrl/Cmd+click, Shift+click)
- **User Tags**: Organize users with tags for grouping and filtering
- **User Profiles**: View and edit user information including gender, birthdate, and tags

### Activity Tracking
- **Multiple Activity Types**: Track various activities (configurable via admin panel):
  - Push-ups
  - Pull-ups
  - Squats
  - Running (km)
  - Plank (seconds)
  - Deadlift (lbs)
  - Bench Press (lbs)
  - And more (customizable)
- **Activity History**: View all activity records with sorting and filtering
- **Progress Visualization**: Interactive graphs showing progress over time
- **Activity Leaderboard**: Compare performance across users

### Admin Panel
- **Activity Management**: Add, edit, and remove activity types
- **User Management**: 
  - View all users with their information
  - Edit user details (name, gender, birthdate)
  - Delete users (with confirmation)
  - Manage user tags individually or in bulk
- **Tag Management**:
  - View all tags with user count
  - Create new tags
  - Rename tags (updates all users with that tag)
  - Delete tags (removes from all users)
  - Bulk assign tags to multiple users
- **Activity History Management**: Edit and delete activity records
- **Activity Leaderboard**: View top performers

### Data Management
- **Bulk User Upload**: Upload users from YAML files
- **CSV to YAML Conversion**: Convert CSV files to YAML format for bulk upload
- **Database Migration Scripts**: Tools for migrating data structures

## Tech Stack

- **Frontend**: React 19, TypeScript
- **UI Framework**: Material-UI (MUI) v5
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **Build Tool**: Vite
- **Charts**: Chart.js, Recharts
- **Styling**: Emotion (CSS-in-JS), Styled Components

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase project with Firestore enabled
- Firebase service account key (for scripts)

### Installation

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
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   VITE_ADMIN_PASSWORD=your_admin_password
   ```

4. Add Firebase service account key:
   - Place `serviceAccountKey.json` in the project root (for scripts)
   - This file should be in `.gitignore` and never committed

5. Start the development server:
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

## Project Structure

```
fitness-tracker/
├── src/
│   ├── components/          # React components
│   │   ├── ActivityTracker.tsx
│   │   ├── ActivityGraph.tsx
│   │   ├── ActivityLeaderboard.tsx
│   │   ├── AdminPanel.tsx
│   │   ├── UserList.tsx
│   │   └── ...
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx
│   │   └── UserContext.tsx
│   ├── constants/           # Constants and configurations
│   │   └── analytics.ts
│   ├── styles/              # Styled components and theme
│   ├── types/               # TypeScript type definitions
│   ├── firebase.ts          # Firebase configuration
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── scripts/                 # Utility scripts
│   ├── migrate-to-firstname-lastname.js
│   ├── csv-to-yaml.js
│   ├── upload-users.js
│   └── README.md
├── data/                    # Data files for bulk operations
│   ├── users.example.yaml
│   └── README.md
├── public/                  # Static assets
├── firebase.json            # Firebase configuration
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Firestore indexes
└── package.json
```

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npx tsc --noEmit` - Run TypeScript type checking

### Database Scripts
- `npm run migrate:name-to-firstname-lastname` - Migrate database from single name field to firstName/lastName
- `npm run convert:csv-to-yaml <csv-file> [output-file]` - Convert CSV to YAML format
- `npm run upload:users <yaml-file>` - Upload users from YAML file to Firebase

See `scripts/README.md` for detailed documentation on database scripts.

## Building for Production

1. Build the application:
   ```bash
   npm run build
   ```

   This creates an optimized production build in the `dist/` directory.

2. Preview the production build locally (optional):
   ```bash
   npm run preview
   ```

## Deployment

### Prerequisites
- Firebase CLI installed (`npm install -g firebase-tools`)
- Logged in to Firebase (`firebase login`)
- Firebase project initialized (`firebase init`)

### Deploy to Firebase

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy hosting and Firestore:
   ```bash
   firebase deploy --only "hosting,firestore"
   ```

   Or deploy everything:
   ```bash
   firebase deploy
   ```

3. Your application will be available at:
   - Hosting URL: `https://[your-project-id].web.app`
   - Custom domain (if configured)

### Deployment Notes

- **Hosting**: The `dist/` directory is deployed to Firebase Hosting
- **Firestore Rules**: Security rules are deployed from `firestore.rules`
- **Firestore Indexes**: Indexes are deployed from `firestore.indexes.json`
- **Functions**: Cloud Functions can be deployed separately if needed

## Data Management

### Bulk User Upload

1. Prepare your user data in YAML format (see `data/users.example.yaml`)

2. Upload users:
   ```bash
   npm run upload:users data/users.yaml
   ```

### CSV to YAML Conversion

1. Convert CSV file to YAML:
   ```bash
   npm run convert:csv-to-yaml data/noco_users.csv data/users.yaml
   ```

2. Then upload the YAML file as above

### Database Migration

If migrating from an older version with a single `name` field:

```bash
npm run migrate:name-to-firstname-lastname
```

**Note**: This is a one-time migration script. See `scripts/README.md` for details.

## User Data Structure

Users are stored in Firestore with the following structure:

```typescript
{
  firstName: string;        // Required
  lastName: string;         // Optional
  gender?: string;          // "Male", "Female", "Non-Binary"
  birthdate?: string;       // Format: MM/DD/YYYY
  tags?: string[];          // Array of tag strings
  createdAt: string;        // ISO timestamp
}
```

## Security

- **Authentication**: Firebase Authentication for user login
- **Admin Access**: Password-protected admin panel
- **Firestore Rules**: Security rules control data access
- **Service Account**: Required for server-side scripts (never commit to git)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
