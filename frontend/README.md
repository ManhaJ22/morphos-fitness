dhruv#4

# MotionMind: AI-Powered Fitness App

MotionMind is a revolutionary fitness web application that uses computer vision to track user movements and provide real-time feedback on exercise form. The app also features emotion detection to suggest personalized music that matches the user's mood during workouts.

## 🚀 Features

- **Live Pose Estimation**: Track user movements in real-time with visual feedback
- **Emotion Detection**: Analyze facial expressions to determine user's emotional state
- **Personalized Music**: Automatically suggest music via Spotify API based on detected emotions
- **Form Correction**: Provide real-time guidance on proper exercise form
- **Exercise Analytics**: Track reps, sets, and progress over time

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Node.js/Python (for computer vision processing)
- **Computer Vision**: TensorFlow.js, MediaPipe
- **State Management**: Redux
- **Music Integration**: Spotify API

## 📋 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Spotify Developer account (for music recommendation features)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/motionmind.git
cd motionmind
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory and add your API keys:

```
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
# Add any other required environment variables
```

4. Start the development server:

```bash
npm run dev
# or
yarn dev
```

5. Open your browser and navigate to `http://localhost:3000`
