## Chess Dojo AI (NestJS + React)

This project is a **client–server application** for training in the Chess Dojo against an engine with AI explanations, similar in spirit to the experience on [`senseichess.com`](https://senseichess.com/).

### High-Level Features

- **Backend (NestJS + TypeScript)**
  - User registration/login with JWT authentication (in-memory store for now).
  - Chess practice sessions starting from any **FEN position**.
  - Play vs. a chess engine (Stockfish suggested; implemented via a UCI integration stub you can wire to a local binary).
  - AI explanation service stub that can call any LLM API (e.g. OpenAI) to explain the engine’s recommended move.
  - Ability to:
    - Set an initial position.
    - Play from that position vs. the engine.
    - Reset to the original position.
    - Switch sides and restart from the original position.

- **Frontend (React + TypeScript + Vite)**
  - Layout inspired by the Sensei Chess landing page: central board, side panel with move list and explanations, top bar for branding and auth.
  - Login/register UI.
  - Practice screen with:
    - Interactive chessboard.
    - Move list.
    - AI explanation panel.
    - Controls for resetting and switching sides.

### Structure

- `backend/` – Nest-like backend (without Nest CLI) with:
  - `src/app.module.ts`
  - `src/main.ts`
  - `src/auth/*`
  - `src/users/*`
  - `src/chess/*`
- `frontend/` – React + Vite app:
  - `src/main.tsx`
  - `src/App.tsx`
  - `src/components/*`

### Getting Started

#### Backend

```bash
cd backend
npm install
npm run start:dev
```

Default URL: `http://localhost:3001`

Environment variables (create `.env` in `backend/`):

```bash
JWT_SECRET=your_dev_secret
AI_API_KEY=your_ai_key_optional
STOCKFISH_PATH=/usr/local/bin/stockfish  # optional, for real engine integration
PORT=3001
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Default URL: `http://localhost:5173`

Frontend uses `VITE_API_BASE_URL` (in `frontend/.env`) to talk to the backend:

```bash
VITE_API_BASE_URL=http://localhost:3001
```

### Notes

- The chess engine and AI explanation are implemented as **stubs** that you can connect to:
  - A real Stockfish binary via UCI.
  - A real AI provider (e.g. OpenAI, OpenRouter, etc.).
- User persistence is in-memory to keep the example simple; you can replace it with a real DB (e.g. Postgres + Prisma or TypeORM).


