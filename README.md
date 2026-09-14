# 🎮 Multiplayer Quiz

A real-time multiplayer quiz application built with **React + TypeScript** on the frontend and **Node.js + Express + WebSockets** on the backend. Users can create or join quiz rooms, add questions, play quizzes together, and view live scores.

## ✨ Features

- 🔐 User sign-up and sign-in
- 🏠 Create and join multiplayer quiz rooms
- 🔄 Switch between rooms you have joined
- 👥 Real-time player/lobby updates
- 📝 Room hosts can create multiple-choice questions
- ▶️ Hosts can start quizzes for everyone in the room
- ⚡ Real-time communication using WebSockets
- 🏆 Live leaderboard and scoring
- 🔑 Password hashing with bcrypt
- 🎟️ JWT-based authentication
- 🗄️ MongoDB database through Prisma
- 🚀 Redis for room state, player presence, and pub/sub events
- 🎨 React UI styled with Tailwind CSS

## 🛠️ Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS

### Backend
- Node.js
- TypeScript
- Express
- WebSocket (`ws`)
- Redis
- Prisma ORM
- MongoDB
- JWT
- bcrypt

## 📁 Project Structure

```text
Mulltiplayer-Quizz/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   └── dataRoutes.ts
│   │   ├── index.ts
│   │   ├── prisma.ts
│   │   └── redis.ts
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── App.tsx
    │   ├── homepage.tsx
    │   ├── signin.tsx
    │   ├── signup.tsx
    │   ├── logout.tsx
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

## ⚙️ Prerequisites

Install the following before running the project:

- Node.js 18+ recommended
- npm
- MongoDB database
- Redis instance

You can use hosted MongoDB and Redis services or run them locally.

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd Mulltiplayer-Quizz
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure backend environment variables

Create `backend/.env`:

```env
DATABASE_URL="your-mongodb-connection-string"
REDIS_URL="your-redis-connection-string"
SECRET_KEY="your-long-random-secret"
```

Do **not** commit `.env` or any credentials to Git.

### 4. Generate Prisma Client

From the `backend` directory:

```bash
npx prisma generate
```

If you are initializing the database/schema for the first time, use the appropriate Prisma command for your MongoDB setup. For example:

```bash
npx prisma db push
```

### 5. Start the backend

```bash
npm run dev
```

The backend starts on:

```text
http://localhost:3000
```

The WebSocket server is available through the same server at:

```text
ws://localhost:3000
```

### 6. Install frontend dependencies

Open another terminal:

```bash
cd frontend
npm install
```

### 7. Start the frontend

```bash
npm run dev
```

Vite normally serves the application at:

```text
http://localhost:5173
```

Open that address in your browser.

## 🎯 How to Use

1. Open the application.
2. Create an account using **Sign Up**.
3. Sign in.
4. Enter your username on the multiplayer lobby.
5. Create a room to become its host, or enter an existing room ID to join one.
6. The host can add multiple-choice questions.
7. The host starts the quiz.
8. Players answer each question.
9. Correct answers award points.
10. The leaderboard displays the scores for the active room.

## 🧠 Architecture Overview

```text
                ┌──────────────────────┐
                │       React UI       │
                │  Vite + TypeScript   │
                └──────────┬───────────┘
                           │
                 HTTP + WebSocket
                           │
                ┌──────────▼───────────┐
                │  Express + WebSocket │
                │       Backend        │
                └───────┬───────┬──────┘
                        │       │
                 Prisma│       │Redis
                        │       │
                ┌───────▼──┐ ┌─▼────────┐
                │ MongoDB  │ │  Redis   │
                │  Users   │ │ Rooms /  │
                │  Scores  │ │ Pub/Sub  │
                └──────────┘ └──────────┘
```

### Authentication

The backend provides `/signup` and `/signin` endpoints. Passwords are hashed with bcrypt. Successful sign-in returns a JWT token that the frontend stores in local storage.

### Real-time Multiplayer

The backend creates a WebSocket server on the same HTTP server. Redis stores room/player state and provides pub/sub events so room updates, game starts, room deletion, and leaderboard updates can be broadcast in real time.

### Database

Prisma is configured to use MongoDB. The current schema contains:

- `users` — stores usernames and hashed passwords.
- `scores` — stores score records associated with users and rooms.

## 📜 Available Scripts

### Backend

```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript
```

### Frontend

```bash
npm run dev      # Start Vite development server
npm run build    # Type-check and build production bundle
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## 🔒 Environment & Security

Never commit secrets such as:

- MongoDB connection strings
- Redis credentials
- JWT secret keys
- `.env` files
- API keys

For production deployment, also update the frontend/backend URLs and CORS configuration instead of relying on the current localhost values.

## 🚧 Current Limitations

This project is primarily configured for local development. In particular, some frontend/backend connection URLs currently point to `localhost`, so production deployment requires replacing them with the deployed API/WebSocket URLs and configuring CORS accordingly.

## 📌 Future Improvements

- Add authenticated WebSocket connections
- Persist quiz questions in the database
- Persist and retrieve complete game history
- Add private/password-protected rooms
- Add quiz categories and difficulty levels
- Add timers for questions
- Add improved anti-cheat/server-authoritative scoring
- Add production environment configuration
- Add automated tests
- Add Docker support

## 📄 License

This project currently does not specify a dedicated open-source license. Add a license file if you plan to distribute the project publicly.
