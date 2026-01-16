# CLAUDE.md - Backend

## Project Guidelines

### Package Manager
**Always use `bun`** - Never use npm, yarn, or pnpm for this project.

- Install dependencies: `bun install`
- Add packages: `bun add <package>`
- Dev server (with watch): `bun run dev`
- Start server: `bun run start`

### Tech Stack
- Fastify 5
- TypeScript
- Bun runtime

### Server
- Runs on port **3001**
- CORS enabled for frontend communication

### Project Structure
```
backend/
├── src/
│   └── index.ts    # Main entry point
├── package.json
└── bun.lock
```

### Environment
- Bun automatically loads `.env` files - no dotenv needed
