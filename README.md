# Creature Nexus TCG

[![Netlify Status](https://api.netlify.com/api/v1/badges/7f369d2a-ba9a-46d9-982a-7b74f39c05b8/deploy-status)](https://app.netlify.com/projects/creature-nexus/deploys)

A digital trading card game featuring mythical creatures built with Expo and React Native.

## Features

- Anonymous authentication with Firebase
- Card pack opening system with cooldown timer
- Different card rarities with unique visual effects
- Collection management with filtering capabilities
- Responsive design for both mobile and web platforms

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Firebase project with Authentication and Firestore enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/creature-nexus-tcg.git
cd creature-nexus-tcg
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Firebase configuration:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. Start the development server:
```bash
npm run dev
```

## Deployment

To deploy the web version of the app:

1. Build the web version:
```bash
npm run build:web
```

2. Deploy to Firebase Hosting:
```bash
npm run deploy
```

## Project Structure

- `app/` - Contains all the screens and navigation setup using Expo Router
- `components/` - Reusable React components
- `config/` - Firebase configuration
- `context/` - React Context for global state management
- `models/` - TypeScript interfaces and type definitions
- `utils/` - Utility functions
- `constants/` - App constants like colors, themes, etc.

## Firebase Setup

1. Create a new Firebase project in the Firebase console
2. Enable Anonymous Authentication
3. Create a Firestore database
4. Set up Firestore security rules to protect user data
5. Add your web app to the Firebase project to get configuration details

## License

This project is licensed under the MIT License - see the LICENSE file for details.