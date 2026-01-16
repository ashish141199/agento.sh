# CLAUDE.md - Project Root

## Package Manager
**Always use `bun`** - Never use npm, yarn, or pnpm for this project.

## Project Structure
```
agento.sh/
├── frontend/       # Next.js 16 app (port 3000)
├── backend/        # Fastify 5 server (port 8000)
└── CLAUDE.md
```

## Running the Project

### Frontend (Next.js)
```bash
cd frontend && bun run dev
```
Runs on http://localhost:3000

### Backend (Fastify)
```bash
cd backend && bun run dev
```
Runs on http://localhost:8000
